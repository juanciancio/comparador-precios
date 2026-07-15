import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

interface Facet {
  name: string;
  count: number;
}
interface Product {
  brand: string | null;
}

const facets = async (query: Record<string, unknown>): Promise<Facet[]> => {
  const res = await request(http()).get('/search/facets').query(query);
  expect(res.status).toBe(200);
  return res.body.brands;
};

/**
 * Trae TODOS los productos de un scope paginando, y los cuenta por marca. Es el
 * cálculo de referencia con el que se contrastan los facets: si divergen, los
 * contadores del sidebar mienten respecto de la grilla.
 */
const countByBrandVia = async (
  path: '/search' | '/products',
  query: Record<string, unknown>,
): Promise<Map<string, number>> => {
  const counts = new Map<string, number>();
  let offset = 0;
  for (;;) {
    const res = await request(http())
      .get(path)
      .query({ ...query, limit: 100, offset });
    expect(res.status).toBe(200);
    const data: Product[] = res.body.data;
    for (const p of data) {
      if (p.brand === null) continue;
      counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    }
    offset += 100;
    if (offset >= res.body.pagination.total) break;
  }
  return counts;
};

const totalVia = async (
  path: '/search' | '/products',
  query: Record<string, unknown>,
): Promise<number> => {
  const res = await request(http())
    .get(path)
    .query({ ...query, limit: 1 });
  expect(res.status).toBe(200);
  return res.body.pagination.total;
};

const expectCountDesc = (brands: Facet[]): void => {
  for (let i = 1; i < brands.length; i++) {
    expect(brands[i - 1]!.count).toBeGreaterThanOrEqual(brands[i]!.count);
  }
};

