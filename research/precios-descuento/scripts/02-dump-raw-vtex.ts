/**
 * Preguntas 1, 4 y 5: qué expone VTEX crudo que no estamos guardando.
 *
 * Toma una muestra chica (10-20 productos por retailer) elegida desde la DB
 * (mitad con descuento list_price>price, mitad sin), pide el producto crudo a
 * VTEX por EAN y dumpea el JSON completo SIN pasar por Zod. No persiste nada.
 *
 * Uso: pnpm tsx research/precios-descuento/scripts/02-dump-raw-vtex.ts
 * Output: research/precios-descuento/dumps/raw-{retailer}.json (gitignored)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db, close } from '../../../src/lib/db.ts';
import { fetchProductsByEan } from '../../../src/lib/vtex-client.ts';
import { retailers, type RetailerSlug } from '../../../src/config/retailers.ts';

const sql = db();
const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');

const WITNESS = '7896009419294';
const SAMPLE_PER_BUCKET = 8;

interface SampleRow {
  ean: string;
  price: string;
  list_price: string | null;
  has_promo: boolean;
}

async function sampleEans(slug: RetailerSlug): Promise<string[]> {
  const withDisc = await sql<SampleRow[]>`
    SELECT ph.ean, ph.price::text, ph.list_price::text, ph.has_promo
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE r.slug = ${slug} AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price > 0 AND ph.list_price > ph.price
    ORDER BY ph.ean
    LIMIT ${SAMPLE_PER_BUCKET}
  `;
  const noDisc = await sql<SampleRow[]>`
    SELECT ph.ean, ph.price::text, ph.list_price::text, ph.has_promo
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE r.slug = ${slug} AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price > 0 AND ph.list_price = ph.price
    ORDER BY ph.ean
    LIMIT ${SAMPLE_PER_BUCKET}
  `;
  // has_promo=true es exclusivo de Carrefour; lo muestreamos aparte para ver
  // qué forma real tienen los Teasers.
  const withPromo = await sql<SampleRow[]>`
    SELECT ph.ean, ph.price::text, ph.list_price::text, ph.has_promo
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    WHERE r.slug = ${slug} AND ph.valid_to IS NULL AND ph.is_available
      AND ph.price > 0 AND ph.has_promo
    ORDER BY ph.ean
    LIMIT ${SAMPLE_PER_BUCKET}
  `;
  const eans = new Set<string>([WITNESS]);
  for (const r of [...withDisc, ...noDisc, ...withPromo]) eans.add(r.ean);
  return [...eans];
}

async function dumpRetailer(slug: RetailerSlug): Promise<void> {
  const cfg = retailers[slug];
  const eans = await sampleEans(slug);
  console.log(`\n[${slug}] muestreando ${eans.length} EANs contra ${cfg.host}`);

  const out: unknown[] = [];
  for (const ean of eans) {
    const res = await fetchProductsByEan(cfg.host, ean);
    if (!res.ok) {
      console.log(`  ${ean}: ERROR ${JSON.stringify(res.error)}`);
      continue;
    }
    if (res.value.length === 0) {
      console.log(`  ${ean}: sin resultados`);
      continue;
    }
    out.push({ queriedEan: ean, products: res.value });
    console.log(`  ${ean}: ${res.value.length} producto(s)`);
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
  }

  const path = join(DUMP_DIR, `raw-${slug}.json`);
  await writeFile(path, JSON.stringify(out, null, 2), 'utf8');
  console.log(`[${slug}] dump -> ${path}`);
}

async function main(): Promise<void> {
  await mkdir(DUMP_DIR, { recursive: true });
  await dumpRetailer('carrefour');
  await dumpRetailer('masonline');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => close());
