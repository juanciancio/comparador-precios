import type { Logger } from '../lib/logger.ts';
import type { ExtractedSku } from './extract.ts';

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
