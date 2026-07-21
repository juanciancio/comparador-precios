import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

/**
 * EANs reales del catálogo de Olavarría, elegidos por la propiedad que ejercitan.
 * El proyecto no tiene factories: los tests de API corren contra la DB real (ver
 * tests/api/products.test.ts). Cada constante documenta qué la hace elegible para
 * que se pueda reemplazar si el scraper mueve la data.
 */

/** Latex King: 2 cadenas, hoja `Pinturas` con 398 productos activos. */
const MATCHED_EAN = '7792952010116';
/** Acelga Check: SOLO masonline, hoja `Verduras` con 77 productos solo-carrefour. */
const SINGLE_RETAILER_EAN = '7799120003444';
/** Gavetero Sao Bernardo: huérfano regional (0 ofertas), hoja con 706 activos. */
const ORPHAN_EAN = '7896539202915';
/** Hidrolavadora Lüsqtoff: 2 cadenas, MISMA hoja que ORPHAN_EAN (control del caso huérfano). */
const TWO_RETAILER_SAME_LEAF_EAN = '7798225221425';
/** Huevo en polvo Ovo Chef: category_path `/Huevos/`, un solo nivel → sin hoja. */
const NO_LEAF_EAN = '7798019960189';
/** Whiskas salmón 40g: hoja `Snacks para gatos`, exactamente 3 activos → 2 similares. */
const SPARSE_LEAF_EAN = '7797453973793';
/** Plato playo Caribe: marca Genérico, hoja `Vajilla` con 382 activos. */
const GENERIC_EAN = '7702484014278';
/** EAN con dígitos válidos (pasa normalizeEan) pero inexistente en el catálogo. */
const MISSING_EAN = '9999999999999';

interface Offer {
  retailer: string;
  listPrice: number | null;
  isAvailable: boolean;
}
interface SimilarProduct {
  ean: string;
  categoryPath: string | null;
  brand: string | null;
  retailers: Offer[];
}

