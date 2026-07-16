import { db, close } from '../../../src/lib/db.ts';

async function main() {
  const sql = db();

  const [{ has_unaccent }] = await sql`
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') AS has_unaccent
  `;
  console.log('unaccent installed:', has_unaccent);

  const [{ total_products }] = await sql`SELECT COUNT(*)::int AS total_products FROM products`;
  console.log('total products:', total_products);

  const [{ null_brand }] = await sql`SELECT COUNT(*)::int AS null_brand FROM products WHERE brand IS NULL`;
  console.log('null brand:', null_brand);

  const [{ distinct_brands }] = await sql`
    SELECT COUNT(DISTINCT brand)::int AS distinct_brands FROM products WHERE brand IS NOT NULL
  `;
  console.log('distinct brands (raw):', distinct_brands);

  // Peek at generico variants
  const generico = await sql`
    SELECT brand, COUNT(*)::int AS n
    FROM products
    WHERE lower(brand) LIKE '%generico%' OR lower(brand) LIKE '%genérico%'
    GROUP BY brand ORDER BY n DESC
  `;
  console.log('\ngenerico variants:');
  for (const r of generico) console.log(`  "${r.brand}" -> ${r.n}`);

  await close();
}
main().catch((e) => { console.error(e); process.exit(1); });
