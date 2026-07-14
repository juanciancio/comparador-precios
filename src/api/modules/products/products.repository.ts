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
  brand?: string | undefined;
  category?: string | undefined;
  onlyMatched: boolean;
  sortBy: 'name' | 'brand' | 'first_seen' | 'last_seen';
  sortDir: 'asc' | 'desc';
  /** Términos de búsqueda; cada uno debe matchear (AND) name o brand. Usado por /search. */
  terms?: string[] | undefined;
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
    const brandFilter = f.brand ? sql`AND p.brand = ${f.brand}` : sql``;
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
      WHERE TRUE ${brandFilter} ${categoryFilter} ${matchedFilter} ${searchFilter}
      ORDER BY ${orderCol} ${orderDir} NULLS LAST, p.ean ASC
      LIMIT ${f.limit} OFFSET ${f.offset}
    `;

    const totalRows = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM products p
      WHERE TRUE ${brandFilter} ${categoryFilter} ${matchedFilter} ${searchFilter}
    `;

    return { data: rows.map(toProduct), total: totalRows[0]!.total };
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
