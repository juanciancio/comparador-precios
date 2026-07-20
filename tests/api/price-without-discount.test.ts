import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { db } from '../../src/lib/db.ts';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

interface Offer {
  retailer: string;
  price: number;
  listPrice: number | null;
  priceWithoutDiscount: number | null;
  hasMiCrfDiscount: boolean;
  isAvailable: boolean;
}
interface Product {
  ean: string;
  retailers: Offer[];
}

/**
 * `priceWithoutDiscount` es el precio base sin el descuento ya aplicado a `price`.
 * En Carrefour es el no-socio (quien no tiene Mi Crf); `price` es el de socio. El
 * schema Zod ya lo parseaba (vtex-product.ts:31) pero lo tirábamos; la migración 008
 * lo persiste y estos endpoints lo exponen. Ver research/mi-crf-precio-capturado.
 *
 * VENTANA DE TRANSICIÓN: sin retro-poblado. Las filas previas al deploy quedan en
 * NULL hasta que el scraper reobserve cada producto (24-48hs). Por eso estos tests
 * fijan el CONTRATO (campo presente, nullable) y verifican invariantes solo sobre
 * las filas ya pobladas, no exigen poblado del 100% como hace list-price.test.ts.
 */
const offersOf = (products: Product[]): Offer[] => products.flatMap((p) => p.retailers);

describe('priceWithoutDiscount — contrato en el catálogo', () => {
  it('GET /products incluye priceWithoutDiscount (nullable) en toda oferta', async () => {
    const res = await request(http()).get('/products').query({ limit: 50 });
    expect(res.status).toBe(200);
    const offers = offersOf(res.body.data);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      expect(o).toHaveProperty('priceWithoutDiscount');
      if (o.priceWithoutDiscount !== null) expect(typeof o.priceWithoutDiscount).toBe('number');
    }
  });

  it('GET /search incluye priceWithoutDiscount', async () => {
    const res = await request(http()).get('/search').query({ q: 'leche', limit: 30 });
    expect(res.status).toBe(200);
    for (const o of offersOf(res.body.data)) expect(o).toHaveProperty('priceWithoutDiscount');
  });

  it('GET /products/recent-changes incluye priceWithoutDiscount', async () => {
    const res = await request(http()).get('/products/recent-changes').query({ limit: 8 });
    expect(res.status).toBe(200);
    for (const o of offersOf(res.body.data)) expect(o).toHaveProperty('priceWithoutDiscount');
  });

  it('GET /products/:ean y su price-history incluyen priceWithoutDiscount', async () => {
    const list = await request(http()).get('/products').query({ limit: 1 });
    const ean = (list.body.data as Product[])[0]!.ean;

    const detail = await request(http()).get(`/products/${ean}`);
    expect(detail.status).toBe(200);
    for (const o of detail.body.product.retailers as Offer[])
      expect(o).toHaveProperty('priceWithoutDiscount');

    const history = await request(http()).get(`/products/${ean}/price-history`);
    expect(history.status).toBe(200);
    expect(history.body.history.length).toBeGreaterThan(0);
    for (const h of history.body.history) expect(h).toHaveProperty('priceWithoutDiscount');
  });

  it('GET /compare incluye *_price_without_discount de ambas cadenas (nullable)', async () => {
    const res = await request(http()).get('/compare').query({ limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const r of res.body.data) {
      expect(r).toHaveProperty('masonline_price_without_discount');
      expect(r).toHaveProperty('carrefour_price_without_discount');
    }
  });
});

describe('priceWithoutDiscount — invariantes sobre datos poblados', () => {
  /**
   * El invariante duro del diseño: en la familia Mi Crf (discount_highlight no-NULL
   * en Carrefour), el precio de socio nunca supera al no-socio, y el no-socio nunca
   * supera al de lista. price ≤ price_without_discount ≤ list_price, 100% de filas.
   * Se acota a las YA pobladas (ventana de transición). Si alguna viola, el EAN sale
   * en el mensaje — es un caso que la investigación no anticipó.
   */
  it('familia Mi Crf: price ≤ price_without_discount ≤ list_price (0 violaciones)', async () => {
    const sql = db();
    const rows = await sql<{ ean: string; price: string; pwd: string; list_price: string | null }[]>`
      SELECT ph.ean, ph.price::text AS price, ph.price_without_discount::text AS pwd,
             ph.list_price::text AS list_price
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND r.slug = 'carrefour'
        AND ph.discount_highlight IS NOT NULL
        AND ph.price_without_discount IS NOT NULL
    `;
    expect(rows.length).toBeGreaterThan(0); // canario: la captura post-migración está poblando Mi Crf
    const violations = rows.filter((r) => {
      const price = Number(r.price);
      const pwd = Number(r.pwd);
      const list = r.list_price !== null ? Number(r.list_price) : null;
      return !(price <= pwd + 0.01 && (list === null || pwd <= list + 0.01));
    });
    expect(violations.map((v) => v.ean)).toEqual([]);
  });

  it('familia Mi Crf: el no-socio es estrictamente mayor al socio (el descuento existe)', async () => {
    // Canario de que price_without_discount NO es un espejo de price: en la familia
    // con descuento aplicado, el no-socio paga más. Si esto da 0, o dejamos de capturar
    // el campo o VTEX dejó de aplicar Mi Crf: en ambos casos queremos enterarnos acá.
    const sql = db();
    const rows = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND r.slug = 'carrefour'
        AND ph.discount_highlight IS NOT NULL
        AND ph.price_without_discount IS NOT NULL
        AND ph.price_without_discount > ph.price
    `;
    expect(rows[0]!.n).toBeGreaterThan(0);
  });

  it('Masonline: donde está poblado, price_without_discount == price (no tiene Mi Crf)', async () => {
    // Masonline no expone descuentos condicionales: su PriceWithoutDiscount coincide
    // con Price. Verificado empíricamente en la investigación previa. Si divergiera,
    // no tocamos la lógica (capturamos el dato tal cual viene) — pero queremos saberlo.
    const sql = db();
    const rows = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND r.slug = 'masonline'
        AND ph.price_without_discount IS NOT NULL
        AND ph.price_without_discount <> ph.price
    `;
    expect(rows[0]!.n).toBe(0);
  });

  it('la API refleja el invariante: donde priceWithoutDiscount está, price ≤ pwd', async () => {
    const res = await request(http()).get('/compare').query({ limit: 100 });
    expect(res.status).toBe(200);
    for (const r of res.body.data) {
      if (r.carrefour_price_without_discount !== null) {
        expect(r.carrefour_price_without_discount).toBeGreaterThanOrEqual(r.carrefour_price);
      }
      if (r.masonline_price_without_discount !== null) {
        expect(r.masonline_price_without_discount).toBeGreaterThanOrEqual(r.masonline_price);
      }
    }
  });
});

