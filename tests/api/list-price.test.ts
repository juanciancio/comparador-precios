import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { db } from '../../src/lib/db.ts';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

interface Offer {
  retailer: string;
  price: number;
  listPrice: number | null;
  hasPromo: boolean;
  promoDescription: string | null;
  isAvailable: boolean;
}

interface Product {
  ean: string;
  retailers: Offer[];
}

/**
 * `listPrice` ya estaba en el contrato de estos endpoints desde Fase 3.A (vive en
 * RetailerOfferSchema); lo que faltaba era que el frontend lo consumiera. Estos
 * tests lo fijan como contrato para que no se caiga por accidente, y verifican el
 * invariante nuevo de has_promo. El caso de /compare (donde el campo SÍ es nuevo)
 * vive en compare.test.ts.
 */
const offersOf = (products: Product[]): Offer[] => products.flatMap((p) => p.retailers);

describe('listPrice en el catálogo', () => {
  it('GET /products expone listPrice poblado en toda oferta vigente', async () => {
    const res = await request(http()).get('/products').query({ limit: 50 });
    expect(res.status).toBe(200);
    const offers = offersOf(res.body.data);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      expect(o.listPrice).not.toBeNull();
      expect(typeof o.listPrice).toBe('number');
    }
  });

  it('GET /search expone listPrice poblado', async () => {
    const res = await request(http()).get('/search').query({ q: 'leche', limit: 30 });
    expect(res.status).toBe(200);
    const offers = offersOf(res.body.data);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) expect(o.listPrice).not.toBeNull();
  });

  it('GET /products/recent-changes expone listPrice poblado', async () => {
    const res = await request(http()).get('/products/recent-changes').query({ limit: 8 });
    expect(res.status).toBe(200);
    for (const o of offersOf(res.body.data)) expect(o.listPrice).not.toBeNull();
  });

  it('GET /products/:ean y su price-history exponen listPrice', async () => {
    // only_matched=true garantiza oferta vigente en ambas cadenas. Sin eso el
    // primer producto del listado puede ser uno huérfano —sin ninguna oferta
    // vigente en la región— y el price-history vendría vacío. Ver "productos
    // huérfanos" en NEXT_SESSION.md.
    const list = await request(http())
      .get('/products')
      .query({ limit: 1, only_matched: true });
    const ean = (list.body.data as Product[])[0]!.ean;

    const detail = await request(http()).get(`/products/${ean}`);
    expect(detail.status).toBe(200);
    for (const o of detail.body.product.retailers as Offer[]) expect(o.listPrice).not.toBeNull();

    const history = await request(http()).get(`/products/${ean}/price-history`);
    expect(history.status).toBe(200);
    expect(history.body.history.length).toBeGreaterThan(0);
    for (const h of history.body.history as Offer[]) {
      expect(h).toHaveProperty('listPrice');
      expect(h.listPrice).not.toBeNull();
    }
  });

  it('el precio de lista nunca está por debajo del efectivo', async () => {
    const res = await request(http()).get('/products').query({ limit: 100 });
    expect(res.status).toBe(200);
    for (const o of offersOf(res.body.data)) {
      if (o.listPrice !== null) expect(o.listPrice).toBeGreaterThanOrEqual(o.price);
    }
  });
});

describe('invariante de has_promo sobre datos frescos', () => {
  /**
   * has_promo === (list_price > price) vale sobre las filas que el scraper YA
   * reescribió con la semántica nueva. Se acota a `is_available` porque las filas
   * de productos que desaparecieron del catálogo conservan su estado viejo hasta
   * que el reaping las cierre: no son datos frescos y no las gobierna el invariante.
   * Ver docs/NEXT_SESSION.md → ventana de inconsistencia post-deploy.
   */
  it('no hay filas vigentes y disponibles que violen has_promo === (list_price > price)', async () => {
    const sql = db();
    const rows = await sql<{ violations: number }[]>`
      SELECT COUNT(*)::int AS violations
      FROM price_history
      WHERE valid_to IS NULL
        AND is_available
        AND has_promo IS DISTINCT FROM (list_price > price)
    `;
    expect(rows[0]!.violations).toBe(0);
  });

  it('la API refleja el invariante: hasPromo solo donde listPrice > price', async () => {
    const res = await request(http()).get('/products').query({ limit: 100 });
    expect(res.status).toBe(200);
    for (const o of offersOf(res.body.data)) {
      if (!o.isAvailable) continue;
      expect(o.hasPromo).toBe((o.listPrice ?? 0) > o.price);
    }
  });
});

describe('canarios de la captura de descuentos (datos reales)', () => {
  it('existen productos con list_price > price en ambas cadenas', async () => {
    const sql = db();
    const rows = await sql<{ slug: string; with_discount: number }[]>`
      SELECT r.slug, COUNT(*)::int AS with_discount
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND ph.list_price > ph.price
      GROUP BY r.slug
    `;
    const byRetailer = new Map(rows.map((r) => [r.slug, r.with_discount]));
    expect(byRetailer.get('carrefour') ?? 0).toBeGreaterThan(0);
    expect(byRetailer.get('masonline') ?? 0).toBeGreaterThan(0);
  });

  it('promo_description quedó poblado en Carrefour (el bug de backing fields está muerto)', async () => {
    // Antes del fix: 0 filas de 47.358. Es el canario de que joinVtexNames lee la
    // serialización real de VTEX y no un formato que VTEX nunca manda.
    const sql = db();
    const rows = await sql<{ populated: number }[]>`
      SELECT COUNT(*)::int AS populated
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL
        AND r.slug = 'carrefour'
        AND ph.promo_description IS NOT NULL
    `;
    expect(rows[0]!.populated).toBeGreaterThan(0);
  });

  it('discount_highlight se está capturando en Carrefour', async () => {
    const sql = db();
    const rows = await sql<{ captured: number }[]>`
      SELECT COUNT(*)::int AS captured
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL
        AND r.slug = 'carrefour'
        AND ph.discount_highlight IS NOT NULL
    `;
    expect(rows[0]!.captured).toBeGreaterThan(0);
  });
});
