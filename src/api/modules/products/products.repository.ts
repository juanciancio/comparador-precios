import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { normalizeBrandKey } from '../../../lib/brand/normalize.ts';
import { buildBrandGroups } from '../../../lib/brand/groups.ts';
import { MI_CRF_HIGHLIGHT_PATTERN, isMiCrfDiscount } from '../../../lib/mi-crf.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import { BrandCatalogService } from '../../common/brand/brand-catalog.service.ts';
import type { Product, PriceHistoryEntry, RetailerOffer } from './dto/products.dto.ts';
import { ACTIVE_REGION } from '../../config/region.ts';
import { hasActiveOffer } from '../../common/database/active-offer.ts';

export interface RetailerInfo {
  id: number;
  slug: string;
  name: string;
}

/**
 * Recorte del catálogo, sin el filtro de marca. Es lo que /products y /search
 * aplican antes de filtrar por `brand`, y lo que GET /search/facets usa como
 * universo para contar marcas.
 *
 * Vive separado de `ListFilters` porque los facets deben contar sobre el scope
 * SIN filtro de marca (así los contadores no se mueven cuando el usuario tilda
 * una marca en el sidebar), pero por lo demás el recorte tiene que ser idéntico
 * al de la grilla o los números del sidebar mienten. Un solo `scopeSql()` lo
 * resuelve para los tres endpoints.
 */
export interface ScopeFilters {
  /** Departamentos top-level exactos; matchea cualquiera (OR). Vacío = sin filtro. */
  categoryTop?: string[] | undefined;
  /** @deprecated Substring sobre el path completo; usar categoryTop. */
  category?: string | undefined;
  onlyMatched: boolean;
  /** Términos de búsqueda; cada uno debe matchear (AND) name o brand. Usado por /search. */
  terms?: string[] | undefined;
}

export interface ListFilters extends ScopeFilters {
  limit: number;
  offset: number;
  /** Marcas exactas; matchea cualquiera de ellas (OR). Vacío = sin filtro. */
  brand?: string[] | undefined;
  sortBy: 'name' | 'brand' | 'first_seen' | 'last_seen';
  sortDir: 'asc' | 'desc';
}

export interface BrandFacetFilters extends ScopeFilters {
  limit: number;
  /** Substring case-insensitive sobre el nombre de marca. Vacío = top por count. */
  brandQuery?: string | undefined;
}

/** Marca + cantidad de productos dentro de un scope. Contrato en search/dto/facets.dto.ts. */
export interface BrandFacet {
  name: string;
  count: number;
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
  price_without_discount: string | null;
  discount_highlight: string | null;
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

  constructor(
    @InjectPg() private readonly sql: Db,
    private readonly brandCatalog: BrandCatalogService,
  ) {}

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
    // El filtro `?brand=` se expande a las formas crudas del grupo canónico y se
    // resuelve con `= ANY(...)`, que usa idx_products_brand. Si el/los valores no
    // matchean ninguna marca del catálogo, el array queda vacío y ANY('{}') no
    // devuelve filas (marca inexistente = sin resultados, no "sin filtro").
    const brandForms = f.brand?.length ? await this.brandCatalog.expandBrandFilter(f.brand) : null;
    const brandFilter = brandForms ? sql`AND p.brand = ANY(${brandForms})` : sql``;
    const scopeFilter = this.scopeSql(f);

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
      WHERE TRUE ${brandFilter} ${scopeFilter}
      ORDER BY ${orderCol} ${orderDir} NULLS LAST, p.ean ASC
      LIMIT ${f.limit} OFFSET ${f.offset}
    `;

    const totalRows = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM products p
      WHERE TRUE ${brandFilter} ${scopeFilter}
    `;

