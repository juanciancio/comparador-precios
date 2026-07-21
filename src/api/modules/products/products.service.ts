import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { retailers as retailerConfig, type RetailerSlug } from '../../../config/retailers.ts';
import { apiEnv } from '../../config/env.ts';
import { logger } from '../../../lib/logger.ts';
import { fetchProductsByEan } from '../../../lib/vtex-client.ts';
import { extractSkus } from '../../../pipeline/extract.ts';
import { normalizeEan, normalizeSku, EanDeduper } from '../../../pipeline/transform.ts';
import { loadRun } from '../../../pipeline/load.ts';
import {
  ProductsRepository,
  type ListFilters,
  type PriceHistoryFilters,
  type RetailerProductRef,
} from './products.repository.ts';
import type { Product, PriceHistoryEntry } from './dto/products.dto.ts';
import type {
  ListProductsQueryDto,
  PriceHistoryQueryDto,
  RecentChangesQueryDto,
  SimilarProductsQueryDto,
} from './dto/products.dto.ts';
import { categoryLeaf } from '../../../lib/category-path.ts';
import { ACTIVE_REGION } from '../../config/region.ts';
import { DEFAULT_REGION, regionIdFor } from '../../../config/regions.ts';

/** Ventana de cache comunitario del refresh on-demand. Protege a VTEX de ráfagas.
 * Configurable vía REFRESH_TTL_SECONDS (default 60; se baja en tests). */
const REFRESH_TTL_MS = apiEnv.REFRESH_TTL_SECONDS * 1000;

export interface ListProductsResult {
  region: string;
  data: Product[];
  pagination: { limit: number; offset: number; total: number };
}

export interface RefreshResult {
  region: string;
  product: Product;
  was_refreshed: boolean;
  updated_at: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async list(query: ListProductsQueryDto): Promise<ListProductsResult> {
    const filters: ListFilters = {
      limit: query.limit,
      offset: query.offset,
      brand: query.brand,
      categoryTop: query.category_top,
      category: query.category,
      onlyMatched: query.only_matched,
      sortBy: query.sort_by,
      sortDir: query.sort_dir,
    };
    const { data, total } = await this.repo.listProducts(filters);
    return {
      region: ACTIVE_REGION,
      data,
      pagination: { limit: query.limit, offset: query.offset, total },
    };
  }

  async recentChanges(query: RecentChangesQueryDto): Promise<ListProductsResult> {
    const { data, total } = await this.repo.recentChanges({
      limit: query.limit,
      hours: query.hours,
      minDiffPct: query.min_diff_pct,
      maxPrice: apiEnv.RECENT_CHANGES_MAX_PRICE,
      maxDiffPct: apiEnv.RECENT_CHANGES_MAX_DIFF_PCT,
    });
    // Mismo envelope que GET /products: el frontend reusa el cliente tipado sin
    // mapeo extra. No hay paginación real acá (es un top-N), así que offset = 0.
    return {
      region: ACTIVE_REGION,
      data,
      pagination: { limit: query.limit, offset: 0, total },
    };
  }

  async getOne(rawEan: string): Promise<{ region: string; product: Product }> {
    const ean = this.normalize(rawEan);
    const product = await this.repo.getProduct(ean);
    if (!product) throw new NotFoundException(`No existe producto con EAN ${ean}`);
    return { region: ACTIVE_REGION, product };
  }

  /**
   * Productos de la misma sub-categoría, para el pie de la ficha de producto.
   *
   * Devuelve el envelope de `/products` con `products: []` (200, no 404) cuando
   * el producto no tiene sub-categoría: que la ficha no tenga similares es un
   * estado normal del frontend, no un error. Sólo el EAN inexistente es 404.
   *
   * El filtro por cadena replica la góndola: si el producto original se vende en
   * una sola, los similares que se ofrecen tienen que comprarse en ese mismo
   * lugar. Con 0 cadenas (huérfano regional) o ≥2 no hay a qué acotar y se
   * muestra todo lo comparable de la sub-categoría.
   */
  async similar(rawEan: string, query: SimilarProductsQueryDto): Promise<ListProductsResult> {
    const ean = this.normalize(rawEan);
    const product = await this.repo.getProduct(ean);
    if (!product) throw new NotFoundException(`No existe producto con EAN ${ean}`);

    const leaf = categoryLeaf(product.categoryPath);
    const retailerSlugs = new Set(product.retailers.map((r) => r.retailer));

    const data =
      leaf === null
        ? []
        : await this.repo.similarProducts({
            leaf,
            excludeEan: ean,
            retailerSlug: retailerSlugs.size === 1 ? [...retailerSlugs][0] : undefined,
            limit: query.limit,
          });

    // total = devueltos: no hay paginación, así que no hay total teórico que ofrecer.
    return {
      region: ACTIVE_REGION,
      data,
      pagination: { limit: query.limit, offset: 0, total: data.length },
    };
  }

