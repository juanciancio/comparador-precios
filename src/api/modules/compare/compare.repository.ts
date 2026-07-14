import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import {
  diffBucketIndex,
  DIFF_BUCKET_COUNT,
  DIFF_TIE_TOLERANCE_PCT,
} from '../../../lib/diff-buckets.ts';
import type { CompareRow, CompareStats } from './dto/compare.dto.ts';

export interface CompareFilters {
  limit: number;
  offset: number;
  brand?: string | undefined;
  category?: string | undefined;
  minDiffPct?: number | undefined;
  sortBy: 'diff' | 'name';
  sortDir: 'asc' | 'desc';
}

// Etiquetas del histograma para la respuesta JSON (contrato de la API). El orden
// matchea los buckets de diff-buckets.ts; las fronteras viven ahí, no acá.
const STATS_BUCKET_LABELS = ['<5%', '5-10%', '10-25%', '25-50%', '>=50%'] as const;

interface RawCompareRow {
  ean: string;
  name: string;
  brand: string | null;
  masonline_price: string;
  carrefour_price: string;
  diff_pct: string;
}

function cheaperOf(diffPct: number): CompareRow['cheaper'] {
  if (Math.abs(diffPct) <= DIFF_TIE_TOLERANCE_PCT) return 'tie';
  // diff_pct = (carrefour - masonline)/masonline*100; positivo => carrefour más caro.
  return diffPct > 0 ? 'masonline' : 'carrefour';
}

@Injectable()
export class CompareRepository {
  constructor(@InjectPg() private readonly sql: Db) {}

  async compare(f: CompareFilters): Promise<{ data: CompareRow[]; total: number }> {
    const sql = this.sql;
    const brandFilter = f.brand ? sql`AND p.brand = ${f.brand}` : sql``;
    const categoryFilter = f.category
      ? sql`AND p.category_path ILIKE ${'%' + f.category + '%'}`
      : sql``;
    const minDiffFilter =
      f.minDiffPct !== undefined
        ? sql`AND ABS((c.price - m.price) / m.price * 100) >= ${f.minDiffPct}`
        : sql``;

    // FROM + WHERE compartido entre rows y count. Excluye "Genérico" (catchall no
    // comparable cross-retailer) y precios <= 0. Ver reporte cross-retailer.
    const fromWhere = sql`
      FROM products p
      JOIN price_history m
        ON m.ean = p.ean
        AND m.retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
        AND m.valid_to IS NULL AND m.is_available
      JOIN price_history c
        ON c.ean = p.ean
        AND c.retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
        AND c.valid_to IS NULL AND c.is_available
      WHERE m.price > 0
        AND (p.brand IS NULL OR p.brand NOT IN ('Genérico', 'Generico'))
        ${brandFilter} ${categoryFilter} ${minDiffFilter}
    `;

    const orderExpr =
      f.sortBy === 'name'
        ? sql`p.name_canonical`
        : sql`ABS((c.price - m.price) / m.price)`;
    const orderDir = f.sortDir === 'asc' ? sql`ASC` : sql`DESC`;

    const rows = await sql<RawCompareRow[]>`
      SELECT
        p.ean, p.name_canonical AS name, p.brand,
        m.price::text AS masonline_price,
        c.price::text AS carrefour_price,
        ROUND(((c.price - m.price) / m.price * 100)::numeric, 2)::text AS diff_pct
      ${fromWhere}
      ORDER BY ${orderExpr} ${orderDir} NULLS LAST, p.ean ASC
      LIMIT ${f.limit} OFFSET ${f.offset}
    `;

    const totalRows = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total ${fromWhere}
    `;

    const data = rows.map((r) => {
      const diffPct = Number(r.diff_pct);
      return {
        ean: r.ean,
        name: r.name,
        brand: r.brand,
        masonline_price: Number(r.masonline_price),
        carrefour_price: Number(r.carrefour_price),
        diff_pct: diffPct,
        cheaper: cheaperOf(diffPct),
      };
    });

    return { data, total: totalRows[0]!.total };
  }

  /**
   * Stats globales del match cross-retailer (sin filtros). Replica el reporte en
   * JSON: fetchea los diff REDONDEADOS a 2 decimales y bucketea en JS con el mismo
   * `diffBucketIndex` que usa el reporte batch — fuente única de fronteras.
   */
  async stats(): Promise<CompareStats> {
    const sql = this.sql;

    const diffRows = await sql<{ diff: string }[]>`
      SELECT ROUND(((c.price - m.price) / m.price * 100)::numeric, 2)::text AS diff
      FROM products p
      JOIN price_history m
        ON m.ean = p.ean
        AND m.retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
        AND m.valid_to IS NULL AND m.is_available
      JOIN price_history c
        ON c.ean = p.ean
        AND c.retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
        AND c.valid_to IS NULL AND c.is_available
      WHERE m.price > 0
        AND (p.brand IS NULL OR p.brand NOT IN ('Genérico', 'Generico'))
    `;

    const total = diffRows.length;
    const bucketCounts = new Array<number>(DIFF_BUCKET_COUNT).fill(0);
    let masCheaper = 0;
    let carCheaper = 0;
    let tie = 0;
    for (const r of diffRows) {
      const d = Number(r.diff);
      bucketCounts[diffBucketIndex(Math.abs(d))]! += 1;
      if (Math.abs(d) <= DIFF_TIE_TOLERANCE_PCT) tie += 1;
      else if (d > 0) masCheaper += 1; // carrefour más caro => masonline más barato
      else carCheaper += 1;
    }

    const exRows = await sql<{ masonline_only: number; carrefour_only: number }[]>`
      WITH m AS (
        SELECT ean FROM price_history
        WHERE retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
          AND valid_to IS NULL AND is_available
      ),
      c AS (
        SELECT ean FROM price_history
        WHERE retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
          AND valid_to IS NULL AND is_available
      )
      SELECT
        (SELECT COUNT(*) FROM m WHERE ean NOT IN (SELECT ean FROM c))::int AS masonline_only,
        (SELECT COUNT(*) FROM c WHERE ean NOT IN (SELECT ean FROM m))::int AS carrefour_only
    `;
    const ex = exRows[0]!;

    const pct = (n: number): number => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

    return {
      total_matched: total,
      diff_histogram: STATS_BUCKET_LABELS.map((bucket, i) => {
        const count = bucketCounts[i]!;
        return { bucket, count, pct: pct(count) };
      }),
      cheaper: {
        masonline: { count: masCheaper, pct: pct(masCheaper) },
        carrefour: { count: carCheaper, pct: pct(carCheaper) },
        tie: { count: tie, pct: pct(tie) },
      },
      exclusives: {
        masonline_only: ex.masonline_only,
        carrefour_only: ex.carrefour_only,
      },
    };
  }
}