    const canon = await this.brandCatalog.resolver();
    const data = rows.map((r) => this.withCanonicalBrand(toProduct(r), canon));
    return { data, total: totalRows[0]!.total };
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
            AND nxt.region_id = prev.region_id
            AND nxt.valid_from > prev.valid_from
          ORDER BY nxt.valid_from ASC
          LIMIT 1
        ) cur ON TRUE
        WHERE prev.region_id = ${ACTIVE_REGION}
          AND prev.valid_to IS NOT NULL
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
          WHERE ph.ean = p.ean AND ph.region_id = ${ACTIVE_REGION}
            AND ph.valid_to IS NULL AND ph.is_available
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
    if (!row) return null;
    const canon = await this.brandCatalog.resolver();
    return this.withCanonicalBrand(toProduct(row), canon);
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
        ph.price_without_discount::text AS price_without_discount,
        ph.discount_highlight,
        ph.has_promo, ph.promo_description, ph.is_available
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.ean = ${ean} AND ph.region_id = ${ACTIVE_REGION}
        ${retailerFilter} ${fromFilter} ${toFilter}
      ORDER BY r.slug ASC, ph.valid_from DESC
    `;

    return rows.map((row) => ({
      retailer: row.retailer,
      retailerName: row.retailer_name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      price: Number(row.price),
      listPrice: row.list_price !== null ? Number(row.list_price) : null,
      priceWithoutDiscount:
        row.price_without_discount !== null ? Number(row.price_without_discount) : null,
      hasMiCrfDiscount: isMiCrfDiscount(row.discount_highlight),
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
      WHERE rp.ean = ${ean} AND rp.region_id = ${ACTIVE_REGION}
    `;
    return rows.map((r) => ({
      retailerId: r.retailer_id,
      slug: r.slug,
      lastSeenAt: r.last_seen_at,
    }));
  }

  /**
   * Conteo de productos por MARCA CANÓNICA dentro de un scope, para el sidebar.
   *
   * El scope sale del mismo `scopeSql()` que usa `listProducts`, y NO aplica el
   * filtro de marca: los contadores describen el universo previo a tildar marcas,
   * que es lo que permite mostrar "otras marcas disponibles en este scope" y que
   * los números no se muevan al filtrar. La suma de counts sobre todas las marcas
   * de un scope iguala el `total` de /products o /search con esos mismos params.
   *
   * Las marcas fragmentadas (Genérico/Generico, Ga.Ma/Gama, ...) se fusionan por
   * clave N3 y se muestran con un único display canónico. Como el campo `brand`
   * de los productos usa ese MISMO display, la invariante suma==total se sostiene.
   *
   * `brand IS NOT NULL`: products.brand es nullable (transform.ts manda null si
   * el retailer no informa marca) y una fila sin marca no es una opción tildeable
   * en el sidebar. Hoy son 0 filas, así que no abre gap contra el total.
   *
   * `brandQuery` matchea y ordena por clave N3 (insensible a acento, caso y
   * puntuación): "generico", "genérico" o "eneric" traen todas el grupo Genérico.
   * Es texto libre tipeado por el usuario, a diferencia del filtro `brand` de
   * /products y /search, que recibe el display canónico exacto que el sidebar
   * tildó y expande a las formas crudas de ese grupo.
   */
  async brandFacets(f: BrandFacetFilters): Promise<BrandFacet[]> {
    const sql = this.sql;
    const scopeFilter = this.scopeSql(f);

    // Conteos crudos por marca del scope. La agrupación por marca canónica se
    // hace en TS (buildBrandGroups) y NO en SQL: un grupo con puntuación (Ga.Ma
    // + Gama) puede tener formas que un pre-filtro por texto matchearía a
    // medias, y perderíamos parte del count. Se traen todas las marcas del scope
    // (acotado por scope; a lo sumo ~2.7k globales) y se agrupa/filtra/ordena en
    // memoria.
    const rows = await sql<{ brand: string; count: number }[]>`
      SELECT p.brand AS brand, COUNT(*)::int AS count
      FROM products p
      WHERE p.brand IS NOT NULL ${scopeFilter}
      GROUP BY p.brand
    `;

    const { displayByKey } = await this.brandCatalog.maps();
    // El display sale del mapa GLOBAL (consistente con el campo brand de los
    // productos); el count es el del scope. Fallback al display scopeado si el
    // mapa global quedó stale y no tiene la clave.
    let facets: BrandFacet[] = buildBrandGroups(rows).map((g) => ({
      name: displayByKey.get(g.groupKey) ?? g.display,
      count: g.count,
    }));

    if (f.brandQuery) {
      // Match y orden por clave N3 (insensible a acento, caso y puntuación), lo
      // mismo que usa el agrupamiento. Los prefix-match van primero: al tipear
      // "ser" se espera "Serta" antes que "La Serenísima".
      const qKey = normalizeBrandKey(f.brandQuery);
      facets = facets.filter((fc) => normalizeBrandKey(fc.name).includes(qKey));
      facets.sort((a, b) => {
        const aPrefix = normalizeBrandKey(a.name).startsWith(qKey);
        const bPrefix = normalizeBrandKey(b.name).startsWith(qKey);
        if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
        if (a.count !== b.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'es');
      });
    } else {
      facets.sort((a, b) =>
        a.count !== b.count ? b.count - a.count : a.name.localeCompare(b.name, 'es'),
      );
    }

    return facets.slice(0, f.limit);
  }

  /** Reemplaza la marca cruda por el display canónico (capa de presentación). */
  private withCanonicalBrand(p: Product, canon: (raw: string | null) => string | null): Product {
    return { ...p, brand: canon(p.brand) };
  }

  /**
   * Recorte del catálogo compartido por /products, /search y /search/facets.
   * Es deliberadamente el único lugar donde se traduce `ScopeFilters` a SQL: si
   * los facets divergieran del listado, los contadores del sidebar mentirían
   * respecto de la grilla de al lado.
   *
   * No excluye la marca catchall "Genérico" bajo `onlyMatched`. La regla dura del
   * proyecto aplica a comparaciones de precio cross-retailer (/compare,
   * matched_count, recent-changes); `onlyMatched` solo filtra por disponibilidad
   * en ≥2 cadenas y nunca la excluyó. Ver CLAUDE.md → "Data quality signals".
   */
  private scopeSql(f: ScopeFilters) {
    const sql = this.sql;
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
          WHERE ph.ean = p.ean AND ph.region_id = ${ACTIVE_REGION}
            AND ph.valid_to IS NULL AND ph.is_available
        ) >= 2`
      : sql``;
    // Cada término debe matchear name o brand (AND entre términos, OR entre columnas).
    const searchFilter = (f.terms ?? []).reduce(
      (acc, term) =>
        sql`${acc} AND (p.name_canonical ILIKE ${'%' + term + '%'} OR p.brand ILIKE ${'%' + term + '%'})`,
      sql``,
    );

    // Excluye huérfanos (productos sin oferta vigente en la región). Va acá y no
    // en cada caller porque scopeSql es el scope compartido de /products, /search
    // y /search/facets: los tres tienen que ver el mismo universo o los facets
    // contarían marcas que la grilla no muestra. Ver common/database/active-offer.ts.
    const activeOfferFilter = sql`AND ${hasActiveOffer(sql)}`;

    return sql`${categoryTopFilter} ${categoryFilter} ${matchedFilter} ${searchFilter} ${activeOfferFilter}`;
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
        'priceWithoutDiscount', ph.price_without_discount,
        'hasMiCrfDiscount', COALESCE(ph.discount_highlight ILIKE ${MI_CRF_HIGHLIGHT_PATTERN}, false),
        'hasPromo', ph.has_promo,
        'promoDescription', ph.promo_description,
        'isAvailable', ph.is_available,
        'validFrom', ph.valid_from::text,
        'productUrl', rp.product_url,
        'lastSeenAt', rp.last_seen_at
      ) ORDER BY r.slug)
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      LEFT JOIN retailer_products rp
        ON rp.ean = ph.ean AND rp.retailer_id = ph.retailer_id AND rp.region_id = ph.region_id
      WHERE ph.ean = p.ean AND ph.region_id = ${ACTIVE_REGION} AND ph.valid_to IS NULL
    ), '[]'::jsonb)`;
  }
}
