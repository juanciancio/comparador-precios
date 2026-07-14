import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

const haystack = (p: { name: string; brand: string | null }): string =>
  `${p.name} ${p.brand ?? ''}`.toLowerCase();

describe('GET /search', () => {
  it('q=coca devuelve resultados, todos con "coca" en name o brand', async () => {
    const res = await request(http()).get('/search').query({ q: 'coca' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(haystack(p)).toContain('coca');
  });

  it('multi-término (AND): "motorola g67" matchea ambos términos', async () => {
    const res = await request(http()).get('/search').query({ q: 'motorola g67' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      const h = haystack(p);
      expect(h).toContain('motorola');
      expect(h).toContain('g67');
    }
  });

  it('only_matched=true → todos matched: true', async () => {
    const res = await request(http())
      .get('/search')
      .query({ q: 'motorola g67', only_matched: 'true' });
    expect(res.status).toBe(200);
    for (const p of res.body.data) expect(p.matched).toBe(true);
  });

  it('400 sin q', async () => {
    const res = await request(http()).get('/search');
    expect(res.status).toBe(400);
  });

  it('400 con q de 1 char (min 2)', async () => {
    const res = await request(http()).get('/search').query({ q: 'a' });
    expect(res.status).toBe(400);
  });

  it('200 con array vacío si no hay matches', async () => {
    const res = await request(http()).get('/search').query({ q: 'xxxxxxxxxxx' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});
