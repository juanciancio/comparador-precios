/**
 * Muestreo dirigido de la familia "Mi Crf" (Doble Precio + X% Off Mi Crf) en
 * Carrefour, + dump CRUDO (sin Zod) del commertialOffer del seller default para
 * cada EAN, tal como lo ve un agente ANÓNIMO (mismo request que el scraper).
 *
 * Objetivo: ver TODOS los campos de precio que expone VTEX y contrastar contra
 * price/list_price en DB, para responder si capturamos precio socio o no-socio.
 *
 * Read-only sobre DB. Uso: pnpm tsx research/mi-crf-precio-capturado/scripts/01-sample-and-dump.ts
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db, close } from '../../../src/lib/db.ts';
import { retailers } from '../../../src/config/retailers.ts';

const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');
const HOST = retailers.carrefour.host;
const UA = 'ComparadorPrecios/0.1 (+juan.ciancio02@gmail.com)';

interface Row {
  ean: string;
  price: string;
  list_price: string | null;
  has_promo: boolean;
  discount_highlight: string;
  name_canonical: string;
}

// Buckets dirigidos: cada patrón toma sus filas de mayor precio (claridad visual).
const BUCKETS: { label: string; like: string }[] = [
  { label: 'doble-precio', like: '%Doble Precio%' },
  { label: 'mi-crf-off', like: '%Off Mi Crf%' },
];

async function sample(sql: ReturnType<typeof db>): Promise<Row[]> {
  const out: Row[] = [];
  for (const b of BUCKETS) {
    const rows = await sql<Row[]>`
      SELECT ph.ean, ph.price::text, ph.list_price::text, ph.has_promo,
             ph.discount_highlight, p.name_canonical
      FROM price_history ph
      JOIN retailers r ON r.id = ph.retailer_id
      JOIN products p ON p.ean = ph.ean
      WHERE r.slug = 'carrefour' AND ph.valid_to IS NULL AND ph.is_available
        AND ph.price > 0 AND ph.discount_highlight LIKE ${b.like}
      ORDER BY ph.price DESC
      LIMIT 7
    `;
    out.push(...rows);
  }
  return out;
}

interface RawOffer {
  Price?: number;
  ListPrice?: number;
  PriceWithoutDiscount?: number;
  FullSellingPrice?: number;
  SpotPrice?: number;
  PriceValidUntil?: string;
  [k: string]: unknown;
}

function unwrapNames(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => {
    if (e && typeof e === 'object') {
      const o = e as Record<string, unknown>;
      return String(o['Name'] ?? o['<Name>k__BackingField'] ?? JSON.stringify(o));
    }
    return String(e);
  });
}

async function rawOffer(ean: string): Promise<{ offer: RawOffer; commertialOfferKeys: string[]; clusters: string[] } | null> {
  const url = `https://${HOST}/api/catalog_system/pub/products/search/?fq=alternateIds_Ean:${encodeURIComponent(ean)}`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (res.status !== 200) {
    console.log(`  ${ean}: HTTP ${res.status}`);
    return null;
  }
  const body = (await res.json()) as unknown;
  if (!Array.isArray(body) || body.length === 0) return null;
  const prod = body[0] as Record<string, unknown>;
  const items = prod['items'] as Array<Record<string, unknown>> | undefined;
  const item = items?.[0];
  const sellers = item?.['sellers'] as Array<Record<string, unknown>> | undefined;
  const seller = sellers?.find((s) => s['sellerDefault'] === true) ?? sellers?.[0];
  const co = (seller?.['commertialOffer'] ?? {}) as Record<string, unknown>;
  const clustersRaw = prod['productClusters'] as Record<string, string> | undefined;
  const clusters = clustersRaw ? Object.values(clustersRaw) : [];
  return {
    offer: {
      Price: co['Price'] as number,
      ListPrice: co['ListPrice'] as number,
      PriceWithoutDiscount: co['PriceWithoutDiscount'] as number,
      FullSellingPrice: co['FullSellingPrice'] as number,
      SpotPrice: co['SpotPrice'] as number,
      PriceValidUntil: co['PriceValidUntil'] as string,
      __teasers: unwrapNames(co['Teasers']),
      __promotionTeasers: unwrapNames(co['PromotionTeasers']),
      __discountHighlight: unwrapNames(co['DiscountHighLight']),
    },
    commertialOfferKeys: Object.keys(co).sort(),
    clusters,
  };
}

async function main() {
  await mkdir(DUMP_DIR, { recursive: true });
  const sql = db();
  const rows = await sample(sql);
  console.log(`Muestra: ${rows.length} EANs\n`);
  const dump: unknown[] = [];
  for (const r of rows) {
    const raw = await rawOffer(r.ean);
    const rec = { db: r, vtex: raw };
    dump.push(rec);
    const o = raw?.offer;
    console.log(`EAN ${r.ean}  ${r.name_canonical.slice(0, 40)}`);
    console.log(`  DB    price=${r.price} list=${r.list_price} highlight="${r.discount_highlight}"`);
    if (o) {
      console.log(`  VTEX  Price=${o.Price} ListPrice=${o.ListPrice} PriceWithoutDiscount=${o.PriceWithoutDiscount} FullSellingPrice=${o.FullSellingPrice} SpotPrice=${o.SpotPrice}`);
      console.log(`  VTEX  highlight=${JSON.stringify(o.__discountHighlight)}`);
    } else {
      console.log(`  VTEX  (sin datos)`);
    }
    console.log('');
    await new Promise((res) => setTimeout(res, 250 + Math.random() * 250));
  }
  await writeFile(join(DUMP_DIR, 'raw-mi-crf.json'), JSON.stringify(dump, null, 2), 'utf8');
  console.log(`dump -> ${join(DUMP_DIR, 'raw-mi-crf.json')}`);
  await close();
}

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
