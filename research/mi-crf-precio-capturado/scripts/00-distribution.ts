/**
 * Distribución de discount_highlight en Carrefour vigente. Read-only.
 */
import { db, close } from '../../../src/lib/db.ts';

async function main() {
  const sql = db();
  const rows = await sql<{ discount_highlight: string; n: string; min_price: string; max_price: string }[]>`
    SELECT ph.discount_highlight, COUNT(*) AS n,
           MIN(ph.price)::text AS min_price, MAX(ph.price)::text AS max_price
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE r.slug = 'carrefour' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.discount_highlight IS NOT NULL
    GROUP BY ph.discount_highlight
    ORDER BY n DESC;
  `;
  console.log('Distinct discount_highlight (Carrefour, vigentes, disponibles):');
  for (const r of rows) {
    console.log(`  ${String(r.n).padStart(4)}  [$${r.min_price}-$${r.max_price}]  ${r.discount_highlight}`);
  }
  const tot = await sql<{ n: string }[]>`
    SELECT COUNT(*) n FROM price_history ph JOIN retailers r ON r.id=ph.retailer_id
    WHERE r.slug='carrefour' AND ph.valid_to IS NULL AND ph.discount_highlight IS NOT NULL`;
  console.log('TOTAL rows w/ discount_highlight (incl. no disponibles):', tot[0]?.n);
  await close();
}
main();
