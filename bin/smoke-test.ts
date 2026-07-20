import '../src/lib/env.ts';
import { logger } from '../src/lib/logger.ts';
import { fetchCategoryTree, fetchProductsByCategory } from '../src/lib/vtex-client.ts';
import { vtexProductSchema } from '../src/schemas/vtex-product.ts';
import { retailers } from '../src/config/retailers.ts';
import { DEFAULT_REGION, regionIdFor } from '../src/config/regions.ts';
import type { VtexCategory } from '../src/schemas/vtex-category.ts';

const { host, treeDepth } = retailers.masonline;
// Los smokes miran precios, así que van regionalizados como el scraper real: sin
// la cookie mirarían el precio del catálogo sin regionalizar y "verificarían" algo
// que no es lo que cargamos.
const vtexRegionId = regionIdFor(DEFAULT_REGION, 'masonline');
if (vtexRegionId === undefined) throw new Error('no regionId for masonline in src/config/regions.ts');


// En Masonline, fq=C: solo devuelve productos a nivel top-level (departamento);
// las categorías intermedias/hojas devuelven 0. Además hay departamentos basura
// ("(Old)", "Categoria Mercadolibre") que se saltean.
const isJunkCategory = (name: string): boolean => /\(old\)|mercadolibre/i.test(name);

const log = logger.child({ retailer: 'masonline', step: 'smoke' });
const MAX_TRIES = 10;

// 1) Árbol de categorías
const treeResult = await fetchCategoryTree(host, treeDepth);
if (!treeResult.ok) {
  log.error({ err: treeResult.error }, 'category tree fetch failed');
  process.exit(1);
}
const tree = treeResult.value;
const departments = tree.filter((c) => !isJunkCategory(c.name));
log.info(
  { topLevel: tree.length, activeDepartments: departments.length, sample: departments.slice(0, 3).map((c) => c.name) },
  'category tree fetched',
);

// 2) Primer departamento con productos
let category: VtexCategory | undefined;
let raw: unknown[] = [];
for (const [i, candidate] of departments.entries()) {
  if (i >= MAX_TRIES) break;
  const productsResult = await fetchProductsByCategory(host, String(candidate.id), 0, 4, vtexRegionId);
  if (!productsResult.ok) {
    log.warn({ categoryId: candidate.id, err: productsResult.error }, 'products fetch failed (trying next)');
    continue;
  }
  if (productsResult.value.length > 0) {
    category = candidate;
    raw = productsResult.value;
    break;
  }
  log.info({ categoryId: candidate.id, name: candidate.name }, 'department empty, trying next');
}

if (!category) {
  log.error({ tried: Math.min(departments.length, MAX_TRIES) }, 'no department with products found');
  process.exit(1);
}
log.info({ categoryId: category.id, name: category.name, count: raw.length }, 'department with products selected');

let parsed = 0;
for (const item of raw) {
  const result = vtexProductSchema.safeParse(item);
  if (!result.success) {
    log.warn({ issues: result.error.issues.slice(0, 3) }, 'product failed schema (skipped)');
    continue;
  }
  parsed += 1;
  const product = result.data;
  for (const sku of product.items) {
    const seller = sku.sellers.find((s) => s.sellerDefault) ?? sku.sellers[0];
    const offer = seller?.commertialOffer;
    log.info(
      {
        productName: product.productName,
        brand: product.brand,
        ean: sku.ean ?? null,
        price: offer?.Price ?? null,
        listPrice: offer?.ListPrice ?? null,
        isAvailable: offer ? offer.IsAvailable && offer.AvailableQuantity > 0 : null,
      },
      'sku',
    );
  }
}

log.info({ parsed, total: raw.length }, 'smoke test done');
