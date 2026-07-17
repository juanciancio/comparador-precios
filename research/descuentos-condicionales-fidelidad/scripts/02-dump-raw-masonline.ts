/**
 * Pregunta 1 + 2: qué expone VTEX crudo para Masonline en productos con y sin
 * descuento, y si hay CUALQUIER rastro de condición de cantidad ("2da al 50%",
 * "2x1") o de programa de fidelidad ("MasClub", "member", "club").
 *
 * Muestrea EANs desde la DB por bucket de ratio (price/list) y agrega testigos
 * conocidos. Pide el producto crudo a VTEX por EAN (Result<unknown[]>, SIN Zod)
 * y dumpea el JSON completo. No persiste en DB.
 *
 * Uso: pnpm tsx research/descuentos-condicionales-fidelidad/scripts/02-dump-raw-masonline.ts
 * Output: dumps/raw-masonline.json (gitignored)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db, close } from '../../../src/lib/db.ts';
import { fetchProductsByEan } from '../../../src/lib/vtex-client.ts';
import { retailers } from '../../../src/config/retailers.ts';

const sql = db();
const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');

// Testigos: leche La Serenísima 1L (sitio muestra "2da al 50%", DB muestra price=list)
// y varios La Serenísima con ratio 0.75 baked-in.
const WITNESSES = ['7790742363008', '7793940054006', '7790742771605', '7793940052002'];

async function eansForRatio(target: number, n: number): Promise<{ ean: string; price: string; list_price: string; ratio: string; name: string }[]> {
  return sql`
    SELECT ph.ean, ph.price::text, ph.list_price::text,
           ROUND((ph.price/ph.list_price)::numeric,3)::text AS ratio, p.name_canonical AS name
    FROM price_history ph
    JOIN retailers r ON r.id=ph.retailer_id
    JOIN products p ON p.ean=ph.ean
    WHERE r.slug='masonline' AND ph.valid_to IS NULL AND ph.is_available AND ph.price>0
      AND ROUND((ph.price/ph.list_price)::numeric,2)=${target}
    ORDER BY ph.ean
    LIMIT ${n}
  ` as unknown as Promise<{ ean: string; price: string; list_price: string; ratio: string; name: string }[]>;
}

async function main(): Promise<void> {
  await mkdir(DUMP_DIR, { recursive: true });
  const cfg = retailers.masonline;

  const buckets = [
    { label: '0.75 (¿2da al 50% / 25% off?)', rows: await eansForRatio(0.75, 4) },
    { label: '0.50 (¿2x1 / 50% off?)', rows: await eansForRatio(0.5, 3) },
    { label: '0.60 (¿40% off?)', rows: await eansForRatio(0.6, 2) },
    { label: '0.70 (¿30% off?)', rows: await eansForRatio(0.7, 2) },
    { label: '1.00 (control, sin descuento)', rows: await eansForRatio(1.0, 3) },
  ];

  const meta: { ean: string; bucket: string; dbPrice: string; dbList: string; dbRatio: string; name: string }[] = [];
  const eans = new Set<string>();
  for (const w of WITNESSES) { eans.add(w); meta.push({ ean: w, bucket: 'WITNESS', dbPrice: '?', dbList: '?', dbRatio: '?', name: '(testigo)' }); }
  for (const b of buckets) {
    for (const r of b.rows) {
      eans.add(r.ean);
      meta.push({ ean: r.ean, bucket: b.label, dbPrice: r.price, dbList: r.list_price, dbRatio: r.ratio, name: r.name });
    }
  }

  console.log(`[masonline] muestreando ${eans.size} EANs contra ${cfg.host}\n`);
  const out: unknown[] = [];
  for (const ean of eans) {
    const res = await fetchProductsByEan(cfg.host, ean);
    if (!res.ok) { console.log(`  ${ean}: ERROR ${JSON.stringify(res.error).slice(0, 120)}`); continue; }
    if (res.value.length === 0) { console.log(`  ${ean}: sin resultados en VTEX`); continue; }
    out.push({ queriedEan: ean, meta: meta.find((m) => m.ean === ean), products: res.value });
    console.log(`  ${ean}: ${res.value.length} producto(s) OK`);
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
  }

  const path = join(DUMP_DIR, 'raw-masonline.json');
  await writeFile(path, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n[masonline] dump -> ${path} (${out.length} productos)`);
}

main()
  .catch((e: unknown) => { console.error(e); process.exitCode = 1; })
  .finally(() => close());
