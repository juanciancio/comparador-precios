import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';
import { db } from '../../src/lib/db.ts';
import { ACTIVE_REGION } from '../../src/api/config/region.ts';

const http = useTestApp();

/**
 * Región sintética para probar el aislamiento. No la scrapea nadie: se inserta a
 * mano, se verifica que ningún endpoint la devuelva, y se borra.
 */
const OTHER_REGION = '__test_region__';

/** Precio absurdo: si se filtra a alguna respuesta, se nota. */
const SENTINEL_PRICE = 999_999.99;

let testEan: string | null = null;
let retailerId: number | null = null;

beforeAll(async () => {
  const sql = db();
  // Un EAN que ya tenga oferta vigente en la región activa: así los asserts
  // comparan "la fila real" contra "la fila plantada", no contra la nada.
  const rows = await sql<{ ean: string; retailer_id: number }[]>`
    SELECT ean, retailer_id FROM price_history
    WHERE region_id = ${ACTIVE_REGION} AND valid_to IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return; // sin datos cargados, los tests se skipean solos abajo
  testEan = row.ean;
  retailerId = row.retailer_id;

  await sql`
    INSERT INTO price_history
      (retailer_id, ean, region_id, valid_from, valid_to, price, list_price,
       has_promo, is_available)
    VALUES
      (${row.retailer_id}, ${row.ean}, ${OTHER_REGION}, CURRENT_DATE, NULL,
       ${SENTINEL_PRICE}, ${SENTINEL_PRICE}, false, true)
  `;
  await sql`
    INSERT INTO retailer_products
      (retailer_id, ean, region_id, sku_id_retailer, product_id_retailer, is_available)
    VALUES
      (${row.retailer_id}, ${row.ean}, ${OTHER_REGION}, ${'test-sku'}, ${'test-pid'}, true)
  `;
});

afterAll(async () => {
  const sql = db();
  await sql`DELETE FROM price_history WHERE region_id = ${OTHER_REGION}`;
  await sql`DELETE FROM retailer_products WHERE region_id = ${OTHER_REGION}`;
});

describe('region en el top-level de las respuestas con precios', () => {
  it('GET /products', async () => {
    const res = await request(http()).get('/products?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });

  it('GET /products/recent-changes', async () => {
    const res = await request(http()).get('/products/recent-changes?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });

  it('GET /products/:ean', async () => {
    if (!testEan) return;
    const res = await request(http()).get(`/products/${testEan}`);
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
    // El producto va anidado: `region` describe la respuesta, no al producto.
    expect(res.body.product.ean).toBe(testEan);
  });

  it('GET /products/:ean/price-history', async () => {
    if (!testEan) return;
    const res = await request(http()).get(`/products/${testEan}/price-history`);
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });

  it('POST /products/:ean/refresh', async () => {
    if (!testEan) return;
    // El controller fija @HttpCode(OK): el refresh no crea un recurso.
    const res = await request(http()).post(`/products/${testEan}/refresh`);
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });

  it('GET /search', async () => {
    const res = await request(http()).get('/search?q=aceite&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });

  it('GET /compare', async () => {
    const res = await request(http()).get('/compare?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });

  it('GET /compare/stats', async () => {
    const res = await request(http()).get('/compare/stats');
    expect(res.status).toBe(200);
    expect(res.body.region).toBe(ACTIVE_REGION);
  });
});

describe('endpoints sin precios no declaran región', () => {
  // No es cosmética: si /categories o /brands empezaran a decir "olavarria",
  // estarían afirmando que su contenido es regional, y no lo es.
  it.each(['/health', '/categories', '/brands?limit=1', '/search/facets?q=aceite'])(
    '%s no devuelve region',
    async (path) => {
      const res = await request(http()).get(path);
      expect(res.status).toBe(200);
      expect(res.body.region).toBeUndefined();
    },
  );
});

describe('aislamiento regional', () => {
  it('la PK compuesta permite el mismo (retailer, ean) en dos regiones', async () => {
    if (!testEan) return;
    const sql = db();
    // Si la PK no incluyera region_id, el INSERT del beforeAll habría explotado
    // con unique violation y este test ni correría. Que existan las dos filas es
    // la evidencia positiva.
    const rows = await sql<{ region_id: string }[]>`
      SELECT region_id FROM price_history
      WHERE retailer_id = ${retailerId!} AND ean = ${testEan} AND valid_to IS NULL
      ORDER BY region_id
    `;
    const regionsFound = rows.map((r) => r.region_id);
    expect(regionsFound).toContain(ACTIVE_REGION);
    expect(regionsFound).toContain(OTHER_REGION);
  });

  it('el detalle del producto no muestra ofertas de otra región', async () => {
    if (!testEan) return;
    const res = await request(http()).get(`/products/${testEan}`);
    expect(res.status).toBe(200);
    const prices = (res.body.product.retailers as { price: number }[]).map((o) => o.price);
    expect(prices).not.toContain(SENTINEL_PRICE);
  });

  it('el historial no mezcla vigencias de otra región', async () => {
    if (!testEan) return;
    const res = await request(http()).get(`/products/${testEan}/price-history`);
    expect(res.status).toBe(200);
    const prices = (res.body.history as { price: number }[]).map((e) => e.price);
    expect(prices).not.toContain(SENTINEL_PRICE);
  });

  it('only_matched no cuenta la misma cadena dos veces por venir de dos regiones', async () => {
    if (!testEan) return;
    // Este es el modo de falla concreto de olvidar el filtro: la subquery de
    // only_matched cuenta ofertas vigentes por EAN y exige >= 2. Con la fila
    // plantada, un producto de UNA sola cadena llegaría a 2 y aparecería como
    // "matcheado" en ambas. Se verifica que el matched del detalle no se infle.
    const sql = db();
    const distinct = await sql<{ n: number }[]>`
      SELECT COUNT(DISTINCT retailer_id)::int AS n FROM price_history
      WHERE ean = ${testEan} AND region_id = ${ACTIVE_REGION}
        AND valid_to IS NULL AND is_available
    `;
    const res = await request(http()).get(`/products/${testEan}`);
    expect(res.body.product.matched).toBe(distinct[0]!.n >= 2);
  });
});