/** Clave de orden del endpoint: el menor listPrice entre las ofertas vigentes. */
function minListPrice(p: SimilarProduct): number {
  const prices = p.retailers.map((r) => r.listPrice).filter((v): v is number => v !== null);
  return prices.length > 0 ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

function leafOf(path: string | null): string | null {
  if (!path) return null;
  const segments = path.split('/').filter((s) => s.length > 0);
  return segments.length >= 2 ? (segments[segments.length - 1] ?? null) : null;
}

async function similar(ean: string, query: Record<string, unknown> = {}) {
  return request(http()).get(`/products/${ean}/similar`).query(query);
}

async function leafFor(ean: string): Promise<string | null> {
  const res = await request(http()).get(`/products/${ean}`);
  expect(res.status).toBe(200);
  return leafOf(res.body.product.categoryPath);
}

describe('GET /products/:ean/similar', () => {
  it('devuelve 3 similares de la misma hoja, ordenados por precio ascendente', async () => {
    const res = await similar(MATCHED_EAN);
    expect(res.status).toBe(200);
    expect(res.body.region).toBe('olavarria');
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination).toEqual({ limit: 3, offset: 0, total: 3 });

    const expectedLeaf = await leafFor(MATCHED_EAN);
    const prices = res.body.data.map((p: SimilarProduct) => minListPrice(p));
    for (const [i, p] of (res.body.data as SimilarProduct[]).entries()) {
      expect(leafOf(p.categoryPath)).toBe(expectedLeaf);
      expect(p.ean).not.toBe(MATCHED_EAN);
      // Toda oferta devuelta es vigente: sin ninguna, el producto es huérfano y no entra.
      expect(p.retailers.length).toBeGreaterThan(0);
      if (i > 0) expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('si el original está en una sola cadena, los similares están en esa misma cadena', async () => {
    const detail = await request(http()).get(`/products/${SINGLE_RETAILER_EAN}`);
    expect(detail.status).toBe(200);
    const slugs = detail.body.product.retailers.map((r: Offer) => r.retailer);
    // Precondición del caso: si el scraper suma la otra cadena, el test deja de medir esto.
    expect(slugs).toHaveLength(1);
    const only = slugs[0];

    const res = await similar(SINGLE_RETAILER_EAN, { limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data as SimilarProduct[]) {
      expect(p.retailers.map((r) => r.retailer)).toContain(only);
    }
  });

  it('un huérfano regional trae similares y no filtra por cadena', async () => {
    const detail = await request(http()).get(`/products/${ORPHAN_EAN}`);
    expect(detail.status).toBe(200);
    expect(detail.body.product.retailers).toEqual([]);

    const res = await similar(ORPHAN_EAN, { limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const expectedLeaf = leafOf(detail.body.product.categoryPath);
    for (const p of res.body.data as SimilarProduct[]) {
      expect(leafOf(p.categoryPath)).toBe(expectedLeaf);
    }
    // Sin filtro de cadena: el resultado tiene que ser el mismo universo ordenado
    // que ve un producto con ofertas en ambas cadenas (que tampoco filtra), y no
    // un subconjunto. Cada lista excluye su propio EAN, así que se compara después
    // de sacar el ajeno. Comparar contra "aparecen las dos cadenas" no serviría:
    // los 20 más baratos de una hoja pueden ser todos de la misma cadena por
    // casualidad, y el test pasaría o fallaría según los precios del día.
    const control = await similar(TWO_RETAILER_SAME_LEAF_EAN, { limit: 20 });
    expect(control.status).toBe(200);
    const eansOf = (r: { body: { data: SimilarProduct[] } }, exclude: string) =>
      r.body.data.map((p) => p.ean).filter((e) => e !== exclude);
    const fromOrphan = eansOf(res, TWO_RETAILER_SAME_LEAF_EAN);
    const fromControl = eansOf(control, ORPHAN_EAN);
    const common = Math.min(fromOrphan.length, fromControl.length);
    expect(common).toBeGreaterThan(0);
    expect(fromOrphan.slice(0, common)).toEqual(fromControl.slice(0, common));
  });

  it('un producto sin sub-categoría devuelve lista vacía con 200, no 500', async () => {
    const detail = await request(http()).get(`/products/${NO_LEAF_EAN}`);
    expect(detail.status).toBe(200);
    expect(leafOf(detail.body.product.categoryPath)).toBeNull();

    const res = await similar(NO_LEAF_EAN);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    expect(res.body.region).toBe('olavarria');
  });

  it('si hay menos similares que el limit, devuelve los que hay', async () => {
    const res = await similar(SPARSE_LEAF_EAN);
    expect(res.status).toBe(200);
    // La hoja tiene 3 productos activos: el original + 2.
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.limit).toBe(3);
  });

  it('404 si el EAN no existe', async () => {
    const res = await similar(MISSING_EAN);
    expect(res.status).toBe(404);
  });

  it('un producto Genérico trae similares por sub-categoría, sin excepción especial', async () => {
    const detail = await request(http()).get(`/products/${GENERIC_EAN}`);
    expect(detail.status).toBe(200);
    expect(detail.body.product.brand).toMatch(/gen[eé]rico/i);

    const res = await similar(GENERIC_EAN);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const expectedLeaf = leafOf(detail.body.product.categoryPath);
    for (const p of res.body.data as SimilarProduct[]) {
      expect(leafOf(p.categoryPath)).toBe(expectedLeaf);
    }
  });

  describe('query param limit', () => {
    it('limit=1 devuelve un solo producto', async () => {
      const res = await similar(MATCHED_EAN, { limit: 1 });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ limit: 1, offset: 0, total: 1 });
    });

    it('limit=20 devuelve hasta 20 en una hoja poblada', async () => {
      const res = await similar(MATCHED_EAN, { limit: 20 });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(20);
      expect(res.body.pagination.total).toBe(20);
    });

    it('limit fuera de rango (0, negativo, >20, no numérico) es 400', async () => {
      for (const limit of [0, -1, 21, 'tres']) {
        const res = await similar(MATCHED_EAN, { limit });
        expect(res.status, `limit=${limit}`).toBe(400);
      }
    });

    it('el limit=1 es el primero del orden por precio, no uno cualquiera', async () => {
      const [one, three] = await Promise.all([
        similar(MATCHED_EAN, { limit: 1 }),
        similar(MATCHED_EAN, { limit: 3 }),
      ]);
      expect(one.body.data[0].ean).toBe(three.body.data[0].ean);
    });
  });
});
