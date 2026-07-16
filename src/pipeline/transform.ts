import type { Logger } from '../lib/logger.ts';
import type { Result } from '../lib/result.ts';
import { ok, err } from '../lib/result.ts';
import type { VtexNamedEntry } from '../schemas/vtex-product.ts';
import type { ExtractedSku } from './extract.ts';

export type EanNormalizeError =
  | { kind: 'empty' }
  | { kind: 'non_digit'; raw: string }
  | { kind: 'out_of_range'; normalized: string; length: number };

/**
 * Normaliza un EAN/GTIN a su forma canónica strippeando ceros a la izquierda.
 *
 * Un mismo producto físico (GTIN) puede reportarse como EAN-13, UPC-A (12) o
 * GTIN-14 pad-eado con ceros: `07796962999850` y `7796962999850` son el mismo
 * producto, pero un JOIN por string los ve distintos. Canonizamos a "sin ceros
 * a la izquierda" (verificado: Masonline ya viene en 13 dígitos limpios, así
 * evitamos re-escribir su catálogo). Ver punto 9 de descubrimientos en CLAUDE.md.
 *
 * Rechaza: vacío, no-dígitos, y longitud canónica fuera de [8, 14] (basura).
 */
export function normalizeEan(raw: string): Result<string, EanNormalizeError> {
  const cleaned = raw.trim();
  if (cleaned === '') return err({ kind: 'empty' });
  if (!/^\d+$/.test(cleaned)) return err({ kind: 'non_digit', raw: cleaned });
  // BigInt strippea ceros a la izquierda sin perder precisión (los EAN de 14
  // dígitos exceden Number.MAX_SAFE_INTEGER).
  const normalized = BigInt(cleaned).toString();
  if (normalized.length < 8 || normalized.length > 14) {
    return err({ kind: 'out_of_range', normalized, length: normalized.length });
  }
  return ok(normalized);
}

export type BadEanReason = 'non_numeric' | 'wrong_length' | 'other';

/** Clasifica la causa de un EAN rechazado (para observabilidad del reporte). */
export function classifyBadEan(error: EanNormalizeError): BadEanReason {
  switch (error.kind) {
    case 'non_digit':
      return 'non_numeric';
    case 'out_of_range':
      return 'wrong_length';
    // 'empty' no debería llegar acá (extract ya lo captura como no_ean).
    default:
      return 'other';
  }
}

/** Clave con la que VTEX serializa `Name` cuando expone los backing fields de C#. */
const BACKING_FIELD_NAME = '<Name>k__BackingField';

/**
 * Nombre de un entry de VTEX, venga como `Name` o como `<Name>k__BackingField`.
 *
 * VTEX serializa `Teasers` y `DiscountHighLight` con los backing fields de C# y
 * `PromotionTeasers` con claves limpias, sin contrato que lo garantice. Leer solo
 * `Name` es lo que dejó promo_description en NULL en las 47.358 filas de la tabla.
 * `Name` tiene prioridad por ser la forma documentada; el backing field es fallback.
 */
export function vtexEntryName(entry: VtexNamedEntry): string | null {
  return entry.Name?.trim() || entry[BACKING_FIELD_NAME]?.trim() || null;
}

/**
 * Une los nombres de una o más listas de entries de VTEX en un string estable.
 * Alimenta tanto `promo_description` (Teasers + PromotionTeasers) como
 * `discount_highlight` (DiscountHighLight).
 *
 * Deduplica y ORDENA antes de unir, y las dos cosas son necesarias:
 *  - sort: VTEX devuelve los teasers en orden inestable entre requests. Sin él,
 *    la misma promo genera strings distintos -> falsos `changed` que ensucian
 *    price_history con vigencias artificiales.
 *  - dedupe: Teasers y PromotionTeasers son la misma promo serializada dos veces
 *    (verificado: nombres idénticos en 11/11 ofertas del dump). Unirlas sin
 *    deduplicar daría "Tarjeta Carrefour 15%; Tarjeta Carrefour 15%".
 */
