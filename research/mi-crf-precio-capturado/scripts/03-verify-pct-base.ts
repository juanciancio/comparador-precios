/**
 * Verifica a escala qué campo VTEX es la BASE del descuento en cada familia:
 *  - Doble Precio: ¿el N% sale de PriceWithoutDiscount (no-socio) o de ListPrice?
 *  - Reg X% Off:   ¿PriceWithoutDiscount == ListPrice?
 * Parsea el % del discount_highlight y contrasta contra los ratios reales.
 * Read-only sobre DB; fetch anónimo a VTEX.
 */
import { db, close } from '../../../src/lib/db.ts';
import { retailers } from '../../../src/config/retailers.ts';

const HOST = retailers.carrefour.host;
const UA = 'ComparadorPrecios/0.1 (+juan.ciancio02@gmail.com)';

interface Row { ean: string; price: string; list_price: string; discount_highlight: string }

function parsePct(h: string): number | null {
  // "Dto de 8% Doble Precio"  ó  "25% Off Mi Crf"
  const m = h.match(/(\d+)%/);
  return m ? Number(m[1]) : null;
}

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

async function run(label: string, like: string, perLevel = true) {
  const sql = db();
  // tomar variedad de niveles de %: agrupa por highlight, 2 EANs por highlight distinto
  const rows = await sql<Row[]>`
    SELECT DISTINCT ON (ph.discount_highlight) ph.ean, ph.price::text, ph.list_price::text, ph.discount_highlight
    FROM price_history ph JOIN retailers r ON r.id=ph.retailer_id
    WHERE r.slug='carrefour' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price>0 AND ph.discount_highlight LIKE ${like}
    ORDER BY ph.discount_highlight, ph.price DESC
  `;
  console.log(`\n=== ${label} (${rows.length} highlights distintos) ===`);
  console.log('EAN            statedPct  Price/PWD   Price/List   PWD==List?  PWD<List?');
  for (const r of rows) {
    const v = await raw(r.ean);
    if (!v) { console.log(`${r.ean}  (sin datos)`); continue; }
    const pct = parsePct(r.discount_highlight);
    const rPWD = v.PWD ? (v.Price / v.PWD) : NaN;
    const rList = v.ListPrice ? (v.Price / v.ListPrice) : NaN;
    const offPWD = ((1 - rPWD) * 100).toFixed(1);
    const offList = ((1 - rList) * 100).toFixed(1);
    const eqPWDList = v.PWD === v.ListPrice ? 'YES' : 'no';
    const pwdLtList = v.PWD < v.ListPrice ? 'YES' : 'no';
    console.log(`${r.ean.padEnd(14)}  ${String(pct).padStart(3)}%      -${offPWD}%      -${offList}%     ${eqPWDList.padEnd(4)}        ${pwdLtList}   | ${r.discount_highlight.slice(0,45)}`);
    await new Promise((res) => setTimeout(res, 200 + Math.random() * 150));
  }
  await close();
}

async function main() {
  await run('DOBLE PRECIO', '%Doble Precio%');
  await run('REG - X% Off Mi Crf', '%Off Mi Crf%');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
