import type { Logger } from '../lib/logger.ts';
import type { Result } from '../lib/result.ts';
import { ok, err } from '../lib/result.ts';
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
