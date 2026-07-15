/**
 * Preguntas 1, 4 y 5: analiza los dumps crudos.
 *
 * - Correlaciona ListPrice/Price con DiscountHighLight (¿el descuento tiene nombre?).
 * - Cataloga tipos de descuento que VTEX comunica.
 * - Compara la estructura Carrefour vs Masonline.
 *
 * Requiere correr antes 02-dump-raw-vtex.ts.
 * Uso: pnpm tsx research/precios-descuento/scripts/03-analyze-dumps.ts
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');

/** VTEX serializa Teasers con backing fields de C#: `<Name>k__BackingField`. */
const BACKING = /^<(.+)>k__BackingField$/;

function unwrapBackingFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unwrapBackingFields);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const m = BACKING.exec(k);
      out[m?.[1] ?? k] = unwrapBackingFields(v);
    }
    return out;
  }
  return value;
}

interface Named {
  Name?: string;
  Conditions?: { MinimumQuantity?: number; Parameters?: Array<{ Name?: string; Value?: string }> };
  Effects?: { Parameters?: Array<{ Name?: string; Value?: string }> };
}

interface DumpEntry {
  queriedEan: string;
  products: Array<Record<string, unknown>>;
}

function pct(list: number, price: number): number {
  if (!list || list <= 0) return 0;
  return Math.round(((list - price) / list) * 1000) / 10;
}

async function analyze(slug: string): Promise<void> {
  const raw = await readFile(join(DUMP_DIR, `raw-${slug}.json`), 'utf8');
  const dump = JSON.parse(raw) as DumpEntry[];

  console.log(`\n${'='.repeat(78)}\n  ${slug.toUpperCase()}\n${'='.repeat(78)}`);

  const highlightNames = new Map<string, number>();
  const teaserNames = new Map<string, number>();
  const teaserEffects = new Map<string, number>();
  const teaserConditions = new Map<string, number>();
  const rows: Array<Record<string, unknown>> = [];
  let teaserShapeBacking = 0;
  let teaserShapePlain = 0;

  for (const entry of dump) {
    for (const p of entry.products) {
      const items = (p.items ?? []) as Array<Record<string, unknown>>;
      for (const it of items) {
        const sellers = (it.sellers ?? []) as Array<Record<string, unknown>>;
        const seller = sellers.find((s) => s.sellerDefault) ?? sellers[0];
        if (!seller) continue;
        const o = seller.commertialOffer as Record<string, unknown>;
        if (!o) continue;

        const price = Number(o.Price ?? 0);
        const list = Number(o.ListPrice ?? 0);

        const rawTeasers = (o.Teasers ?? []) as unknown[];
        for (const t of rawTeasers) {
          const keys = Object.keys((t ?? {}) as object);
          if (keys.some((k) => BACKING.test(k))) teaserShapeBacking++;
          else teaserShapePlain++;
        }

        const teasers = unwrapBackingFields(rawTeasers) as Named[];
        const highlights = unwrapBackingFields((o.DiscountHighLight ?? []) as unknown[]) as Named[];

        for (const h of highlights) if (h.Name) highlightNames.set(h.Name, (highlightNames.get(h.Name) ?? 0) + 1);
        for (const t of teasers) {
          if (t.Name) teaserNames.set(t.Name, (teaserNames.get(t.Name) ?? 0) + 1);
          for (const e of t.Effects?.Parameters ?? []) {
            const k = `${e.Name}=${e.Value}`;
            teaserEffects.set(k, (teaserEffects.get(k) ?? 0) + 1);
          }
          for (const c of t.Conditions?.Parameters ?? []) {
            const k = `${c.Name}`;
            teaserConditions.set(k, (teaserConditions.get(k) ?? 0) + 1);
          }
          const mq = t.Conditions?.MinimumQuantity;
          if (mq !== undefined && mq > 0) {
            teaserConditions.set(`MinimumQuantity>0`, (teaserConditions.get('MinimumQuantity>0') ?? 0) + 1);
          }
        }

        rows.push({
          ean: entry.queriedEan,
          price,
          list,
          disc_pct: pct(list, price),
          PriceWithoutDiscount: o.PriceWithoutDiscount,
          FullSellingPrice: o.FullSellingPrice,
          highlight: highlights.map((h) => h.Name).join(' | ') || null,
          teasers: teasers.map((t) => t.Name).join(' | ') || null,
          validUntil: typeof o.PriceValidUntil === 'string' ? o.PriceValidUntil.slice(0, 10) : null,
        });
      }
    }
  }

  console.log(`\n--- Forma de Teasers: backing-field=${teaserShapeBacking}, plano=${teaserShapePlain} ---`);

  console.log('\n--- DiscountHighLight: nombres distintos ---');
  if (highlightNames.size === 0) console.log('  (ninguno)');
  for (const [n, c] of [...highlightNames].sort((a, b) => b[1] - a[1])) console.log(`  ${c}x  ${n}`);

  console.log('\n--- Teasers: nombres distintos ---');
  if (teaserNames.size === 0) console.log('  (ninguno)');
  for (const [n, c] of [...teaserNames].sort((a, b) => b[1] - a[1])) console.log(`  ${c}x  ${n}`);

  console.log('\n--- Teasers: Effects observados ---');
  for (const [n, c] of [...teaserEffects].sort((a, b) => b[1] - a[1])) console.log(`  ${c}x  ${n}`);

  console.log('\n--- Teasers: tipos de Condition observados ---');
  for (const [n, c] of [...teaserConditions].sort((a, b) => b[1] - a[1])) console.log(`  ${c}x  ${n}`);

  console.log('\n--- ¿DiscountHighLight explica ListPrice>Price? ---');
  const withDisc = rows.filter((r) => (r.disc_pct as number) > 0);
  const noDisc = rows.filter((r) => (r.disc_pct as number) <= 0);
  const withDiscHasHl = withDisc.filter((r) => r.highlight).length;
  const noDiscHasHl = noDisc.filter((r) => r.highlight).length;
  console.log(`  con descuento (${withDisc.length}): ${withDiscHasHl} tienen DiscountHighLight`);
  console.log(`  sin descuento (${noDisc.length}): ${noDiscHasHl} tienen DiscountHighLight`);

  console.log('\n--- Filas (muestra) ---');
  console.table(rows.slice(0, 30));
}

async function main(): Promise<void> {
  await analyze('carrefour');
  await analyze('masonline');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