export function joinVtexNames(
  ...sources: ReadonlyArray<ReadonlyArray<VtexNamedEntry> | null | undefined>
): string | null {
  const names = new Set<string>();
  for (const source of sources) {
    for (const entry of source ?? []) {
      const name = vtexEntryName(entry);
      if (name) names.add(name);
    }
  }
  if (names.size === 0) return null;
  return [...names].sort().join('; ');
}

/**
 * `has_promo` = hay un descuento REAL en el precio efectivo.
 *
 * Definición deliberada: `list_price > price`. La anterior era `Teasers.length > 0`,
 * que significaba casi lo contrario — un teaser es un descuento de checkout que NO
 * está aplicado a `price` (típicamente "Tarjeta Carrefour 15%"). Eso daba 12.450
 * filas de Carrefour con has_promo = true y cero descuento, y 0 filas en Masonline
 * (que no publica teasers) pese a tener 2.518 productos con descuento real.
 * Ver research/precios-descuento/HALLAZGOS.md → P4.
 *
 * Es función pura de price/list_price, así que vale igual en la ruta de arrastre
 * de load.ts: toda fila de price_history cumple has_promo === (list_price > price).
 */
export function computeHasPromo(price: number, listPrice: number | null): boolean {
  return listPrice !== null && listPrice > price;
}

/**
 * Normalización CONSERVADORA de marca: solo whitespace y puntuación de borde.
 * A propósito NO strippea acentos (Genérico ≠ Generico queda visible en
 * telemetría) ni hace lowercase (iPhone ≠ Iphone). El objetivo es limpiar ruido
 * de formato, no fusionar marcas — eso se decide con evidencia, no a ciegas.
 */
export function normalizeBrand(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim();
}

/** Normaliza campos de texto. brand vacío -> null. */
export function normalizeSku(row: ExtractedSku): ExtractedSku {
  const brand = row.brand?.trim();
  return {
    ...row,
    brand: brand ? brand : null,
    retailerName: row.retailerName.trim(),
  };
}

/**
 * Tie-break de dedup EAN (mayor a menor prioridad):
 *  1. isAvailable: true gana
 *  2. hasValidPrice (price > 0) gana
 *  3. empate en (1) y (2): menor price gana
 */
function pickBetter(a: ExtractedSku, b: ExtractedSku): ExtractedSku {
  if (a.isAvailable !== b.isAvailable) return a.isAvailable ? a : b;
  const aValid = a.price > 0;
  const bValid = b.price > 0;
  if (aValid !== bValid) return aValid ? a : b;
  if (a.price !== b.price) return a.price < b.price ? a : b;
  return a; // empate total -> se queda el primero
}

/**
 * Colapsa SKUs por EAN dentro de la misma cadena (run-global). Imprescindible
 * antes de armar los lotes: dos SKUs con el mismo EAN en un mismo upsert rompen
 * con "ON CONFLICT ... cannot affect row a second time".
 */
export class EanDeduper {
  private readonly map = new Map<string, ExtractedSku>();
  private duplicates = 0;

  constructor(private readonly log: Logger) {}

  add(row: ExtractedSku): void {
    const prev = this.map.get(row.ean);
    if (!prev) {
      this.map.set(row.ean, row);
      return;
    }
    this.duplicates += 1;
    const winner = pickBetter(prev, row);
    const loser = winner === prev ? row : prev;
    this.log.warn(
      {
        ean: row.ean,
        winner: { sku: winner.skuId, price: winner.price },
        loser: { sku: loser.skuId, price: loser.price },
        reason: 'duplicate_ean_within_retailer',
      },
      'multiple SKUs with same EAN, kept cheapest available',
    );
    this.map.set(row.ean, winner);
  }

  values(): ExtractedSku[] {
    return [...this.map.values()];
  }

  get size(): number {
    return this.map.size;
  }

  get duplicateCount(): number {
    return this.duplicates;
  }
}
