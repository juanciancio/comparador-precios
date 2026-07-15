import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import type { Product, PriceHistoryEntry, RetailerOffer } from './dto/products.dto.ts';

export interface RetailerInfo {
  id: number;
  slug: string;
  name: string;
}

export interface ListFilters {
  limit: number;
  offset: number;
  /** Marcas exactas; matchea cualquiera de ellas (OR). Vacío = sin filtro. */
  brand?: string[] | undefined;
  /** Departamentos top-level exactos; matchea cualquiera (OR). Vacío = sin filtro. */
  categoryTop?: string[] | undefined;
  /** @deprecated Substring sobre el path completo; usar categoryTop. */
  category?: string | undefined;
  onlyMatched: boolean;
  sortBy: 'name' | 'brand' | 'first_seen' | 'last_seen';
  sortDir: 'asc' | 'desc';
  /** Términos de búsqueda; cada uno debe matchear (AND) name o brand. Usado por /search. */
  terms?: string[] | undefined;
}

export interface RecentChangesFilters {
  limit: number;
  hours: number;
  minDiffPct?: number | undefined;
  /** Techo de precio vigente en cualquier cadena. Env RECENT_CHANGES_MAX_PRICE. */
  maxPrice: number;
  /** Techo de |diff_pct| cross-retailer. Env RECENT_CHANGES_MAX_DIFF_PCT. */
  maxDiffPct: number;
}

export interface PriceHistoryFilters {
  retailer?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface RetailerProductRef {
  retailerId: number;
  slug: string;
  lastSeenAt: Date;
}

/** Fila cruda de products + su array de ofertas vigentes (jsonb). */
interface RawProductRow {
  ean: string;
  name_canonical: string;
  brand: string | null;
  category_path: string | null;
  image_url: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  retailers: RetailerOffer[];
}

interface RawPriceHistoryRow {
  retailer: string;
  retailer_name: string;
  valid_from: string;
  valid_to: string | null;
  price: string;
  list_price: string | null;
  has_promo: boolean;
  promo_description: string | null;
  is_available: boolean;
}

function toProduct(row: RawProductRow): Product {
  const retailers = row.retailers;
  return {
    ean: row.ean,
    name: row.name_canonical,
    brand: row.brand,
    categoryPath: row.category_path,
    imageUrl: row.image_url,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    // "matcheado" = comparable: precio vigente y disponible en >=2 cadenas.
    matched: retailers.filter((r) => r.isAvailable).length >= 2,
    retailers,
  };
}

@Injectable()
export class ProductsRepository {
  private retailerCache: RetailerInfo[] | undefined;

  constructor(@InjectPg() private readonly sql: Db) {}

  /** Seed estático (retailers): se cachea en memoria tras la primera lectura. */
  async retailers(): Promise<RetailerInfo[]> {
    if (!this.retailerCache) {
      this.retailerCache = await this.sql<RetailerInfo[]>`
        SELECT id, slug, name FROM retailers ORDER BY id
      `;
    }
    return this.retailerCache;
  }

