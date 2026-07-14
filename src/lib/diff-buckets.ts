/**
 * Fuente única de verdad de los buckets de |diff_pct| del match cross-retailer.
 * La usan el reporte batch (`src/reports/cross-retailer.ts`) y el endpoint
 * `/compare/stats` — NO reimplementar la regla en cada lado (detectado 14/07/2026:
 * el endpoint bucketeaba el diff crudo y el reporte el redondeado → 4 productos
 * frontera caían distinto).
 *
 * Convención de fronteras: left-inclusive, right-exclusive (estándar numpy/pandas):
 *   [0,5)  [5,10)  [10,25)  [25,50)  [50,∞)
 *
 * Se bucketea sobre ABS(diff_pct) YA REDONDEADO a 2 decimales — el mismo valor
 * que la API expone como `diff_pct` y que el reporte muestra —, para que el
 * bucket sea coherente con el número exhibido (un diff mostrado como 25.00 cae
 * en [25,50), no en [10,25)).
 */
export const DIFF_BUCKET_EDGES = [5, 10, 25, 50] as const;

/** Cantidad de buckets (edges + 1: el último es [50, ∞)). */
export const DIFF_BUCKET_COUNT = DIFF_BUCKET_EDGES.length + 1;

/** |diff| <= 1% se considera empate (para "quién es más barato"). */
export const DIFF_TIE_TOLERANCE_PCT = 1;

/**
 * Índice de bucket (0..DIFF_BUCKET_EDGES.length) para un |diff_pct|.
 * Left-inclusive, right-exclusive. El caller pasa ABS(diff) ya redondeado.
 */
export function diffBucketIndex(absDiffPct: number): number {
  for (let i = 0; i < DIFF_BUCKET_EDGES.length; i++) {
    if (absDiffPct < DIFF_BUCKET_EDGES[i]!) return i;
  }
  return DIFF_BUCKET_EDGES.length;
}
