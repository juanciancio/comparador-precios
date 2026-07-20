import { DEFAULT_REGION } from '../../config/regions.ts';

/**
 * Región que sirve la API. Hoy es una sola y es constante: no hay `?region=` en
 * los endpoints todavía (se agrega cuando haya una segunda región cargada).
 *
 * Toda query a `price_history` / `retailer_products` filtra por esto. Sin el
 * filtro, en cuanto se cargue una segunda región los endpoints devolverían
 * ofertas de dos regiones mezcladas como si fueran del mismo lugar — y peor,
 * `only_matched` y `matched_count`, que cuentan ofertas vigentes por EAN,
 * contarían la misma cadena dos veces y darían "matcheado" a productos que
 * existen en una sola.
 */
export const ACTIVE_REGION: string = DEFAULT_REGION;