  async listProducts(f: ListFilters): Promise<{ data: Product[]; total: number }> {
    const sql = this.sql;
    // .length, no truthiness: [] es truthy y filtraría por ninguna marca.
    const brandFilter = f.brand?.length ? sql`AND p.brand = ANY(${f.brand})` : sql``;
    // Match exacto contra el primer segmento del path: category_path arranca con
    // '/', así que split_part(..., '/', 1) es '' y el departamento es el 2.
    const categoryTopFilter = f.categoryTop?.length
      ? sql`AND split_part(p.category_path, '/', 2) = ANY(${f.categoryTop})`
      : sql``;
    const categoryFilter = f.category
      ? sql`AND p.category_path ILIKE ${'%' + f.category + '%'}`
      : sql``;
    const matchedFilter = f.onlyMatched
      ? sql`AND (
          SELECT COUNT(*) FROM price_history ph
          WHERE ph.ean = p.ean AND ph.valid_to IS NULL AND ph.is_available
        ) >= 2`
      : sql``;
    // Cada término debe matchear name o brand (AND entre términos, OR entre columnas).
    const searchFilter = (f.terms ?? []).reduce(
      (acc, term) =>
        sql`${acc} AND (p.name_canonical ILIKE ${'%' + term + '%'} OR p.brand ILIKE ${'%' + term + '%'})`,
      sql``,
    );

    const orderCol = {
      name: sql`p.name_canonical`,
      brand: sql`p.brand`,
      first_seen: sql`p.first_seen_at`,
      last_seen: sql`p.last_seen_at`,
    }[f.sortBy];
    const orderDir = f.sortDir === 'desc' ? sql`DESC` : sql`ASC`;

    const rows = await sql<RawProductRow[]>`
      SELECT
        p.ean, p.name_canonical, p.brand, p.category_path, p.image_url,
        p.first_seen_at, p.last_seen_at,
        ${this.retailerOffersSubquery()} AS retailers
      FROM products p
      WHERE TRUE ${brandFilter} ${categoryTopFilter} ${categoryFilter} ${matchedFilter} ${searchFilter}
      ORDER BY ${orderCol} ${orderDir} NULLS LAST, p.ean ASC
      LIMIT ${f.limit} OFFSET ${f.offset}
    `;

    const totalRows = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM products p
      WHERE TRUE ${brandFilter} ${categoryTopFilter} ${categoryFilter} ${matchedFilter} ${searchFilter}
    `;

    return { data: rows.map(toProduct), total: totalRows[0]!.total };
  }

  /**
   * Productos cuyo precio vigente empezó a regir dentro de la ventana, ordenados
   * por magnitud del cambio contra el precio inmediatamente anterior.
   *
   * La ventana se mide sobre `first_seen_at` (timestamptz = instante en que la
   * fila entró a nuestra observación) y NO sobre `valid_from`, que es DATE: con
   * `valid_from` el parámetro `hours` no tendría resolución horaria y `hours=24`
   * vs `hours=48` dependerían de la hora del día. Ver CLAUDE.md → "Reglas de
   * recent-changes".
   *
   * El driver es `prev` (filas ya cerradas, ~12% de la tabla) en vez de las filas
   * vigentes: exigir un precio anterior es justamente lo que separa "cambió de
   * precio" de "se vio por primera vez", y arrancar por el lado chico evita un
   * LATERAL por cada fila vigente del catálogo (medido: 1785ms -> 135ms, mismo
   * result set). El LATERAL toma el sucesor inmediato de `prev`; pedirle
   * `valid_to IS NULL` garantiza que `prev` es el predecesor directo del vigente.
   * Un `prev` con el mismo precio (cambio de promo/disponibilidad, o cierre por
   * discontinuación) no es cambio de precio y queda afuera por `cur.price <> prev.price`.
   */
  async recentChanges(f: RecentChangesFilters): Promise<{ data: Product[]; total: number }> {
    const sql = this.sql;
    const masonlineId = sql`(SELECT id FROM retailers WHERE slug = 'masonline')`;
    const carrefourId = sql`(SELECT id FROM retailers WHERE slug = 'carrefour')`;

    // Pedir una diferencia mínima cross-retailer implica exigir ambas cadenas.
    const minDiffFilter =
      f.minDiffPct !== undefined
        ? sql`AND px.m_price IS NOT NULL AND px.c_price IS NOT NULL AND px.m_price > 0
              AND ABS((px.c_price - px.m_price) / px.m_price * 100) >= ${f.minDiffPct}`
        : sql``;

    const rows = await sql<(RawProductRow & { total: number })[]>`
      WITH changed AS MATERIALIZED (
        SELECT prev.ean, MAX(ABS(cur.price - prev.price) / prev.price) AS change_magnitude
        FROM price_history prev
        JOIN LATERAL (
          SELECT nxt.price, nxt.valid_to, nxt.is_available, nxt.first_seen_at
          FROM price_history nxt
          WHERE nxt.retailer_id = prev.retailer_id AND nxt.ean = prev.ean
            AND nxt.valid_from > prev.valid_from
          ORDER BY nxt.valid_from ASC
          LIMIT 1
        ) cur ON TRUE
        WHERE prev.valid_to IS NOT NULL
          AND prev.price > 0
          AND cur.valid_to IS NULL
          AND cur.is_available
          AND cur.first_seen_at >= NOW() - make_interval(hours => ${f.hours})
          AND cur.price <> prev.price
        GROUP BY prev.ean
      ),
      ranked AS (
        SELECT ch.ean, ch.change_magnitude, COUNT(*) OVER ()::int AS total
        FROM changed ch
        JOIN products p ON p.ean = ch.ean
        JOIN LATERAL (
          SELECT
            MAX(ph.price) AS max_price,
            MAX(ph.price) FILTER (WHERE ph.retailer_id = ${masonlineId}) AS m_price,
            MAX(ph.price) FILTER (WHERE ph.retailer_id = ${carrefourId}) AS c_price
          FROM price_history ph
          WHERE ph.ean = p.ean AND ph.valid_to IS NULL AND ph.is_available
        ) px ON TRUE
        WHERE (p.brand IS NULL OR p.brand NOT IN ('Genérico', 'Generico'))
          AND px.max_price <= ${f.maxPrice}
          AND (
            px.m_price IS NULL OR px.c_price IS NULL OR px.m_price <= 0
            OR ABS((px.c_price - px.m_price) / px.m_price * 100) <= ${f.maxDiffPct}
          )
          ${minDiffFilter}
        ORDER BY ch.change_magnitude DESC, ch.ean ASC
        LIMIT ${f.limit}
      )
      SELECT
        p.ean, p.name_canonical, p.brand, p.category_path, p.image_url,
        p.first_seen_at, p.last_seen_at,
        rk.total,
        ${this.retailerOffersSubquery()} AS retailers
      FROM ranked rk
      JOIN products p ON p.ean = rk.ean
      ORDER BY rk.change_magnitude DESC, rk.ean ASC
    `;

    // COUNT(*) OVER () se evalúa antes del LIMIT: total = filas que pasaron todos
    // los filtros. Sin filas no hay total que leer, y 0 es la respuesta correcta.
    return { data: rows.map(toProduct), total: rows[0]?.total ?? 0 };
  }

  async getProduct(ean: string): Promise<Product | null> {
    const rows = await this.sql<RawProductRow[]>`
      SELECT
        p.ean, p.name_canonical, p.brand, p.category_path, p.image_url,
        p.first_seen_at, p.last_seen_at,
        ${this.retailerOffersSubquery()} AS retailers
      FROM products p
      WHERE p.ean = ${ean}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? toProduct(row) : null;
  }

