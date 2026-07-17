/**
 * Detección del descuento de fidelidad "Mi Crf" (Carrefour) a partir del string
 * crudo de `discount_highlight`.
 *
 * El backend es dueño de este entendimiento: el frontend consume el boolean derivado
 * `hasMiCrfDiscount`, no parsea el string. `discount_highlight` es una convención
 * interna de marketing de Carrefour, sin contrato (ej. "PROMO-25% Off Mi Crf -Reg-1-25
 * -As14 al 20.7"). Si Carrefour cambia "Mi Crf" por otra etiqueta, se adapta el matcher
 * ACÁ y en ningún otro lado.
 *
 * OJO: `discount_highlight IS NOT NULL` NO implica Mi Crf. De las ~3.012 filas vigentes
 * de Carrefour con highlight, solo ~455 son familia Mi Crf; el resto son promos generales
 * "-Reg-" (ej. "PROMO-30% Off -Reg-1-30-AsByT") que NO son fidelidad. Por eso el trigger
 * del tratamiento visual es este flag, no `discount_highlight != NULL` ni `listPrice != price`.
 *
 * `MI_CRF_TOKEN` es la única fuente de verdad. `MI_CRF_HIGHLIGHT_PATTERN` (para SQL ILIKE,
 * case-insensitive) e `isMiCrfDiscount` (para TS) derivan de él: cambiar el token actualiza
 * ambos caminos a la vez.
 */
export const MI_CRF_TOKEN = 'mi crf';

/** Patrón para `discount_highlight ILIKE ...` en SQL. ILIKE ya es case-insensitive. */
export const MI_CRF_HIGHLIGHT_PATTERN = `%${MI_CRF_TOKEN}%`;

/** Deriva el flag desde el discount_highlight crudo. NULL o sin match -> false. */
export function isMiCrfDiscount(discountHighlight: string | null | undefined): boolean {
  return discountHighlight != null && discountHighlight.toLowerCase().includes(MI_CRF_TOKEN);
}
