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

  describe('brand multi-valor', () => {
    it('brand repetido devuelve las dos marcas', async () => {
      const res = await request(http())
        .get('/products')
        .query({ brand: ['La Serenísima', 'Ilolay'], limit: 50 });
      expect(res.status).toBe(200);
      const brands = new Set(res.body.data.map((p: { brand: string }) => p.brand));
      expect(brands).toEqual(new Set(['La Serenísima', 'Ilolay']));
      for (const p of res.body.data) {
        expect(['La Serenísima', 'Ilolay']).toContain(p.brand);
      }
    });

    it('el total con dos marcas es la suma de los totales individuales', async () => {
      const [a, b, both] = await Promise.all([
        request(http()).get('/products').query({ brand: 'La Serenísima', limit: 1 }),
        request(http()).get('/products').query({ brand: 'Ilolay', limit: 1 }),
        request(http())
          .get('/products')
          .query({ brand: ['La Serenísima', 'Ilolay'], limit: 1 }),
      ]);
      expect(both.body.pagination.total).toBe(
        a.body.pagination.total + b.body.pagination.total,
      );
    });

    it('una marca inexistente en la lista se ignora, no rompe', async () => {
      const res = await request(http())
        .get('/products')
        .query({ brand: ['La Serenísima', 'MarcaQueNoExiste'], limit: 20 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) expect(p.brand).toBe('La Serenísima');
    });

    it('400 con brand vacío', async () => {
      const res = await request(http()).get('/products').query({ brand: '' });
      expect(res.status).toBe(400);
    });

    it('400 si alguna de las marcas repetidas viene vacía', async () => {
      const res = await request(http())
        .get('/products')
        .query({ brand: ['La Serenísima', ''] });
      expect(res.status).toBe(400);
    });
  });

  // ─── Filtro por marca CANÓNICA (normalización de presentación) ──────────────
  //
  // El sidebar tilda el display canónico; el filtro expande a todas las formas
  // crudas del grupo N3. La DB sigue con las formas crudas; el campo `brand` de
  // la respuesta siempre es el display canónico.
  describe('brand canónico (fusión de marcas fragmentadas)', () => {
    const totalFor = async (brand: string): Promise<number> => {
      const res = await request(http()).get('/products').query({ brand, limit: 1 });
      expect(res.status).toBe(200);
      return res.body.pagination.total;
    };

    it('brand=Genérico trae Genérico OR Generico (acento) bajo el display canónico', async () => {
      const res = await request(http()).get('/products').query({ brand: 'Genérico', limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) expect(p.brand).toBe('Genérico');
      // Ambas formas normalizan a la misma clave -> mismo universo filtrado.
      expect(await totalFor('Genérico')).toBe(await totalFor('Generico'));
    });

    it('brand=Ga.Ma trae Gama OR Ga.Ma (puntuación) bajo el display canónico', async () => {
      const res = await request(http()).get('/products').query({ brand: 'Ga.Ma', limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) expect(p.brand).toBe('Ga.Ma');
      expect(await totalFor('Ga.Ma')).toBe(await totalFor('Gama'));
      // El grupo es estrictamente mayor que cualquiera de sus formas... si tuviera
      // el count por-forma. No lo tenemos desde la API; alcanza con que ambas
      // formas devuelvan el mismo total fusionado y sea > 0.
      expect(await totalFor('Ga.Ma')).toBeGreaterThan(0);
    });

    it('brand=Ayudín (display X3) trae también la forma sin acento Ayudin', async () => {
      const res = await request(http()).get('/products').query({ brand: 'Ayudín', limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) expect(p.brand).toBe('Ayudín');
      expect(await totalFor('Ayudín')).toBe(await totalFor('Ayudin'));
    });

    it('brand=Boss NO arrastra BOSS (exclusión de merge): son grupos distintos', async () => {
      const boss = await request(http()).get('/products').query({ brand: 'Boss', limit: 50 });
      const bossAudio = await request(http()).get('/products').query({ brand: 'BOSS', limit: 50 });
      expect(boss.status).toBe(200);
      expect(bossAudio.status).toBe(200);
      expect(boss.body.data.length).toBeGreaterThan(0);
      expect(bossAudio.body.data.length).toBeGreaterThan(0);
      for (const p of boss.body.data) expect(p.brand).toBe('Boss');
      for (const p of bossAudio.body.data) expect(p.brand).toBe('BOSS');
      // Distintos universos: la fusión ciega los uniría, la exclusión los separa.
      const bossEans = new Set(boss.body.data.map((p: { ean: string }) => p.ean));
      for (const p of bossAudio.body.data) expect(bossEans.has(p.ean)).toBe(false);
    });
  });

  describe('category_top (match exacto contra el departamento)', () => {
    it('devuelve solo productos cuyo path arranca con /Limpieza/', async () => {
      const res = await request(http())
        .get('/products')
        .query({ category_top: 'Limpieza', limit: 100 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p.categoryPath?.startsWith('/Limpieza/')).toBe(true);
      }
    });

    // El bug que motivó el param: 13 top-levels están contenidos dentro de otro,
    // así que el substring de ?category= arrastra departamentos ajenos.
    // Ver docs/analysis/top-levels-2026-07-14.md.
    it('no arrastra /Automotor/, que el substring de ?category= sí trae', async () => {
      const [exact, substring] = await Promise.all([
        request(http()).get('/products').query({ category_top: 'Limpieza', limit: 100 }),
        request(http()).get('/products').query({ category: 'Limpieza', limit: 100 }),
      ]);
      expect(exact.status).toBe(200);
      expect(substring.status).toBe(200);

      const topLevelOf = (p: { categoryPath: string | null }) =>
        p.categoryPath?.split('/')[1];

      // category_top: ni un solo producto fuera del departamento.
      const exactTops = new Set(exact.body.data.map(topLevelOf));
      expect(exactTops).toEqual(new Set(['Limpieza']));

      // category: el universo es estrictamente mayor, y son falsos positivos reales.
      expect(substring.body.pagination.total).toBeGreaterThan(
        exact.body.pagination.total,
      );
      const contaminated = await request(http())
        .get('/products')
        .query({ category: 'Limpieza', limit: 100, sort_by: 'brand', sort_dir: 'desc' });
      const foreign = contaminated.body.data.filter(
        (p: { categoryPath: string | null }) => !p.categoryPath?.startsWith('/Limpieza/'),
      );
      expect(foreign.length).toBeGreaterThan(0);
    });

    it('multi-valor: el total es la unión de los departamentos', async () => {
      const [a, b, both] = await Promise.all([
        request(http()).get('/products').query({ category_top: 'Limpieza', limit: 1 }),
        request(http()).get('/products').query({ category_top: 'Bebidas', limit: 1 }),
        request(http())
          .get('/products')
          .query({ category_top: ['Limpieza', 'Bebidas'], limit: 1 }),
      ]);
      // Departamentos disjuntos por construcción (un path tiene un solo top-level).
      expect(both.body.pagination.total).toBe(
        a.body.pagination.total + b.body.pagination.total,
      );
    });

    it('multi-valor: devuelve productos de ambos departamentos y de ningún otro', async () => {
      const res = await request(http())
        .get('/products')
        .query({ category_top: ['Limpieza', 'Bebidas'], limit: 100, sort_by: 'brand' });
      expect(res.status).toBe(200);
      const tops = new Set(
        res.body.data.map((p: { categoryPath: string | null }) => p.categoryPath?.split('/')[1]),
      );
      for (const t of tops) expect(['Limpieza', 'Bebidas']).toContain(t);
    });

    it('coexiste con brand: aplica ambos filtros (AND)', async () => {
      const res = await request(http())
        .get('/products')
        .query({ category_top: 'Limpieza', brand: 'Ayudín', limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p.brand).toBe('Ayudín');
        expect(p.categoryPath?.startsWith('/Limpieza/')).toBe(true);
      }
    });

    it('400 con category_top vacío', async () => {
      const res = await request(http()).get('/products').query({ category_top: '' });
      expect(res.status).toBe(400);
    });

    it('un departamento inexistente devuelve vacío, no rompe', async () => {
      const res = await request(http())
        .get('/products')
        .query({ category_top: 'DepartamentoQueNoExiste' });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // Deprecado a favor de category_top, pero sigue siendo contrato público.
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
    expect(res.body.product.ean).toBe(KNOWN_EAN);
    expect(Array.isArray(res.body.product.retailers)).toBe(true);
  });

  it('normaliza el EAN con padding de ceros', async () => {
    const res = await request(http()).get(`/products/0${KNOWN_EAN}`);
    expect(res.status).toBe(200);
    // El EAN en la respuesta viene canónico (sin el cero de padding).
    expect(res.body.product.ean).toBe(KNOWN_EAN);
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
