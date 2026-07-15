/**
 * Pregunta 4 (escala): ¿qué fracción de los descuentos (ListPrice>Price) viene
 * acompañada de metadata que nombre una condición (DiscountHighLight / Teasers)?
 *
 * El dump por-EAN (script 02) mostró 1/17 con DiscountHighLight, pero con muestra
 * sesgada (ORDER BY ean) y n chico. Acá se mide sobre una muestra más grande y
 * barata en requests: N páginas de 50 productos de departamentos top-level
 * variados (food y non-food). ~12 requests por retailer, menos que el script 02.
 *
 * No persiste nada en la DB. Solo lee VTEX y agrega en memoria.
 *
 * Uso: pnpm tsx research/precios-descuento/scripts/04-discount-metadata-prevalence.ts
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchCategoryTree, fetchProductsByCategory } from '../../../src/lib/vtex-client.ts';
import { retailers, type RetailerSlug } from '../../../src/config/retailers.ts';

const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');
const PAGES_PER_DEPT = 2; // 2 paginas x 50 = 100 productos por depto
const MAX_DEPTS = 6;

const BACKING = /^<(.+)>k__BackingField$/;

function unwrap(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unwrap);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const m = BACKING.exec(k);
      out[m?.[1] ?? k] = unwrap(v);
    }
    return out;
  }
  return value;
}

interface Obs {
  ean: string;
  dept: string;
  price: number;
  list: number;
  discPct: number;
  highlights: string[];
  teasers: string[];
}

/** Heurística: ¿el nombre de la promo alude a fidelidad/tarjeta del retailer? */
const LOYALTY_RE = /mi\s*crf|mi\s*carrefour|tarjeta|mi\s*chango|socio|club/i;

async function collect(slug: RetailerSlug): Promise<Obs[]> {
  const cfg = retailers[slug];
  const tree = await fetchCategoryTree(cfg.host, cfg.treeDepth);
  if (!tree.ok) throw new Error(`tree ${slug}: ${JSON.stringify(tree.error)}`);

  // Masonline expone 117 "top-level", pero los primeros son pseudo-departamentos
  // de filtro (Sin Tacc, Bajo y sin Sodio...) que devuelven 0 productos. Hay que
  // sondear y quedarse con los que traen catálogo real.
  const candidates = tree.value.filter((d) => !cfg.skipDepartmentPatterns.some((re) => re.test(d.name)));
  const depts: typeof candidates = [];
  for (const d of candidates) {
    if (depts.length >= MAX_DEPTS) break;
    const probe = await fetchProductsByCategory(cfg.host, String(d.id), 0, 1);
    await new Promise((r) => setTimeout(r, 150));
    if (probe.ok && probe.value.length > 0) depts.push(d);
  }
  console.log(`  [${slug}] departamentos con catálogo: ${depts.map((d) => d.name).join(', ')}`);

  const obs: Obs[] = [];
  for (const dept of depts) {
    for (let page = 0; page < PAGES_PER_DEPT; page++) {
      const from = page * 50;
      const res = await fetchProductsByCategory(cfg.host, String(dept.id), from, from + 49);
      if (!res.ok) {
        console.log(`  [${slug}] ${dept.name} p${page}: ERROR`);
        break;
      }
      if (res.value.length === 0) break;

      for (const raw of res.value) {
        const p = raw as Record<string, unknown>;
        const items = (p.items ?? []) as Array<Record<string, unknown>>;
        for (const it of items) {
          const sellers = (it.sellers ?? []) as Array<Record<string, unknown>>;
          const seller = sellers.find((s) => s.sellerDefault) ?? sellers[0];
          if (!seller) continue;
          const o = seller.commertialOffer as Record<string, unknown> | undefined;
          if (!o) continue;
          const price = Number(o.Price ?? 0);
          const list = Number(o.ListPrice ?? 0);
          if (!(price > 0) || !(list > 0)) continue;
          if (!(o.IsAvailable === true)) continue;

          const hl = unwrap((o.DiscountHighLight ?? []) as unknown[]) as Array<{ Name?: string }>;
          const ts = unwrap((o.Teasers ?? []) as unknown[]) as Array<{ Name?: string }>;
          obs.push({
            ean: String(it.ean ?? ''),
            dept: dept.name,
            price,
            list,
            discPct: Math.round(((list - price) / list) * 1000) / 10,
            highlights: hl.flatMap((h) => (h.Name ? [h.Name] : [])),
            teasers: ts.flatMap((t) => (t.Name ? [t.Name] : [])),
          });
        }
      }
      console.log(`  [${slug}] ${dept.name} p${page}: acumulado ${obs.length} SKUs`);
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
    }
  }
  return obs;
}

