/**
 * Pregunta 1 (profundización): ¿los descuentos baked-in (Price<List) de Masonline
 * son flat-% o cantidad-condicional? Y ¿los tags de cantidad-condicional
 * ("2da al 50%", "2x1", "3x2") corresponden a productos con descuento baked-in
 * o a productos con Price=List (promo solo en checkout)?
 *
 * Muestrea ~10 productos por bucket de ratio desde la DB, scrapea VTEX crudo,
 * extrae productClusters (los únicos que nombran promos en Masonline) y clasifica.
 * Solo lectura, no persiste.
 *
 * Uso: pnpm tsx research/descuentos-condicionales-fidelidad/scripts/04-cluster-correlation.ts
 * Output (tabla) a stdout + dumps/cluster-sample.json (gitignored)
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db, close } from '../../../src/lib/db.ts';
import { fetchProductsByEan } from '../../../src/lib/vtex-client.ts';
import { retailers } from '../../../src/config/retailers.ts';

const sql = db();
const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');

const RATIO_BUCKETS = [0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1.0];
const PER_BUCKET = 10;

// Clasificación de nombres de cluster.
const QTY_RE = /\b(\d+\s*x\s*\d+|2da|2do|3ra|segunda unidad|llevando)\b/i;   // 2x1, 3x2, 2da al 50%, 2do al 30
const FLATPCT_RE = /(\d{1,2})\s*%/;                                          // "25%", "Todo 25%", "Muebles 50%"
const MASCLUB_RE = /(mas\s*club|masclub)/i;

interface DbRow { ean: string; price: string; list_price: string; ratio: string; name: string; }

async function sample(target: number): Promise<DbRow[]> {
  return sql`
    SELECT ph.ean, ph.price::text, ph.list_price::text,
           ROUND((ph.price/ph.list_price)::numeric,3)::text AS ratio, p.name_canonical AS name
    FROM price_history ph
    JOIN retailers r ON r.id=ph.retailer_id
    JOIN products p ON p.ean=ph.ean
    WHERE r.slug='masonline' AND ph.valid_to IS NULL AND ph.is_available AND ph.price>0
      AND ROUND((ph.price/ph.list_price)::numeric,2)=${target}
    ORDER BY ph.ean
    LIMIT ${PER_BUCKET}
  ` as unknown as Promise<DbRow[]>;
}

interface Analyzed { ean: string; name: string; ratio: number; clusters: string[]; qtyClusters: string[]; flatClusters: string[]; masclubClusters: string[]; }

async function main(): Promise<void> {
  const cfg = retailers.masonline;
  const targets: { ratio: number; rows: DbRow[] }[] = [];
  for (const t of RATIO_BUCKETS) targets.push({ ratio: t, rows: await sample(t) });

  const analyzed: Analyzed[] = [];
  const rawOut: unknown[] = [];
  for (const { ratio, rows } of targets) {
    for (const row of rows) {
      const res = await fetchProductsByEan(cfg.host, row.ean);
      await new Promise((r) => setTimeout(r, 180 + Math.random() * 200));
      if (!res.ok || res.value.length === 0) continue;
      const p = res.value[0] as any;
      const clusters: string[] = Object.values(p.productClusters ?? {});
      rawOut.push({ ean: row.ean, ratio: Number(row.ratio), clusters });
      analyzed.push({
        ean: row.ean,
        name: row.name,
        ratio: Number(row.ratio),
        clusters,
        qtyClusters: clusters.filter((c) => QTY_RE.test(c)),
        flatClusters: clusters.filter((c) => FLATPCT_RE.test(c) && !MASCLUB_RE.test(c)),
        masclubClusters: clusters.filter((c) => MASCLUB_RE.test(c)),
      });
    }
  }

  await writeFile(join(DUMP_DIR, 'cluster-sample.json'), JSON.stringify(rawOut, null, 2), 'utf8');

  // Resumen 1: prevalencia de tags por bucket de ratio
  console.log('=== Prevalencia de tipos de cluster por bucket de ratio (Masonline) ===');
  console.log('bucket  n   %conQtyTag  %conFlatTag  %conMasClub  avgClusters');
  for (const t of RATIO_BUCKETS) {
    const g = analyzed.filter((a) => Math.round(a.ratio * 100) / 100 === t || (t === 1 && a.ratio >= 0.995));
    if (!g.length) continue;
    const pct = (f: (a: Analyzed) => boolean) => ((g.filter(f).length / g.length) * 100).toFixed(0);
    const avgC = (g.reduce((s, a) => s + a.clusters.length, 0) / g.length).toFixed(1);
    console.log(`${t.toFixed(2)}    ${String(g.length).padEnd(3)} ${pct((a) => a.qtyClusters.length > 0).padStart(9)}%  ${pct((a) => a.flatClusters.length > 0).padStart(9)}%  ${pct((a) => a.masclubClusters.length > 0).padStart(9)}%  ${avgC}`);
  }

  // Resumen 2: ¿el ratio matchea un flat-% presente en clusters?
  console.log('\n=== ¿El descuento baked-in (1-ratio) matchea un cluster flat-%? ===');
  let matched = 0, discounted = 0;
  for (const a of analyzed.filter((a) => a.ratio < 0.995)) {
    discounted++;
    const impliedPct = Math.round((1 - a.ratio) * 100);
    const flatNums = a.flatClusters.map((c) => Number((FLATPCT_RE.exec(c) ?? [])[1])).filter((n) => Number.isFinite(n));
    if (flatNums.some((n) => Math.abs(n - impliedPct) <= 2)) matched++;
  }
  console.log(`  ${matched}/${discounted} productos con descuento tienen un cluster flat-% que matchea (±2pp) el descuento baked-in.`);

  // Resumen 3: para productos con tag cantidad-condicional, ¿tienen descuento baked-in?
  console.log('\n=== Productos con tag cantidad-condicional (2da/NxM): ¿su Price está descontado? ===');
  const qtyTagged = analyzed.filter((a) => a.qtyClusters.length > 0);
  const qtyBaked = qtyTagged.filter((a) => a.ratio < 0.995).length;
  console.log(`  ${qtyTagged.length} productos con tag qty-cond. De esos, ${qtyBaked} tienen Price<List y ${qtyTagged.length - qtyBaked} tienen Price=List (promo NO baked-in).`);

  // Resumen 4: universalidad del cluster MasClub
  console.log('\n=== Universalidad de MasClub como cluster ===');
  const withMasclub = analyzed.filter((a) => a.masclubClusters.length > 0).length;
  console.log(`  ${withMasclub}/${analyzed.length} productos muestreados pertenecen a algún cluster MasClub.`);
  const distinctMasclub = [...new Set(analyzed.flatMap((a) => a.masclubClusters))];
  console.log(`  Clusters MasClub distintos vistos: ${JSON.stringify(distinctMasclub)}`);
}

main()
  .catch((e: unknown) => { console.error(e); process.exitCode = 1; })
  .finally(() => close());
