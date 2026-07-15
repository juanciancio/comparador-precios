/**
 * Pregunta 2: ¿Cuántos productos del catálogo tienen ListPrice != Price?
 *
 * `list_price` YA se persiste en price_history (extract.ts:90). No hace falta
 * instrumentar el scraper: se consulta la DB directo sobre las filas vigentes
 * (valid_to IS NULL).
 *
 * Uso: pnpm tsx research/precios-descuento/scripts/01-listprice-coverage.ts
 */
import { db, close } from '../../../src/lib/db.ts';

const sql = db();

interface Row {
  slug: string;
  total: string;
  with_list: string;
  list_gt_price: string;
  list_eq_price: string;
  list_null: string;
  list_lt_price: string;
}

async function main(): Promise<void> {
  console.log('=== COBERTURA DE list_price (filas vigentes, valid_to IS NULL) ===\n');

  const coverage = await sql<Row[]>`
    SELECT
      r.slug,
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE ph.list_price IS NOT NULL)::text AS with_list,
      COUNT(*) FILTER (WHERE ph.list_price > ph.price)::text AS list_gt_price,
      COUNT(*) FILTER (WHERE ph.list_price = ph.price)::text AS list_eq_price,
      COUNT(*) FILTER (WHERE ph.list_price IS NULL)::text AS list_null,
      COUNT(*) FILTER (WHERE ph.list_price < ph.price)::text AS list_lt_price
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE ph.valid_to IS NULL
    GROUP BY r.slug
    ORDER BY r.slug
  `;
  console.table(coverage);

  console.log('\n=== DISTRIBUCION DEL DESCUENTO (list_price > price, is_available) ===\n');
  const buckets = await sql`
    WITH d AS (
      SELECT r.slug,
             ROUND(((ph.list_price - ph.price) / ph.list_price * 100)::numeric, 2) AS disc_pct
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      WHERE ph.valid_to IS NULL
        AND ph.is_available
        AND ph.list_price IS NOT NULL
        AND ph.list_price > ph.price
        AND ph.price > 0
    )
    SELECT slug,
           CASE
             WHEN disc_pct <= 5  THEN '1. 0-5%'
             WHEN disc_pct <= 10 THEN '2. 5-10%'
             WHEN disc_pct <= 25 THEN '3. 10-25%'
             WHEN disc_pct <= 50 THEN '4. 25-50%'
             ELSE '5. >50%'
           END AS bucket,
           COUNT(*)::text AS n,
           ROUND(MIN(disc_pct), 2)::text AS min_pct,
           ROUND(MAX(disc_pct), 2)::text AS max_pct
    FROM d
    GROUP BY slug, bucket
    ORDER BY slug, bucket
  `;
  console.table(buckets);

  console.log('\n=== TOP 20 CATEGORIAS (top-level) POR FRECUENCIA DE DESCUENTO ===\n');
  const cats = await sql`
    WITH cur AS (
      SELECT r.slug,
             SPLIT_PART(NULLIF(p.category_path, ''), '/', 2) AS cat_top,
             (ph.list_price IS NOT NULL AND ph.list_price > ph.price) AS has_disc
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      JOIN products p ON p.ean = ph.ean
      WHERE ph.valid_to IS NULL AND ph.is_available AND ph.price > 0
    )
    SELECT slug, cat_top,
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE has_disc)::text AS with_disc,
           ROUND(100.0 * COUNT(*) FILTER (WHERE has_disc) / COUNT(*), 1)::text AS pct
    FROM cur
    WHERE cat_top IS NOT NULL AND cat_top <> ''
    GROUP BY slug, cat_top
    HAVING COUNT(*) >= 50
    ORDER BY slug, (COUNT(*) FILTER (WHERE has_disc))::numeric / COUNT(*) DESC
    LIMIT 40
  `;
  console.table(cats);

  console.log('\n=== TOP 20 MARCAS POR FRECUENCIA DE DESCUENTO (>=30 productos) ===\n');
  const brands = await sql`
    WITH cur AS (
      SELECT r.slug, p.brand,
             (ph.list_price IS NOT NULL AND ph.list_price > ph.price) AS has_disc
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      JOIN products p ON p.ean = ph.ean
      WHERE ph.valid_to IS NULL AND ph.is_available AND ph.price > 0 AND p.brand IS NOT NULL
    )
    SELECT slug, brand,
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE has_disc)::text AS with_disc,
           ROUND(100.0 * COUNT(*) FILTER (WHERE has_disc) / COUNT(*), 1)::text AS pct
    FROM cur
    GROUP BY slug, brand
    HAVING COUNT(*) >= 30 AND COUNT(*) FILTER (WHERE has_disc) > 0
    ORDER BY slug, (COUNT(*) FILTER (WHERE has_disc))::numeric / COUNT(*) DESC
    LIMIT 40
  `;
  console.table(brands);

  console.log('\n=== CASO TESTIGO: EAN 7896009419294 ===\n');
  const witness = await sql`
    SELECT r.slug, ph.valid_from::text, ph.valid_to::text,
           ph.price::text, ph.list_price::text, ph.has_promo,
           ph.promo_description, ph.is_available
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE ph.ean = '7896009419294'
    ORDER BY r.slug, ph.valid_from DESC
  `;
  console.table(witness);

  console.log('\n=== has_promo vs descuento observado (cruce) ===\n');
  const promoCross = await sql`
    SELECT r.slug,
           ph.has_promo,
           (ph.list_price IS NOT NULL AND ph.list_price > ph.price) AS has_disc,
           COUNT(*)::text AS n
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE ph.valid_to IS NULL AND ph.is_available AND ph.price > 0
    GROUP BY r.slug, ph.has_promo, has_disc
    ORDER BY r.slug, ph.has_promo, has_disc
  `;
  console.table(promoCross);

  console.log('\n=== MUESTRA promo_description NO NULA ===\n');
  const promoSamples = await sql`
    SELECT r.slug, ph.promo_description, COUNT(*)::text AS n
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE ph.valid_to IS NULL AND ph.promo_description IS NOT NULL
    GROUP BY r.slug, ph.promo_description
    ORDER BY COUNT(*) DESC
    LIMIT 30
  `;
  console.table(promoSamples);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => close());
