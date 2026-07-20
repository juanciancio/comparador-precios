import type { Logger } from '../lib/logger.ts';
import type { RetailerConfig } from '../config/retailers.ts';
import {
  fetchCategoryTree,
  fetchProductsByCategory,
  fetchProductsByBrand,
} from '../lib/vtex-client.ts';

export interface ScrapedProduct {
  raw: unknown;
  departmentId: number;
  departmentName: string;
}

export interface ScrapeStats {
  departmentsProcessed: number;
  departmentsEmpty: number;
  departmentsWentEmpty: number;
}

export interface ScrapeOptions {
  limitDepartments?: number;
  /** True si el departamento tenía productos en la última corrida exitosa. */
  wasNonEmpty?: (departmentName: string) => boolean;
  /** Contadores mutables para el reporte de la corrida. */
  stats?: ScrapeStats;
}

const PAGE_STEP = 50;
const PAGINATION_CAP = 2500; // VTEX no deja pasar _from de 2500

interface PageState {
  capHit: boolean;
}

function readProductId(raw: unknown): string | null {
  if (typeof raw === 'object' && raw !== null) {
    const v = (raw as { productId?: unknown }).productId;
    if (typeof v === 'string') return v;
  }
  return null;
}

function readBrandId(raw: unknown): number | null {
  if (typeof raw === 'object' && raw !== null) {
    const v = (raw as { brandId?: unknown }).brandId;
    if (typeof v === 'number') return v;
  }
  return null;
}

/** Pagina fq=C:{cat} (opcionalmente + fq=B:{brand}) hasta [] o el cap de 2500. */
async function* paginate(
  host: string,
  categoryId: number,
  brandId: number | undefined,
  log: Logger,
  state: PageState,
  vtexRegionId: string,
): AsyncGenerator<unknown> {
  state.capHit = false;
  for (let from = 0; from < PAGINATION_CAP; from += PAGE_STEP) {
    const to = from + PAGE_STEP - 1;
    const result =
      brandId === undefined
        ? await fetchProductsByCategory(host, String(categoryId), from, to, vtexRegionId)
        : await fetchProductsByBrand(host, String(categoryId), brandId, from, to, vtexRegionId);

    if (!result.ok) {
      log.error(
        { categoryId, brandId, from, to, err: result.error, step: 'paginate' },
        'page fetch failed, ending this category',
      );
      return;
    }
    if (result.value.length === 0) return;

    yield* result.value;

    // Última página llena justo en el borde del cap -> probablemente hay más.
    if (result.value.length === PAGE_STEP && from + PAGE_STEP >= PAGINATION_CAP) {
      state.capHit = true;
      return;
    }
  }
}

/** Recorre un departamento; si topa 2500, subdivide por las marcas vistas. */
async function* scrapeDepartment(
  host: string,
  department: { id: number; name: string },
  log: Logger,
  vtexRegionId: string,
): AsyncGenerator<unknown> {
  const brandIds = new Set<number>();
  const state: PageState = { capHit: false };

  for await (const raw of paginate(host, department.id, undefined, log, state, vtexRegionId)) {
    const brandId = readBrandId(raw);
    if (brandId !== null) brandIds.add(brandId);
    yield raw;
  }

  if (!state.capHit) return;

  log.warn(
    { departmentId: department.id, brands: brandIds.size, step: 'cap_2500' },
    'department exceeds 2500, subdividing by brand',
  );
  for (const brandId of brandIds) {
    const brandState: PageState = { capHit: false };
    for await (const raw of paginate(host, department.id, brandId, log, brandState, vtexRegionId)) {
      yield raw;
    }
    if (brandState.capHit) {
      log.error(
        { departmentId: department.id, brandId, step: 'cap_2500_brand' },
        'department+brand still exceeds 2500 — best-effort 2500, needs manual review',
      );
    }
  }
}

/**
 * Scraper genérico. Itera DEPARTAMENTOS top-level (fq=C: solo trae productos a
 * ese nivel). Dedup global por productId (VTEX asigna productos a múltiples
 * departamentos). Yields crudos; el parse Zod ocurre en extract.
 */
export async function* scrapeDepartments(
  retailer: RetailerConfig,
  vtexRegionId: string,
  log: Logger,
  opts: ScrapeOptions = {},
): AsyncGenerator<ScrapedProduct> {
  const treeResult = await fetchCategoryTree(retailer.host, retailer.treeDepth);
  if (!treeResult.ok) {
    log.error({ err: treeResult.error, step: 'category_tree' }, 'category tree failed, aborting run');
    return;
  }

  const departments = treeResult.value.filter(
    (d) => !retailer.skipDepartmentPatterns.some((re) => re.test(d.name)),
  );
  const selected = opts.limitDepartments ? departments.slice(0, opts.limitDepartments) : departments;
  log.info(
    { topLevel: treeResult.value.length, departments: selected.length },
    'departments selected',
  );

  const seenProductIds = new Set<string>();

  for (const department of selected) {
    let rawCount = 0;
    for await (const raw of scrapeDepartment(retailer.host, department, log, vtexRegionId)) {
      rawCount += 1;
      const productId = readProductId(raw);
      if (productId !== null) {
        if (seenProductIds.has(productId)) continue;
        seenProductIds.add(productId);
      }
      yield { raw, departmentId: department.id, departmentName: department.name };
    }

    if (opts.stats) opts.stats.departmentsProcessed += 1;

    if (rawCount === 0) {
      if (opts.stats) opts.stats.departmentsEmpty += 1;
      if (opts.wasNonEmpty?.(department.name)) {
        if (opts.stats) opts.stats.departmentsWentEmpty += 1;
        log.warn(
          { departmentId: department.id, departmentName: department.name, reason: 'department_went_empty' },
          'department was non-empty in last successful run, now returns 0 products',
        );
      } else {
        log.info(
          { departmentId: department.id, departmentName: department.name },
          'department empty (expected: display/filter category)',
        );
      }
    }
  }
}
