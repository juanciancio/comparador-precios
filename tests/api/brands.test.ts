import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

interface Brand {
  name: string;
  product_count: number;
  matched_count: number;
}

describe('GET /brands', () => {
  it('default: cada marca tiene product_count >= 5 (min_products default)', async () => {
    const res = await request(http()).get('/brands');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const b of res.body as Brand[]) expect(b.product_count).toBeGreaterThanOrEqual(5);
  });

  it('min_products=100 → todas con product_count >= 100', async () => {
    const res = await request(http()).get('/brands').query({ min_products: 100 });
    expect(res.status).toBe(200);
    for (const b of res.body as Brand[]) expect(b.product_count).toBeGreaterThanOrEqual(100);
  });

  it('limit=10 → a lo sumo 10 marcas', async () => {
    const res = await request(http()).get('/brands').query({ limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(10);
  });

  it('ordenado por product_count DESC', async () => {
    const res = await request(http()).get('/brands').query({ limit: 50 });
    const counts = (res.body as Brand[]).map((b) => b.product_count);
    for (let i = 1; i < counts.length; i++) expect(counts[i - 1]!).toBeGreaterThanOrEqual(counts[i]!);
  });

  it('Genérico/Generico: si aparece, matched_count = 0 (regla de negocio)', async () => {
    const res = await request(http()).get('/brands').query({ limit: 500 });
    expect(res.status).toBe(200);
    const generics = (res.body as Brand[]).filter((b) =>
      ['Genérico', 'Generico'].includes(b.name),
    );
    // Genérico tiene miles de productos, debería estar presente con limit alto.
    expect(generics.length).toBeGreaterThan(0);
    for (const g of generics) expect(g.matched_count).toBe(0);
  });

  it('marcas fragmentadas se fusionan: un solo Genérico, no dos entradas', async () => {
    const res = await request(http()).get('/brands').query({ limit: 500 });
    expect(res.status).toBe(200);
    const names = (res.body as Brand[]).map((b) => b.name);
    expect(names).toContain('Genérico');
    expect(names).not.toContain('Generico'); // fusionado en el canónico
    // Sin duplicados de display en toda la lista.
    expect(new Set(names).size).toBe(names.length);
  });
});