  async priceHistory(rawEan: string, query: PriceHistoryQueryDto): Promise<{
    region: string;
    ean: string;
    history: PriceHistoryEntry[];
  }> {
    const ean = this.normalize(rawEan);
    if (query.retailer) await this.assertRetailerExists(query.retailer);

    if (!(await this.repo.productExists(ean))) {
      throw new NotFoundException(`No existe producto con EAN ${ean}`);
    }

    const filters: PriceHistoryFilters = {
      retailer: query.retailer,
      from: query.from,
      to: query.to,
    };
    const history = await this.repo.priceHistory(ean, filters);
    return { region: ACTIVE_REGION, ean, history };
  }

  async refresh(rawEan: string): Promise<RefreshResult> {
    const ean = this.normalize(rawEan);
    const refs = await this.repo.retailerProductsForEan(ean);

    if (refs.length === 0) {
      // Sin mapeo a ninguna cadena: si ni siquiera existe el producto, 404.
      if (!(await this.repo.productExists(ean))) {
        throw new NotFoundException(`No existe producto con EAN ${ean}`);
      }
      const product = await this.repo.getProduct(ean);
      return {
        region: ACTIVE_REGION,
        product: product!,
        was_refreshed: false,
        updated_at: new Date().toISOString(),
      };
    }

    const freshestMs = Math.max(...refs.map((r) => r.lastSeenAt.getTime()));
    const ageMs = Date.now() - freshestMs;

    let wasRefreshed = false;
    if (ageMs >= REFRESH_TTL_MS) {
      wasRefreshed = await this.refreshFromRetailers(ean, refs);
    }

    const product = await this.repo.getProduct(ean);
    if (!product) throw new NotFoundException(`No existe producto con EAN ${ean}`);

    // updated_at = frescura efectiva = último last_seen_at entre las ofertas vigentes.
    const lastSeen = product.retailers
      .map((r) => Date.parse(r.lastSeenAt))
      .filter((t) => Number.isFinite(t));
    const updatedAt =
      lastSeen.length > 0
        ? new Date(Math.max(...lastSeen)).toISOString()
        : new Date().toISOString();

    return {
      region: ACTIVE_REGION,
      product,
      was_refreshed: wasRefreshed,
      updated_at: updatedAt,
    };
  }

  /**
   * Fetch en vivo + extract + transform + load para cada cadena donde existe el
   * producto. Reusa el pipeline del scraper (idempotente). Best-effort: si una
   * cadena falla, se loguea y se sigue. Devuelve true si al menos una cargó.
   */
  private async refreshFromRetailers(
    ean: string,
    refs: RetailerProductRef[],
  ): Promise<boolean> {
    let anyLoaded = false;

    for (const ref of refs) {
      const config = retailerConfig[ref.slug as RetailerSlug];
      if (!config) {
        logger.warn({ ean, retailer: ref.slug, step: 'refresh' }, 'unknown retailer slug, skipping');
        continue;
      }
      const log = logger.child({ service: 'api', step: 'refresh', ean, retailer: ref.slug });

      // Mismo criterio que el scraper: sin la cookie de región el refresh
      // traería el precio del catálogo sin regionalizar y lo escribiría bajo
      // region_id = ACTIVE_REGION, contaminando justo la fila que el usuario
      // pidió refrescar. Sin regionId configurado, no se refresca.
      const vtexRegionId = regionIdFor(DEFAULT_REGION, ref.slug);
      if (vtexRegionId === undefined) {
        log.warn({}, 'no regionId configured for retailer, skipping refresh');
        continue;
      }

      const fetched = await fetchProductsByEan(config.host, ean, vtexRegionId);
      if (!fetched.ok) {
        log.error({ err: fetched.error }, 'live fetch failed, skipping retailer');
        continue;
      }

      const deduper = new EanDeduper(log);
      for (const raw of fetched.value) {
        for (const row of extractSkus(raw, config.host).rows) {
          const normalized = normalizeSku(row);
          // Solo el producto pedido: alternateIds_Ean puede traer variantes con otro EAN.
          if (normalized.ean === ean) deduper.add(normalized);
        }
      }

      if (deduper.size === 0) {
        log.warn({}, 'live fetch returned no SKU for this EAN');
        continue;
      }

      const loaded = await loadRun(ref.retailerId, ACTIVE_REGION, deduper.values(), log);
      if (!loaded.ok) {
        log.error({ err: loaded.error.error }, 'load failed during refresh');
        continue;
      }
      anyLoaded = true;

      if (loaded.value.priceNew > 0 || loaded.value.priceChanged > 0) {
        // Señal para el futuro SSE broadcast (Fase 3.C).
        log.info(
          { priceNew: loaded.value.priceNew, priceChanged: loaded.value.priceChanged },
          'refresh produced a real price change',
        );
      }
    }

    return anyLoaded;
  }

  private normalize(rawEan: string): string {
    const result = normalizeEan(rawEan);
    if (!result.ok) {
      throw new BadRequestException(`EAN inválido: ${rawEan}`);
    }
    return result.value;
  }

  private async assertRetailerExists(slug: string): Promise<void> {
    const retailers = await this.repo.retailers();
    if (!retailers.some((r) => r.slug === slug)) {
      throw new BadRequestException(
        `retailer desconocido: ${slug} (válidos: ${retailers.map((r) => r.slug).join(', ')})`,
      );
    }
  }
}
