/**
 * (a) Cuenta filas vigentes por sub-familia Mi Crf.
 * (b) Sobre muestra de Doble Precio: mide cuántas tienen ListPrice > PriceWithoutDiscount
 *     (tres niveles) vs ListPrice == PWD (dos niveles), y confirma Price==PWD*(1-pct).
 * Read-only DB; fetch anónimo VTEX.
 */
import { db, close } from '../../../src/lib/db.ts';
import { retailers } from '../../../src/config/retailers.ts';
const HOST = retailers.carrefour.host;
const UA = 'ComparadorPrecios/0.1 (+juan.ciancio02@gmail.com)';

async function raw(ean: string) {
  const url = `https://${HOST}/api/catalog_system/pub/products/search/?fq=alternateIds_Ean:${encodeURIComponent(ean)}`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (res.status !== 200) return null;
  const body = (await res.json()) as any[];
  const co = body?.[0]?.items?.[0]?.sellers?.find((s: any) => s.sellerDefault)?.commertialOffer
          ?? body?.[0]?.items?.[0]?.sellers?.[0]?.commertialOffer;
  if (!co) return null;
  return { Price: co.Price as number, ListPrice: co.ListPrice as number, PWD: co.PriceWithoutDiscount as number };
}

async function main() {
  const sql = db();
  const counts = await sql<{ fam: string; n: string }[]>`
    SELECT CASE
             WHEN discount_highlight LIKE '%Doble Precio%' THEN 'Doble Precio'
             WHEN discount_highlight LIKE '%Off Mi Crf%'   THEN 'X% Off Mi Crf (Reg)'
             ELSE 'otros (no Mi Crf)'
           END AS fam,
           COUNT(*) AS n
    FROM price_history ph JOIN retailers r ON r.id=ph.retailer_id
    WHERE r.slug='carrefour' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.discount_highlight IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC`;
  console.log('Filas vigentes+disponibles por familia (Carrefour):');
  for (const c of counts) console.log(`  ${String(c.n).padStart(4)}  ${c.fam}`);

  const dp = await sql<{ ean: string; price: string; list_price: string; discount_highlight: string }[]>`
    SELECT ph.ean, ph.price::text, ph.list_price::text, ph.discount_highlight
    FROM price_history ph JOIN retailers r ON r.id=ph.retailer_id
    WHERE r.slug='carrefour' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price>0 AND ph.discount_highlight LIKE '%Doble Precio%'
    ORDER BY random() LIMIT 30`;
  let threeTier = 0, twoTier = 0, pctOk = 0, checked = 0;
  const gaps: number[] = [];
  for (const r of dp) {
    const v = await raw(r.ean);
    if (!v || !v.PWD || !v.ListPrice) continue;
    checked++;
    const pct = Number(r.discount_highlight.match(/(\d+)%/)?.[1]);
    const expected = v.PWD * (1 - pct / 100);
    if (Math.abs(expected - v.Price) / v.Price < 0.005) pctOk++;
    if (v.ListPrice > v.PWD) { threeTier++; gaps.push((v.ListPrice / v.PWD - 1) * 100); }
    else twoTier++;
    await new Promise((res) => setTimeout(res, 180 + Math.random() * 150));
  }
  console.log(`\nDoble Precio muestreados: ${checked}`);
  console.log(`  Price == PWD*(1-pct) (±0.5%): ${pctOk}/${checked}`);
  console.log(`  ListPrice > PWD (tres niveles, list inflado sobre no-socio): ${threeTier}`);
  console.log(`  ListPrice == PWD (dos niveles): ${twoTier}`);
  if (gaps.length) console.log(`  gap List/PWD cuando inflado: min ${Math.min(...gaps).toFixed(1)}% max ${Math.max(...gaps).toFixed(1)}%`);
  await close();
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
