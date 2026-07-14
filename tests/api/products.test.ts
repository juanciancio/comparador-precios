import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

// EAN real presente en ambas cadenas (Motorola Moto G67). Ver descubrimientos.
const KNOWN_EAN = '7790894902018';

/** Monotonía tolerante a mayúsculas/acentos (la collation de PG no matchea JS exacto). */
function isNonDecreasing(names: string[]): boolean {
  for (let i = 1; i < names.length; i++) {
    if (names[i - 1]!.localeCompare(names[i]!, 'es', { sensitivity: 'base' }) > 0) return false;
  }
  return true;
}

describe('GET /products', () => {
  it('pagina (limit + offset) y el total no varía entre páginas', async () => {
    const p1 = await request(http()).get('/products').query({ limit: 5, offset: 0 });
    const p2 = await request(http()).get('/products').query({ limit: 5, offset: 5 });
    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    expect(p1.body.data).toHaveLength(5);
    expect(p2.body.data).toHaveLength(5);
    expect(p1.body.pagination.total).toBe(p2.body.pagination.total);
    // Páginas disjuntas: ningún EAN se repite entre offset 0 y 5.
    const eans1 = new Set(p1.body.data.map((p: { ean: string }) => p.ean));
    const overlap = p2.body.data.filter((p: { ean: string }) => eans1.has(p.ean));
    expect(overlap).toHaveLength(0);
  });

  it('filtra por brand exacto', async () => {
    const res = await request(http()).get('/products').query({ brand: 'La Serenísima', limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.brand).toBe('La Serenísima');
  });

  it('filtra por category (substring case-insensitive)', async () => {
    const res = await request(http()).get('/products').query({ category: 'bebidas', limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      expect(p.categoryPath?.toLowerCase()).toContain('bebidas');
    }
  });

  it('only_matched=true devuelve solo productos con matched: true', async () => {
    const res = await request(http()).get('/products').query({ only_matched: 'true', limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.matched).toBe(true);
  });

  it('sort_by=name&sort_dir=asc ordena alfabéticamente', async () => {
    const asc = await request(http())
      .get('/products')
      .query({ brand: 'La Serenísima', sort_by: 'name', sort_dir: 'asc', limit: 30 });
    expect(asc.status).toBe(200);
    const names = asc.body.data.map((p: { name: string }) => p.name);
    expect(isNonDecreasing(names)).toBe(true);
    // La dirección se honra: desc arranca distinto que asc.
    const desc = await request(http())
      .get('/products')
      .query({ brand: 'La Serenísima', sort_by: 'name', sort_dir: 'desc', limit: 30 });
    expect(desc.body.data[0].name).not.toBe(asc.body.data[0].name);
  });
});

describe('GET /products/:ean', () => {
  it('devuelve el producto con EAN válido', async () => {
    const res = await request(http()).get(`/products/${KNOWN_EAN}`);
    expect(res.status).toBe(200);
    expect(res.body.ean).toBe(KNOWN_EAN);
    expect(Array.isArray(res.body.retailers)).toBe(true);
  });

  it('normaliza el EAN con padding de ceros', async () => {
    const res = await request(http()).get(`/products/0${KNOWN_EAN}`);
    expect(res.status).toBe(200);
    // El EAN en la respuesta viene canónico (sin el cero de padding).
    expect(res.body.ean).toBe(KNOWN_EAN);
  });

  it('404 con EAN inexistente', async () => {
    const res = await request(http()).get('/products/9999999999999');
    expect(res.status).toBe(404);
  });

  it('400 con EAN inválido (contiene letras)', async () => {
    const res = await request(http()).get('/products/abc123');
    expect(res.status).toBe(400);
  });
});

describe('GET /products/:ean/price-history', () => {
  it('devuelve un array de vigencias', async () => {
    const res = await request(http()).get(`/products/${KNOWN_EAN}/price-history`);
    expect(res.status).toBe(200);
    expect(res.body.ean).toBe(KNOWN_EAN);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThan(0);
  });

  it('filtra por retailer', async () => {
    const res = await request(http())
      .get(`/products/${KNOWN_EAN}/price-history`)
      .query({ retailer: 'masonline' });
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBeGreaterThan(0);
    for (const h of res.body.history) expect(h.retailer).toBe('masonline');
  });

  it('400 con retailer inválido', async () => {
    const res = await request(http())
      .get(`/products/${KNOWN_EAN}/price-history`)
      .query({ retailer: 'invalidx' });
    expect(res.status).toBe(400);
  });
});
