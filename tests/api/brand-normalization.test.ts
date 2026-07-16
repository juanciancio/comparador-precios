import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, close } from '../../src/lib/db.ts';
import { BRAND_DISPLAY_OVERRIDES } from '../../src/config/brand-normalization.ts';
import {
  hasAccents,
  isCaseMixed,
  normalizeBrandKey,
  resolveBrandDisplay,
} from '../../src/lib/brand/normalize.ts';

describe('normalizeBrandKey', () => {
  // Casos representativos de la tabla de HALLAZGOS.md: acento, caso y puntuación.
  const cases: [string, string][] = [
    ['Genérico', 'generico'],
    ['Generico', 'generico'],
    ['Águila', 'aguila'],
    ['Aguila', 'aguila'],
    ['ATMA', 'atma'],
    ['Atma', 'atma'],
    ['Oral B', 'oralb'],
    ['Oral-B', 'oralb'],
    ["Pet's Class", 'petsclass'],
    ['Pets Class', 'petsclass'],
    ['Ga.Ma', 'gama'],
    ['Gama', 'gama'],
    ['Ñuke', 'nuke'],
    ['Nuke', 'nuke'],
    ["Johnson's Baby", 'johnsonsbaby'],
    ['Johnson´s Baby', 'johnsonsbaby'],
    ['7Up', '7up'],
    ['7 Up', '7up'],
    ['  Nestlé  ', 'nestle'],
    ['L\'Oréal', 'loreal'],
    ['Loreal', 'loreal'],
    ['Smart Life', 'smartlife'],
    ['Smartlife', 'smartlife'],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" -> "${expected}"`, () => {
      expect(normalizeBrandKey(input)).toBe(expected);
    });
  }

  it('preserva dígitos y colapsa solo lo no-alfanumérico', () => {
    expect(normalizeBrandKey('3D')).toBe('3d');
    expect(normalizeBrandKey('K-Othrina')).toBe('kothrina');
  });
});

describe('hasAccents / isCaseMixed', () => {
  it('hasAccents detecta tildes, ñ, ç', () => {
    expect(hasAccents('Águila')).toBe(true);
    expect(hasAccents('Ñuke')).toBe(true);
    expect(hasAccents('Schär')).toBe(true);
    expect(hasAccents('Aguila')).toBe(false);
    expect(hasAccents('Aston')).toBe(false);
  });

  it('isCaseMixed exige al menos una mayúscula Y una minúscula', () => {
    expect(isCaseMixed('Aston')).toBe(true);
    expect(isCaseMixed('LG')).toBe(false); // todo mayúsculas
    expect(isCaseMixed('atma')).toBe(false); // todo minúsculas
    expect(isCaseMixed('BGH')).toBe(false);
    expect(isCaseMixed('7Up')).toBe(true);
    expect(isCaseMixed('7up')).toBe(false);
  });
});

describe('resolveBrandDisplay', () => {
  // ── Los 17 overrides manuales ──────────────────────────────────────────────
  describe('override manual', () => {
    for (const [key, display] of Object.entries(BRAND_DISPLAY_OVERRIDES)) {
      it(`clave "${key}" -> "${display}"`, () => {
        // El override gana sin importar las formas crudas del grupo.
        expect(resolveBrandDisplay(key, [{ raw: 'cualquiera', count: 1 }])).toBe(display);
      });

      // La lista de overrides asume que normalizeBrandKey(display) === key.
      it(`normalizeBrandKey("${display}") === "${key}" (contrato de la clave)`, () => {
        expect(normalizeBrandKey(display)).toBe(key);
      });
    }
  });

  // ── Regla X3 automática (grupos no listados en overrides) ───────────────────
  describe('regla X3 automática', () => {
    const x3: { forms: { raw: string; count: number }[]; expected: string }[] = [
      { forms: [{ raw: 'Ayudin', count: 39 }, { raw: 'Ayudín', count: 22 }], expected: 'Ayudín' },
      { forms: [{ raw: 'Aguila', count: 42 }, { raw: 'Águila', count: 7 }], expected: 'Águila' },
      { forms: [{ raw: 'Dermaglos', count: 41 }, { raw: 'Dermaglós', count: 6 }], expected: 'Dermaglós' },
      { forms: [{ raw: 'Nestle', count: 30 }, { raw: 'Nestlé', count: 6 }], expected: 'Nestlé' },
      { forms: [{ raw: 'Yogurisimo', count: 20 }, { raw: 'Yogurísimo', count: 2 }], expected: 'Yogurísimo' },
    ];

    for (const { forms, expected } of x3) {
      it(`prefiere la forma con acentos: ${forms.map((f) => f.raw).join(' / ')} -> ${expected}`, () => {
        const key = normalizeBrandKey(expected);
        expect(resolveBrandDisplay(key, forms)).toBe(expected);
      });
    }

    it('sin acentos, prefiere case-mixed sobre ALL-CAPS', () => {
      // 'star' no está en overrides. STAR COMPANY (6) vs Star Company (1): X3 puro
      // por frecuencia daría el ALL-CAPS, pero case-mixed manda.
      const forms = [{ raw: 'STAR COMPANY', count: 6 }, { raw: 'Star Company', count: 1 }];
      expect(resolveBrandDisplay('starcompany', forms)).toBe('Star Company');
    });

    it('empate en acento y case: desempata por frecuencia', () => {
      const forms = [{ raw: 'Cruz De Malta', count: 1 }, { raw: 'Cruz de Malta', count: 2 }];
      expect(resolveBrandDisplay('cruzdemalta', forms)).toBe('Cruz de Malta');
    });
  });
});

// ── Paridad TS ↔ SQL contra la DB real ────────────────────────────────────────
//
// El filtro `?brand=` normaliza la columna en SQL y el input en TS; si divergen,
// el filtro traería el grupo equivocado. Se contrasta la función TS contra el
// espejo SQL sobre una muestra amplia de marcas reales del catálogo.
describe('paridad normalizeBrandKey TS ↔ SQL', () => {
  const sql = db();

  beforeAll(async () => {
    // warm-up de la conexión
    await sql`SELECT 1`;
  });
  afterAll(async () => {
    await close();
  });

  it('la clave TS coincide con LOWER(REGEXP_REPLACE(UNACCENT(TRIM(brand)),...)) en ~200 marcas', async () => {
    const sample = await sql<{ brand: string }[]>`
      SELECT DISTINCT brand FROM products
      WHERE brand IS NOT NULL
        AND (brand ~ '[^a-zA-Z0-9]' OR brand ~ '[A-Z]{2,}' OR brand ~ '[áéíóúñÁÉÍÓÚÑ]')
      ORDER BY brand
      LIMIT 200
    `;
    const brands = sample.map((r) => r.brand);
    expect(brands.length).toBeGreaterThan(30);

    const rows = await sql<{ brand: string; k: string }[]>`
      SELECT brand, LOWER(REGEXP_REPLACE(UNACCENT(TRIM(brand)), '[^a-z0-9]', '', 'gi')) AS k
      FROM unnest(${brands}::text[]) AS brand
    `;

    for (const { brand, k } of rows) {
      expect(normalizeBrandKey(brand), `marca cruda "${brand}"`).toBe(k);
    }
  });
});