  async productExists(ean: string): Promise<boolean> {
    const rows = await this.sql<{ one: number }[]>`
      SELECT 1 AS one FROM products WHERE ean = ${ean} LIMIT 1
    `;
    return rows.length > 0;
  }

  async priceHistory(ean: string, f: PriceHistoryFilters): Promise<PriceHistoryEntry[]> {
    const sql = this.sql;
    const retailerFilter = f.retailer ? sql`AND r.slug = ${f.retailer}` : sql``;
    const fromFilter = f.from ? sql`AND ph.valid_from >= ${f.from}::date` : sql``;
    const toFilter = f.to ? sql`AND ph.valid_from <= ${f.to}::date` : sql``;

    const rows = await sql<RawPriceHistoryRow[]>`
      SELECT
        r.slug AS retailer, r.name AS retailer_name,
        ph.valid_from::text AS valid_from, ph.valid_to::text AS valid_to,
        ph.price::text AS price, ph.list_price::text AS list_price,
        ph.has_promo, ph.promo_description, ph.is_available
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.ean = ${ean} ${retailerFilter} ${fromFilter} ${toFilter}
      ORDER BY r.slug ASC, ph.valid_from DESC
    `;

    return rows.map((row) => ({
      retailer: row.retailer,
      retailerName: row.retailer_name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      price: Number(row.price),
      listPrice: row.list_price !== null ? Number(row.list_price) : null,
      hasPromo: row.has_promo,
      promoDescription: row.promo_description,
      isAvailable: row.is_available,
    }));
  }

  /** Cadenas donde el producto existe (para el refresh on-demand) + su frescura. */
  async retailerProductsForEan(ean: string): Promise<RetailerProductRef[]> {
    const rows = await this.sql<
      { retailer_id: number; slug: string; last_seen_at: Date }[]
    >`
      SELECT rp.retailer_id, r.slug, rp.last_seen_at
      FROM retailer_products rp
      JOIN retailers r ON r.id = rp.retailer_id
      WHERE rp.ean = ${ean}
    `;
    return rows.map((r) => ({
      retailerId: r.retailer_id,
      slug: r.slug,
      lastSeenAt: r.last_seen_at,
    }));
  }

  /**
   * Subquery correlacionada: ofertas vigentes (valid_to IS NULL) por retailer,
   * como jsonb. Corre una vez por fila de products devuelta (acotado por LIMIT o
   * por la búsqueda puntual por EAN) — un solo statement, no N+1 de red.
   */
  private retailerOffersSubquery() {
    return this.sql`COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'retailer', r.slug,
        'retailerName', r.name,
        'price', ph.price,
        'listPrice', ph.list_price,
        'hasPromo', ph.has_promo,
        'promoDescription', ph.promo_description,
        'isAvailable', ph.is_available,
        'validFrom', ph.valid_from::text,
        'productUrl', rp.product_url,
        'lastSeenAt', rp.last_seen_at
      ) ORDER BY r.slug)
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      LEFT JOIN retailer_products rp ON rp.ean = ph.ean AND rp.retailer_id = ph.retailer_id
      WHERE ph.ean = p.ean AND ph.valid_to IS NULL
    ), '[]'::jsonb)`;
  }
}
