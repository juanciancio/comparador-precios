import { describe, it, expect } from 'vitest';
import { groupKeyFor, buildBrandGroups } from '../src/lib/brand/groups.ts';
import { normalizeBrandKey } from '../src/lib/brand/normalize.ts';
import { BRAND_MERGE_EXCLUSIONS } from '../src/config/brand-normalization.ts';

/**
 * Cobertura de las exclusiones de merge de marcas.
 *
 * Antes vivía solo en `tests/api/products.test.ts` y `tests/api/search-facets.test.ts`,
 * contra la DB real. Con la regionalización (20/07/2026) esa cobertura se cayó
 * sola: `Boss` (Hugo Boss, perfume) tiene **un** producto en el catálogo y no se
 * vende en Olavarría, así que el filtro de huérfanos lo saca de los listados y los
 * tests de API se quedaron sin las dos mitades del par.
 *
 * La lógica se testea acá, sin depender de qué haya en la DB hoy. Los tests de API
 * siguen existiendo y se reactivan solos si Hugo Boss vuelve a aparecer en la
 * región — pero la regla ya no depende de eso para estar cubierta.
 */
describe('exclusiones de merge de marcas', () => {
  it('cada forma de una exclusión cae en su propio grupo pese a compartir N3', () => {
    for (const exclusion of BRAND_MERGE_EXCLUSIONS) {
      const keys = exclusion.keepSeparate.map(groupKeyFor);
      // Comparten la clave normalizada...
      const norms = new Set(exclusion.keepSeparate.map(normalizeBrandKey));
      expect(norms.size, `${exclusion.reason}: deberían normalizar igual`).toBe(1);
      // ...pero NO la clave de agrupamiento.
      expect(new Set(keys).size, `${exclusion.reason}: deberían quedar separadas`).toBe(
        exclusion.keepSeparate.length,
      );
    }
  });

  it('Boss (perfume) y BOSS (autoestéreo) no se fusionan', () => {
    // El caso concreto que motivó la regla: dos empresas sin relación que difieren
    // solo por caso. La fusión ciega por N3 las uniría mal.
    expect(normalizeBrandKey('Boss')).toBe(normalizeBrandKey('BOSS'));
    expect(groupKeyFor('Boss')).not.toBe(groupKeyFor('BOSS'));
  });

  it('cada grupo excluido cuenta solo su forma cruda, no la suma del par', () => {
    const groups = buildBrandGroups([
      { brand: 'Boss', count: 3 },
      { brand: 'BOSS', count: 7 },
    ]);
    expect(groups).toHaveLength(2);
    const byDisplay = new Map(groups.map((g) => [g.display, g]));
    expect(byDisplay.get('Boss')!.count).toBe(3);
    expect(byDisplay.get('BOSS')!.count).toBe(7);
    // Cada uno es singleton: no arrastra la forma del otro.
    for (const g of groups) expect(g.rawForms).toHaveLength(1);
  });

  it('una marca fuera de las exclusiones sí se fusiona por N3', () => {
    // Control negativo: sin esto, el test de arriba pasaría igual si groupKeyFor
    // separara TODAS las marcas.
    const groups = buildBrandGroups([
      { brand: 'Ayudín', count: 4 },
      { brand: 'Ayudin', count: 6 },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(10);
    expect(groups[0]!.rawForms.sort()).toEqual(['Ayudin', 'Ayudín']);
  });
});
