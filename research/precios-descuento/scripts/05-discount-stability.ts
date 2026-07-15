/**
 * Pregunta 3: ¿los descuentos son estructurales o temporales?
 *
 * Usa el historial de price_history (que SI incluye list_price, no solo el precio
 * efectivo). Ojo con el alcance: el catálogo arrancó el 13/07/2026, así que la
 * ventana de "hace 7/30 días" del brief no existe todavía. Se reporta lo que hay.
 *
 * Uso: pnpm tsx research/precios-descuento/scripts/05-discount-stability.ts
 */
import { db, close } from '../../../src/lib/db.ts';

const sql = db();

async function main(): Promise<void> {
  console.log('=== ALCANCE REAL DEL HISTORIAL ===\n');
  const span = await sql`
    SELECT r.slug,
           MIN(ph.valid_from)::text AS first_day,
           MAX(ph.valid_from)::text AS last_day,
           COUNT(DISTINCT ph.valid_from)::text AS distinct_days,
           COUNT(*)::text AS rows
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    GROUP BY r.slug ORDER BY r.slug
  `;
  console.table(span);

  console.log('\n=== FILAS POR (retailer, ean): cuantas vigencias acumula cada producto ===\n');
  const chain = await sql`
    WITH c AS (
      SELECT r.slug, ph.ean, COUNT(*) AS n
      FROM price_history ph JOIN retailers r ON r.id = ph.retailer_id
      GROUP BY r.slug, ph.ean
    )
    SELECT slug, n::text AS vigencias, COUNT(*)::text AS productos
    FROM c GROUP BY slug, n ORDER BY slug, n
  `;
  console.table(chain);

  console.log('\n=== ESTABILIDAD DEL DESCUENTO ENTRE LA VIGENCIA ACTUAL Y LA ANTERIOR ===');
  console.log('(solo productos con >=2 vigencias; disc_pct = (list-price)/list*100)\n');
  const stability = await sql`
    WITH ranked AS (
      SELECT r.slug, ph.ean, ph.valid_from, ph.price, ph.list_price,
             CASE WHEN ph.list_price > 0
                  THEN ROUND(((ph.list_price - ph.price) / ph.list_price * 100)::numeric, 2)
                  ELSE 0 END AS disc_pct,
             ROW_NUMBER() OVER (PARTITION BY ph.retailer_id, ph.ean ORDER BY ph.valid_from DESC) AS rn
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.price > 0
    ),
    pairs AS (
      SELECT cur.slug, cur.ean,
             cur.disc_pct AS cur_disc, prev.disc_pct AS prev_disc,
             cur.price AS cur_price, prev.price AS prev_price
      FROM ranked cur
      JOIN ranked prev ON prev.ean = cur.ean AND prev.slug = cur.slug AND prev.rn = 2
      WHERE cur.rn = 1
    )
    SELECT slug,
           COUNT(*)::text AS pares,
           COUNT(*) FILTER (WHERE cur_disc > 0 AND prev_disc > 0)::text AS ambos_con_disc,
           COUNT(*) FILTER (WHERE cur_disc > 0 AND prev_disc > 0
                              AND ABS(cur_disc - prev_disc) <= 2)::text AS mismo_disc_pm2,
           COUNT(*) FILTER (WHERE cur_disc > 0 AND prev_disc = 0)::text AS disc_aparecio,
           COUNT(*) FILTER (WHERE cur_disc = 0 AND prev_disc > 0)::text AS disc_desaparecio,
           COUNT(*) FILTER (WHERE cur_disc = 0 AND prev_disc = 0)::text AS nunca_disc
    FROM pairs GROUP BY slug ORDER BY slug
  `;
  console.table(stability);

  console.log('\n=== FRECUENCIA DE CAMBIO: con descuento vs sin descuento ===');
  console.log('(vigencias por producto, segmentado por si la fila actual tiene descuento)\n');
  const freq = await sql`
    WITH cur AS (
      SELECT r.slug, ph.retailer_id, ph.ean,
             (ph.list_price > ph.price) AS has_disc
      FROM price_history ph JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL AND ph.price > 0
    ),
    cnt AS (
      SELECT c.slug, c.has_disc, c.ean, COUNT(ph.*) AS vigencias
      FROM cur c
      JOIN price_history ph ON ph.ean = c.ean AND ph.retailer_id = c.retailer_id
      GROUP BY c.slug, c.has_disc, c.ean
    )
    SELECT slug, has_disc,
           COUNT(*)::text AS productos,
           ROUND(AVG(vigencias), 3)::text AS vigencias_promedio,
           MAX(vigencias)::text AS max_vigencias
    FROM cnt GROUP BY slug, has_disc ORDER BY slug, has_disc
  `;
  console.table(freq);

  console.log('\n=== PRODUCTOS CUYO PRECIO CAMBIO (>=2 vigencias): detalle de la transicion ===\n');
  const detail = await sql`
    WITH ranked AS (
      SELECT r.slug, ph.ean, ph.valid_from, ph.price, ph.list_price,
             ROW_NUMBER() OVER (PARTITION BY ph.retailer_id, ph.ean ORDER BY ph.valid_from DESC) AS rn
      FROM price_history ph JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.price > 0
    )
    SELECT cur.slug, cur.ean,
           prev.valid_from::text AS prev_day, prev.price::text AS prev_price, prev.list_price::text AS prev_list,
           cur.valid_from::text AS cur_day, cur.price::text AS cur_price, cur.list_price::text AS cur_list
    FROM ranked cur
    JOIN ranked prev ON prev.ean = cur.ean AND prev.slug = cur.slug AND prev.rn = 2
    WHERE cur.rn = 1 AND cur.price <> prev.price
    ORDER BY cur.slug, cur.ean
    LIMIT 25
  `;
  console.table(detail);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => close());
