/**
 * Pregunta 3: confirmar que Carrefour sigue exponiendo DiscountHighLight (Mi Crf)
 * en commertialOffer después del fix de Teasers, y ver si tiene clusters de
 * cantidad-condicional / fidelidad análogos a los de Masonline.
 *
 * Muestrea EANs de Carrefour con discount_highlight no nulo (desde DB), scrapea
 * crudo, dumpea. No persiste.
 *
 * Uso: pnpm tsx research/descuentos-condicionales-fidelidad/scripts/05-dump-raw-carrefour.ts
 * Output: dumps/raw-carrefour.json (gitignored)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db, close } from '../../../src/lib/db.ts';
import { fetchProductsByEan } from '../../../src/lib/vtex-client.ts';
import { retailers } from '../../../src/config/retailers.ts';

const sql = db();
const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');

async function main(): Promise<void> {
  await mkdir(DUMP_DIR, { recursive: true });
  const cfg = retailers.carrefour;

  const withHl = await sql<{ ean: string; dh: string }[]>`
    SELECT ph.ean, ph.discount_highlight AS dh
    FROM price_history ph JOIN retailers r ON r.id=ph.retailer_id
    WHERE r.slug='carrefour' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.discount_highlight IS NOT NULL AND ph.price>0
    ORDER BY ph.ean LIMIT 8`;
  const withPromo = await sql<{ ean: string; pd: string }[]>`
    SELECT ph.ean, ph.promo_description AS pd
    FROM price_history ph JOIN retailers r ON r.id=ph.retailer_id
    WHERE r.slug='carrefour' AND ph.valid_to IS NULL AND ph.is_available
      AND ph.promo_description IS NOT NULL AND ph.price>0
    ORDER BY ph.ean LIMIT 6`;

  const eans = [...new Set([...withHl.map((r) => r.ean), ...withPromo.map((r) => r.ean)])];
  console.log(`[carrefour] muestreando ${eans.length} EANs (con discount_highlight / promo_description)\n`);

  const out: unknown[] = [];
  for (const ean of eans) {
    const res = await fetchProductsByEan(cfg.host, ean);
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
    if (!res.ok || res.value.length === 0) { console.log(`  ${ean}: ${res.ok ? 'sin resultados' : 'ERROR'}`); continue; }
    out.push({ queriedEan: ean, products: res.value });
    const p = res.value[0] as any;
    const o = p.items?.[0]?.sellers?.[0]?.commertialOffer ?? {};
    const dh = (o.DiscountHighLight ?? []).map((e: any) => e.Name ?? e['<Name>k__BackingField']);
    const tz = (o.Teasers ?? []).map((e: any) => e.Name ?? e['<Name>k__BackingField']);
    console.log(`  ${ean}: DiscountHighLight=${JSON.stringify(dh)}  Teasers=${JSON.stringify(tz).slice(0, 90)}`);
  }

  const path = join(DUMP_DIR, 'raw-carrefour.json');
  await writeFile(path, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n[carrefour] dump -> ${path} (${out.length} productos)`);
}

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; }).finally(() => close());
