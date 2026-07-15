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

  it('brand repetido filtra por varias marcas (mismo ListFilters que /products)', async () => {
    const res = await request(http())
      .get('/search')
      .query({ q: 'aceite', brand: ['Natura', 'Cocinero'], limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(['Natura', 'Cocinero']).toContain(p.brand);
  });

  it('brand único sigue funcionando (backwards compat)', async () => {
    const res = await request(http())
      .get('/search')
      .query({ q: 'aceite', brand: 'Natura', limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.brand).toBe('Natura');
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

  // El orden lo resuelve listProducts (mismo repo que /products); acá se cubre
  // que el query param llegue hasta el ORDER BY y no quede hardcodeado.
  describe('sort_by / sort_dir', () => {
    it('sort_by=name&sort_dir=asc ordena alfabéticamente', async () => {
      const res = await request(http())
        .get('/search')
        .query({ q: 'aceite', limit: 20, sort_by: 'name', sort_dir: 'asc' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(1);
      const names: string[] = res.body.data.map((p: { name: string }) => p.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    });

    it('sort_by=name&sort_dir=desc invierte el orden', async () => {
      const asc = await request(http())
        .get('/search')
        .query({ q: 'aceite', limit: 20, sort_by: 'name', sort_dir: 'asc' });
      const desc = await request(http())
        .get('/search')
        .query({ q: 'aceite', limit: 20, sort_by: 'name', sort_dir: 'desc' });
      expect(desc.status).toBe(200);
      const ascNames = asc.body.data.map((p: { name: string }) => p.name);
      const descNames = desc.body.data.map((p: { name: string }) => p.name);
      expect(descNames).not.toEqual(ascNames);
      expect(descNames[0]).not.toBe(ascNames[0]);
    });

    it('sort_by=last_seen&sort_dir=desc ordena por lastSeenAt descendente', async () => {
      const res = await request(http())
        .get('/search')
        .query({ q: 'aceite', limit: 20, sort_by: 'last_seen', sort_dir: 'desc' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(1);
      const seen: number[] = res.body.data.map((p: { lastSeenAt: string }) =>
        new Date(p.lastSeenAt).getTime(),
      );
      for (let i = 1; i < seen.length; i++) {
        expect(seen[i - 1]).toBeGreaterThanOrEqual(seen[i]!);
      }
    });

    it('sin sort_by usa el default: mismo resultado que sort_by=name&sort_dir=asc', async () => {
      const def = await request(http()).get('/search').query({ q: 'aceite', limit: 10 });
      const explicit = await request(http())
        .get('/search')
        .query({ q: 'aceite', limit: 10, sort_by: 'name', sort_dir: 'asc' });
      expect(def.status).toBe(200);
      expect(def.body.data.map((p: { ean: string }) => p.ean)).toEqual(
        explicit.body.data.map((p: { ean: string }) => p.ean),
      );
    });

    it('400 con sort_by inválido', async () => {
      const res = await request(http())
        .get('/search')
        .query({ q: 'aceite', sort_by: 'price' });
      expect(res.status).toBe(400);
    });

    it('400 con sort_dir inválido', async () => {
      const res = await request(http())
        .get('/search')
        .query({ q: 'aceite', sort_dir: 'sideways' });
      expect(res.status).toBe(400);
    });
  });

  // /search comparte ListFilters con /products, así que el filtro es el mismo
  // código; se cubre acá que esté cableado, no la semántica (ya cubierta allá).
  describe('category_top', () => {
    it('acota la búsqueda al departamento exacto', async () => {
      const res = await request(http())
        .get('/search')
        .query({ q: 'limpiador', category_top: 'Limpieza', limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p.categoryPath?.startsWith('/Limpieza/')).toBe(true);
      }
    });

    it('multi-valor: no devuelve departamentos fuera de la lista', async () => {
      const res = await request(http())
        .get('/search')
        .query({ q: 'limpiador', category_top: ['Limpieza', 'Automotor'], limit: 50 });
      expect(res.status).toBe(200);
      for (const p of res.body.data) {
        const top = p.categoryPath?.split('/')[1];
        expect(['Limpieza', 'Automotor']).toContain(top);
      }
    });

    it('400 con category_top vacío', async () => {
      const res = await request(http()).get('/search').query({ q: 'aceite', category_top: '' });
      expect(res.status).toBe(400);
    });
  });
});
