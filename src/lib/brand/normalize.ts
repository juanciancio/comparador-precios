import { BRAND_DISPLAY_OVERRIDES } from '../../config/brand-normalization.ts';

/**
 * Quita diacríticos (tildes, ñ→n, ç→c) replicando `unaccent` de Postgres para
 * marcas latinas: NFD separa el carácter base de su marca combinante y se
 * descartan las combinantes (rango U+0300–U+036F). Es el mismo criterio que usa
 * el test de facets y el que `unaccent()` aplica sobre nuestra data (español).
 */
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Clave canónica interna de una marca para AGRUPAMIENTO/matching. NO es para
 * display.
 *
 * Pasos: trim → unaccent → lowercase → strip de todo carácter no [a-z0-9].
 * Preserva dígitos ("7Up" y "7 Up" → "7up"). Colapsa acento, caso y puntuación,
 * que son las tres dimensiones de fragmentación observadas (HALLAZGOS.md).
 *
 * Espejo SQL (debe producir la misma clave, ver test de paridad):
 *   LOWER(REGEXP_REPLACE(UNACCENT(TRIM(brand)), '[^a-z0-9]', '', 'gi'))
 */
export function normalizeBrandKey(brand: string): string {
  return stripDiacritics(brand.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** `true` si `unaccent(s) !== s`, es decir si tiene tildes, ñ, ç, etc. */
export function hasAccents(s: string): boolean {
  return stripDiacritics(s) !== s;
}

/**
 * `true` si la forma tiene al menos una minúscula Y al menos una mayúscula.
 * "Aston" sí; "LG" (todo mayúsculas) no; "atma" (todo minúsculas) no. Dígitos y
 * puntuación no cuentan como ninguna de las dos.
 */
export function isCaseMixed(s: string): boolean {
  let hasLower = false;
  let hasUpper = false;
  for (const c of s) {
    if (c.toUpperCase() !== c && c.toLowerCase() === c) hasLower = true;
    else if (c.toLowerCase() !== c && c.toUpperCase() === c) hasUpper = true;
    if (hasLower && hasUpper) return true;
  }
  return false;
}

/**
 * Forma de display para un grupo de marcas fragmentadas.
 *
 *  1. Si la clave está en BRAND_DISPLAY_OVERRIDES, devuelve el override.
 *  2. Regla X3 automática: preferir forma con acentos, luego case-mixed.
 *     Desempate por frecuencia (más productos gana).
 *  3. Fallback final determinista: la primera forma alfabéticamente (es).
 *
 * `normalizedKey` debe ser `normalizeBrandKey(<cualquier forma del grupo>)`.
 */
export function resolveBrandDisplay(
  normalizedKey: string,
  rawForms: Array<{ raw: string; count: number }>,
): string {
  const override = BRAND_DISPLAY_OVERRIDES[normalizedKey];
  if (override !== undefined) return override;

  const sorted = [...rawForms].sort((a, b) => {
    const aAccent = hasAccents(a.raw);
    const bAccent = hasAccents(b.raw);
    if (aAccent !== bAccent) return aAccent ? -1 : 1;

    const aMixed = isCaseMixed(a.raw);
    const bMixed = isCaseMixed(b.raw);
    if (aMixed !== bMixed) return aMixed ? -1 : 1;

    if (a.count !== b.count) return b.count - a.count;
    return a.raw.localeCompare(b.raw, 'es');
  });

  // rawForms nunca es vacío para un grupo real; el `?? ''` satisface al tipo.
  return sorted[0]?.raw ?? '';
}