function report(slug: string, obs: Obs[]): void {
  console.log(`\n${'='.repeat(70)}\n  ${slug.toUpperCase()} — n=${obs.length} SKUs disponibles con precio\n${'='.repeat(70)}`);

  const disc = obs.filter((o) => o.discPct > 0);
  const noDisc = obs.filter((o) => o.discPct <= 0);
  console.log(`\nCon descuento (list>price): ${disc.length} (${((disc.length / obs.length) * 100).toFixed(1)}%)`);
  console.log(`Sin descuento:              ${noDisc.length}`);

  const discWithHl = disc.filter((o) => o.highlights.length > 0);
  const discWithTeaser = disc.filter((o) => o.teasers.length > 0);
  const discBare = disc.filter((o) => o.highlights.length === 0 && o.teasers.length === 0);
  console.log(`\n--- De los ${disc.length} con descuento ---`);
  console.log(`  con DiscountHighLight: ${discWithHl.length} (${pctOf(discWithHl.length, disc.length)})`);
  console.log(`  con Teasers:           ${discWithTeaser.length} (${pctOf(discWithTeaser.length, disc.length)})`);
  console.log(`  SIN metadata alguna:   ${discBare.length} (${pctOf(discBare.length, disc.length)})`);

  const loyaltyHl = disc.filter((o) => o.highlights.some((h) => LOYALTY_RE.test(h)));
  console.log(`  highlight que alude a fidelidad/tarjeta: ${loyaltyHl.length} (${pctOf(loyaltyHl.length, disc.length)})`);

  const teaserOnNoDisc = noDisc.filter((o) => o.teasers.length > 0);
  console.log(`\n--- De los ${noDisc.length} SIN descuento ---`);
  console.log(`  con Teasers (descuento NO aplicado al Price): ${teaserOnNoDisc.length} (${pctOf(teaserOnNoDisc.length, noDisc.length)})`);

  const hlNames = new Map<string, number>();
  for (const o of obs) for (const h of o.highlights) hlNames.set(h, (hlNames.get(h) ?? 0) + 1);
  console.log(`\n--- DiscountHighLight distintos (${hlNames.size}) ---`);
  for (const [n, c] of [...hlNames].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${c}x  ${n}`);

  const tNames = new Map<string, number>();
  for (const o of obs) for (const t of o.teasers) tNames.set(t, (tNames.get(t) ?? 0) + 1);
  console.log(`\n--- Teasers distintos (${tNames.size}) ---`);
  for (const [n, c] of [...tNames].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${c}x  ${n}`);
}

function pctOf(a: number, b: number): string {
  return b === 0 ? 'n/a' : `${((a / b) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  await mkdir(DUMP_DIR, { recursive: true });
  const all: Record<string, Obs[]> = {};
  for (const slug of ['carrefour', 'masonline'] as const) {
    console.log(`\nRecolectando ${slug}...`);
    const obs = await collect(slug);
    all[slug] = obs;
    report(slug, obs);
  }
  const path = join(DUMP_DIR, 'prevalence.json');
  await writeFile(path, JSON.stringify(all, null, 2), 'utf8');
  console.log(`\ndump -> ${path}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