/**
 * `hasMiCrfDiscount`: trigger del tratamiento visual Mi Crf. Derivado en el backend de
 * discount_highlight (src/lib/mi-crf.ts) para que el frontend no parsee el string opaco
 * del retailer. A diferencia de priceWithoutDiscount, NO sufre ventana de transición:
 * discount_highlight ya está 100% poblado desde el fix de Teasers, así que el flag es
 * fiel desde el deploy.
 */
describe('hasMiCrfDiscount — flag derivado de discount_highlight', () => {
  it('el pattern parte el universo: familia Mi Crf (~455) vs promos generales (~2557)', async () => {
    // Canario de que el flag NO es "tiene discount_highlight": de las ~3.012 filas con
    // highlight, solo ~455 son Mi Crf; el resto son promos "-Reg-" que deben dar false.
    const sql = db();
    const rows = await sql<{ mi_crf: number; other_highlight: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE ph.discount_highlight ILIKE '%mi crf%')::int AS mi_crf,
        COUNT(*) FILTER (WHERE ph.discount_highlight IS NOT NULL
                          AND ph.discount_highlight NOT ILIKE '%mi crf%')::int AS other_highlight
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND r.slug = 'carrefour'
    `;
    expect(rows[0]!.mi_crf).toBeGreaterThan(400);
    expect(rows[0]!.other_highlight).toBeGreaterThan(2000);
  });

  it('GET /products: hasMiCrfDiscount es boolean no-null; true solo en Carrefour', async () => {
    const res = await request(http()).get('/products').query({ limit: 100 });
    expect(res.status).toBe(200);
    for (const o of offersOf(res.body.data)) {
      expect(typeof o.hasMiCrfDiscount).toBe('boolean');
      if (o.retailer === 'masonline') expect(o.hasMiCrfDiscount).toBe(false);
      if (o.hasMiCrfDiscount) expect(o.retailer).toBe('carrefour');
    }
  });

  it('un EAN de familia Mi Crf reporta hasMiCrfDiscount=true en su oferta Carrefour', async () => {
    const sql = db();
    const picked = await sql<{ ean: string }[]>`
      SELECT ph.ean
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND r.slug = 'carrefour'
        AND ph.discount_highlight ILIKE '%mi crf%'
      ORDER BY ph.ean LIMIT 1
    `;
    expect(picked.length).toBe(1);
    const res = await request(http()).get(`/products/${picked[0]!.ean}`);
    expect(res.status).toBe(200);
    const carrefour = (res.body.product.retailers as Offer[]).find(
      (o) => o.retailer === 'carrefour',
    );
    expect(carrefour?.hasMiCrfDiscount).toBe(true);
  });

  it('un EAN con discount_highlight NO-Mi-Crf reporta hasMiCrfDiscount=false', async () => {
    // El flag distingue Mi Crf de las promos "-Reg-" generales: ambas tienen highlight.
    const sql = db();
    const picked = await sql<{ ean: string }[]>`
      SELECT ph.ean
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND r.slug = 'carrefour'
        AND ph.discount_highlight IS NOT NULL
        AND ph.discount_highlight NOT ILIKE '%mi crf%'
      ORDER BY ph.ean LIMIT 1
    `;
    expect(picked.length).toBe(1);
    const res = await request(http()).get(`/products/${picked[0]!.ean}`);
    expect(res.status).toBe(200);
    const carrefour = (res.body.product.retailers as Offer[]).find(
      (o) => o.retailer === 'carrefour',
    );
    expect(carrefour?.hasMiCrfDiscount).toBe(false);
  });

  it('price-history incluye hasMiCrfDiscount boolean', async () => {
    const list = await request(http()).get('/products').query({ limit: 1 });
    const ean = (list.body.data as Product[])[0]!.ean;
    const history = await request(http()).get(`/products/${ean}/price-history`);
    expect(history.status).toBe(200);
    expect(history.body.history.length).toBeGreaterThan(0);
    for (const h of history.body.history) expect(typeof h.hasMiCrfDiscount).toBe('boolean');
  });

  it('GET /compare: carrefour flag boolean; masonline_has_mi_crf_discount siempre false', async () => {
    const res = await request(http()).get('/compare').query({ limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const r of res.body.data) {
      expect(typeof r.carrefour_has_mi_crf_discount).toBe('boolean');
      expect(r.masonline_has_mi_crf_discount).toBe(false);
    }
  });
});
