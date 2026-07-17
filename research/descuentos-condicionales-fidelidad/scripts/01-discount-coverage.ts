/**
 * Pregunta 1: caracterizar los descuentos de Masonline (list_price > price).
 *
 * Solo lectura contra la DB. Cuantifica cuántos productos vigentes de Masonline
 * tienen descuento, la distribución del ratio price/list_price (que delata el
 * tipo de descuento: "2da al 50%" promedia a ~0.75, "2x1" a ~0.50), y compara
 * con Carrefour. No persiste nada.
 *
 * Uso: pnpm tsx research/descuentos-condicionales-fidelidad/scripts/01-discount-coverage.ts
 */
import { db, close } from '../../../src/lib/db.ts';

const sql = db();

interface CountRow {
  slug: string;
  total: string;
  with_discount: string;
  with_promo_desc: string;
  with_highlight: string;
}

interface RatioRow {
  ratio_bucket: string;
  n: string;
}

async function main(): Promise<void> {
  console.log('=== Cobertura de descuentos por retailer (filas vigentes disponibles, price>0) ===\n');
  const counts = await sql<CountRow[]>`
    SELECT
      r.slug,
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE ph.list_price > ph.price)::text AS with_discount,
      COUNT(*) FILTER (WHERE ph.promo_description IS NOT NULL)::text AS with_promo_desc,
      COUNT(*) FILTER (WHERE ph.discount_highlight IS NOT NULL)::text AS with_highlight
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE ph.valid_to IS NULL AND ph.is_available AND ph.price > 0
    GROUP BY r.slug
    ORDER BY r.slug
  `;
  for (const c of counts) {
    const pct = ((Number(c.with_discount) / Number(c.total)) * 100).toFixed(1);
    console.log(`[${c.slug}] total=${c.total}  con_descuento=${c.with_discount} (${pct}%)  promo_desc=${c.with_promo_desc}  discount_highlight=${c.with_highlight}`);
  }

  console.log('\n=== Distribución del ratio price/list_price en Masonline (solo con descuento) ===');
  console.log('El ratio delata el mecanismo: 2da al 50% -> ~0.75, 3x2 -> ~0.67, 2x1 -> ~0.50\n');
  const ratios = await sql<RatioRow[]>`
    WITH d AS (
      SELECT ROUND((ph.price / ph.list_price)::numeric, 2) AS ratio
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE r.slug = 'masonline' AND ph.valid_to IS NULL AND ph.is_available
        AND ph.price > 0 AND ph.list_price > ph.price
    )
    SELECT
      CASE
        WHEN ratio <= 0.50 THEN 'a) <=0.50 (2x1 / 50%+ off)'
        WHEN ratio <= 0.60 THEN 'b) 0.51-0.60'
        WHEN ratio <= 0.67 THEN 'c) 0.61-0.67 (~3x2)'
        WHEN ratio <= 0.70 THEN 'd) 0.68-0.70'
        WHEN ratio = 0.75 THEN 'e) =0.75 EXACTO (2da al 50%)'
        WHEN ratio BETWEEN 0.71 AND 0.79 THEN 'f) 0.71-0.79 (excl 0.75)'
        WHEN ratio <= 0.90 THEN 'g) 0.80-0.90'
        ELSE 'h) 0.91-0.99'
      END AS ratio_bucket,
      COUNT(*)::text AS n
    FROM d
    GROUP BY ratio_bucket
    ORDER BY ratio_bucket
  `;
  for (const row of ratios) console.log(`  ${row.ratio_bucket.padEnd(32)} ${row.n}`);

  console.log('\n=== Ratios exactos más frecuentes en Masonline (top 15) ===');
  const exact = await sql<{ ratio: string; n: string }[]>`
    SELECT ROUND((ph.price / ph.list_price)::numeric, 3)::text AS ratio, COUNT(*)::text AS n
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE r.slug = 'masonline' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price > 0 AND ph.list_price > ph.price
    GROUP BY ratio
    ORDER BY COUNT(*) DESC
    LIMIT 15
  `;
  for (const row of exact) console.log(`  ratio=${row.ratio}  n=${row.n}`);

  console.log('\n=== Ejemplos representativos Masonline (ratio ~0.75, sospechosos de "2da al 50%") ===');
  const examples = await sql<{ ean: string; name_canonical: string; price: string; list_price: string; ratio: string }[]>`
    SELECT ph.ean, p.name_canonical, ph.price::text, ph.list_price::text,
           ROUND((ph.price / ph.list_price)::numeric, 3)::text AS ratio
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    JOIN products p ON p.ean = ph.ean
    WHERE r.slug = 'masonline' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price > 0 AND ph.list_price > ph.price
      AND ROUND((ph.price / ph.list_price)::numeric, 2) = 0.75
    ORDER BY ph.ean
    LIMIT 12
  `;
  for (const e of examples) console.log(`  ${e.ean}  ${e.name_canonical?.slice(0, 45).padEnd(45)}  price=${e.price} list=${e.list_price} ratio=${e.ratio}`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => close());
