/**
 * Configuración de la normalización de marcas (capa de presentación).
 *
 * La DB nunca se toca: `products.brand` sigue siendo la forma cruda. Estos dos
 * mapas curados por Juan sobreescriben la resolución automática de display (regla
 * X3, ver src/lib/brand/normalize.ts) y protegen colisiones legítimas de la
 * fusión por clave N3.
 *
 * Origen de los datos: research/fragmentacion-marcas/HALLAZGOS.md (16/07/2026).
 */

/**
 * Override manual del display canónico de un grupo de marcas fragmentadas.
 *
 * La CLAVE es la salida de `normalizeBrandKey` aplicada al display esperado
 * (verificado por test de paridad en tests/api/brand-normalization.test.ts). El
 * VALOR es cómo se le muestra la marca al usuario. Grupos no listados acá usan la
 * regla X3 automática.
 *
 * Por qué existe el override: la X3 prefiere "acentos + case-mixed" y desempata
 * por frecuencia, lo cual falla para marcas que en su forma real son ALL-CAPS
 * (ATMA, BGH, LG, TCL, NADIR) o tienen puntuación propia (Ga.Ma, Pet's Class,
 * San Remo) que N3 borra para agrupar pero que el display debe conservar.
 */
export const BRAND_DISPLAY_OVERRIDES: Record<string, string> = {
  aston: 'Aston',
  oxford: 'Oxford',
  atma: 'ATMA',
  bgh: 'BGH',
  lg: 'LG',
  tcl: 'TCL',
  nadir: 'NADIR',
  simonaggio: 'Simonaggio',
  bc: 'BC',
  pelikan: 'Pelikan',
  lagauchita: 'La Gauchita',
  petsclass: "Pet's Class",
  smartlife: 'Smart Life',
  johnsonsbaby: "Johnson's Baby",
  sanremo: 'San Remo',
  gama: 'Ga.Ma',
  belgioco: 'Bel Gioco',
};

/**
 * Pares de marcas que NO se fusionan aunque colisionen por la clave N3. Cada
 * `keepSeparate` lista las formas crudas exactas que deben quedar como marcas
 * separadas: en facets aparecen como entradas distintas y el filtro `?brand=`
 * las trata individualmente.
 *
 * Único caso hoy: `Boss` (Hugo Boss, perfume) vs `BOSS` (BOSS Audio Systems,
 * autoestéreo) — dos empresas sin relación que difieren solo por caso. La
 * fusión ciega por N3 las uniría mal. Ver HALLAZGOS.md → P4.
 */
export const BRAND_MERGE_EXCLUSIONS: Array<{
  reason: string;
  keepSeparate: string[];
}> = [
  {
    reason: 'Hugo Boss (perfume) vs BOSS Audio Systems (autoestéreo) — empresas distintas',
    keepSeparate: ['Boss', 'BOSS'],
  },
];