describe('GET /search/facets', () => {
  it('sin filtros: top 10 marcas globales por count DESC', async () => {
    const brands = await facets({});
    expect(brands).toHaveLength(10);
    expectCountDesc(brands);
    for (const b of brands) {
      expect(typeof b.name).toBe('string');
      expect(b.count).toBeGreaterThan(0);
    }
  });

  it('default limit = 10, configurable hasta 50', async () => {
    expect(await facets({})).toHaveLength(10);
    expect((await facets({ limit: 3 })).length).toBe(3);
    expect((await facets({ limit: 50 })).length).toBeLessThanOrEqual(50);
  });

  it('400 con limit > 50', async () => {
    const res = await request(http()).get('/search/facets').query({ limit: 51 });
    expect(res.status).toBe(400);
  });

  it('400 con q de 1 char (mismo mínimo que /search)', async () => {
    const res = await request(http()).get('/search/facets').query({ q: 'a' });
    expect(res.status).toBe(400);
  });

  it('200 con brands vacío si el scope no matchea nada', async () => {
    expect(await facets({ q: 'xxxxxxxxxxx' })).toEqual([]);
  });

  // ─── Paridad de scope con /search y /products ──────────────────────────────

  it('q=leche: los counts coinciden con contar por marca sobre /search?q=leche', async () => {
    const brands = await facets({ q: 'leche', limit: 50 });
    const expected = await countByBrandVia('/search', { q: 'leche' });
    expect(brands.length).toBeGreaterThan(0);
    for (const b of brands) {
      expect(b.count, `marca ${b.name}`).toBe(expected.get(b.name));
    }
  });

  it('category_top=Almacén: los counts coinciden con /products?category_top=Almacén', async () => {
    const brands = await facets({ category_top: 'Almacén', limit: 50 });
    const expected = await countByBrandVia('/products', { category_top: 'Almacén' });
    expect(brands.length).toBeGreaterThan(0);
    for (const b of brands) {
      expect(b.count, `marca ${b.name}`).toBe(expected.get(b.name));
    }
  });

  it('category_top multi-valor: scope combinado (OR entre departamentos)', async () => {
    const tops = ['Limpieza', 'Accesorios De Limpieza'];
    const brands = await facets({ category_top: tops, limit: 50 });
    const expected = await countByBrandVia('/products', { category_top: tops });
    expect(brands.length).toBeGreaterThan(0);
    for (const b of brands) {
      expect(b.count, `marca ${b.name}`).toBe(expected.get(b.name));
    }

    // El combinado es estrictamente mayor que cada parte: si el multi-valor se
    // perdiera y solo aplicara el último, esto lo atrapa.
    const combined = await totalVia('/products', { category_top: tops });
    for (const top of tops) {
      expect(combined).toBeGreaterThan(await totalVia('/products', { category_top: top }));
    }
  });

  it('only_matched=true: acota el scope y coincide con /products?only_matched=true', async () => {
    const brands = await facets({ category_top: 'Almacén', only_matched: 'true', limit: 50 });
    const expected = await countByBrandVia('/products', {
      category_top: 'Almacén',
      only_matched: 'true',
    });
    expect(brands.length).toBeGreaterThan(0);
    for (const b of brands) {
      expect(b.count, `marca ${b.name}`).toBe(expected.get(b.name));
    }
  });

  // ─── Invariante crítica ────────────────────────────────────────────────────
  //
  // La suma de los counts de TODAS las marcas de un scope tiene que dar el total
  // de productos de ese scope. Es lo que garantiza que el sidebar no mienta
  // respecto de la grilla. Los scopes se eligen con <50 marcas para que entren
  // enteros en el limit máximo; el guard de abajo falla si dejan de entrar (o el
  // test estaría sumando una lista truncada y pasaría por casualidad).
  describe('invariante: suma de counts == total del scope', () => {
    const cases: { label: string; path: '/search' | '/products'; query: Record<string, unknown> }[] =
      [
        { label: 'q=yerba', path: '/search', query: { q: 'yerba' } },
        { label: 'category_top=Indumentaria', path: '/products', query: { category_top: 'Indumentaria' } },
        {
          label: 'q=yerba + category_top=Almacén',
          path: '/search',
          query: { q: 'yerba', category_top: 'Almacén' },
        },
        {
          label: 'category_top=Indumentaria + only_matched',
          path: '/products',
          query: { category_top: 'Indumentaria', only_matched: 'true' },
        },
      ];

    for (const { label, path, query } of cases) {
      it(label, async () => {
        const brands = await facets({ ...query, limit: 50 });
        expect(brands.length, 'scope truncado por el limit: el test no prueba nada').toBeLessThan(50);

        const sum = brands.reduce((acc, b) => acc + b.count, 0);
        expect(sum).toBe(await totalVia(path, query));
      });
    }
  });

  // ─── brand_query ───────────────────────────────────────────────────────────

  describe('brand_query', () => {
    it('solo devuelve marcas que matchean el texto (case-insensitive)', async () => {
      const brands = await facets({ brand_query: 'ser', limit: 50 });
      expect(brands.length).toBeGreaterThan(0);
      for (const b of brands) expect(b.name.toLowerCase()).toContain('ser');
    });

    it('los prefix-match van primero, después los substring', async () => {
      const brands = await facets({ brand_query: 'ser', limit: 50 });
      const isPrefix = (b: Facet) => b.name.toLowerCase().startsWith('ser');
      // lastIndexOf sobre los flags, no findLastIndex: el lib del tsconfig es
      // anterior a es2023 y api:build lo rechaza.
      const flags = brands.map(isPrefix);
      const lastPrefix = flags.lastIndexOf(true);
      const firstSubstring = flags.indexOf(false);

      expect(lastPrefix, 'el fixture necesita al menos un prefix-match').toBeGreaterThanOrEqual(0);
      expect(firstSubstring, 'el fixture necesita al menos un substring-match').toBeGreaterThanOrEqual(0);
      expect(lastPrefix).toBeLessThan(firstSubstring);
    });

    it('dentro de cada grupo ordena por count DESC', async () => {
      const brands = await facets({ brand_query: 'ser', limit: 50 });
      const isPrefix = (b: Facet) => b.name.toLowerCase().startsWith('ser');
      expectCountDesc(brands.filter(isPrefix));
      expectCountDesc(brands.filter((b) => !isPrefix(b)));
    });

    it('respeta el scope: los counts son los del scope, no globales', async () => {
      const scoped = await facets({ q: 'leche', brand_query: 'serenísima', limit: 50 });
      const global = await facets({ brand_query: 'serenísima', limit: 50 });
      expect(scoped.length).toBeGreaterThan(0);

      const globalByName = new Map(global.map((b) => [b.name, b.count]));
      for (const b of scoped) {
        expect(b.count, `marca ${b.name}`).toBeLessThanOrEqual(globalByName.get(b.name)!);
      }
    });

    it('sin brand_query el tie-break de count es alfabético ascendente', async () => {
      const brands = await facets({ limit: 50 });
      for (let i = 1; i < brands.length; i++) {
        const prev = brands[i - 1]!;
        const cur = brands[i]!;
        if (prev.count === cur.count) {
          // La DB es en_US.UTF-8, que ordena igual que localeCompare('es').
          expect(prev.name.localeCompare(cur.name, 'es')).toBeLessThan(0);
        }
      }
    });
  });

  // ─── Genérico ──────────────────────────────────────────────────────────────
  //
  // Los facets NO excluyen la marca catchall: son un espejo exacto del scope de
  // /search y /products, que tampoco la excluyen bajo only_matched. La regla dura
  // del proyecto aplica a comparaciones de precio cross-retailer (/compare,
  // matched_count, recent-changes), no a filtros de disponibilidad. Decisión de
  // Juan, 15/07/2026: la invariante manda en todos los modos.
  it('only_matched=true: incluye Genérico, igual que /products (invariante > convención)', async () => {
    const brands = await facets({ only_matched: 'true', brand_query: 'gen', limit: 50 });
    const catchall = brands.filter((b) => ['Genérico', 'Generico'].includes(b.name));
    expect(catchall.length).toBeGreaterThan(0);

    const expected = await countByBrandVia('/products', {
      only_matched: 'true',
      brand: ['Genérico', 'Generico'],
    });
    for (const b of catchall) expect(b.count).toBe(expected.get(b.name));
  });
});
