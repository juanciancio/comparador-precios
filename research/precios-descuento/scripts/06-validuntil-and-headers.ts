/**
 * Pregunta 1 (parte headers) y 4 (parte vencimiento).
 *
 * a) ¿Sirve PriceValidUntil como fecha de vencimiento de la promo?
 * b) ¿El response cambia según headers/cookies/sales-channel? NO hay login acá:
 *    solo se varían parámetros y headers públicos para ver si el precio se mueve.
 *
 * Uso: pnpm tsx research/precios-descuento/scripts/06-validuntil-and-headers.ts
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { request } from 'undici';

const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');
const WITNESS = '7896009419294';
const UA = 'ComparadorPrecios/0.1 (+contacto@dominio)';

interface Obs {
  ean: string;
  price: number;
  list: number;
  discPct: number;
  highlights: string[];
  teasers: string[];
}

async function validUntilAnalysis(): Promise<void> {
  console.log('=== a) PriceValidUntil: ¿es una fecha de vencimiento util? ===\n');
  for (const slug of ['carrefour', 'masonline']) {
    const raw = await readFile(join(DUMP_DIR, `raw-${slug}.json`), 'utf8');
    const dump = JSON.parse(raw) as Array<{ products: Array<Record<string, unknown>> }>;
    const dates = new Map<string, number>();
    for (const e of dump) {
      for (const p of e.products) {
        for (const it of (p.items ?? []) as Array<Record<string, unknown>>) {
          const sellers = (it.sellers ?? []) as Array<Record<string, unknown>>;
          const s = sellers.find((x) => x.sellerDefault) ?? sellers[0];
          const o = s?.commertialOffer as Record<string, unknown> | undefined;
          if (!o) continue;
          const v = typeof o.PriceValidUntil === 'string' ? o.PriceValidUntil.slice(0, 10) : 'null';
          dates.set(v, (dates.get(v) ?? 0) + 1);
        }
      }
    }
    console.log(`  [${slug}] valores distintos de PriceValidUntil:`);
    for (const [d, c] of [...dates].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
      console.log(`    ${String(c).padStart(4)}x  ${d}`);
    }
    console.log('');
  }
}

/** Pide el mismo producto variando params/headers publicos. Sin login. */
async function headerProbe(): Promise<void> {
  console.log('\n=== b) ¿El response cambia por params/headers publicos? ===\n');
  const base = `https://www.carrefour.com.ar/api/catalog_system/pub/products/search/?fq=alternateIds_Ean:${WITNESS}`;

  const variants: Array<{ label: string; url: string; headers: Record<string, string> }> = [
    { label: 'baseline (scraper actual)', url: base, headers: { 'User-Agent': UA } },
    {
      label: 'UA de Chrome',
      url: base,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
    { label: 'sales channel sc=1', url: `${base}&sc=1`, headers: { 'User-Agent': UA } },
    { label: 'sales channel sc=2', url: `${base}&sc=2`, headers: { 'User-Agent': UA } },
    { label: 'sales channel sc=3', url: `${base}&sc=3`, headers: { 'User-Agent': UA } },
  ];

  for (const v of variants) {
    try {
      const res = await request(v.url, { method: 'GET', headers: v.headers });
      if (res.statusCode !== 200) {
        console.log(`  ${v.label.padEnd(28)} HTTP ${res.statusCode}`);
        await res.body.dump();
        continue;
      }
      const body = (await res.body.json()) as Array<Record<string, unknown>>;
      const p = body[0];
      if (!p) {
        console.log(`  ${v.label.padEnd(28)} sin resultados`);
        continue;
      }
      const it = ((p.items ?? []) as Array<Record<string, unknown>>)[0];
      const sellers = (it?.sellers ?? []) as Array<Record<string, unknown>>;
      const s = sellers.find((x) => x.sellerDefault) ?? sellers[0];
      const o = s?.commertialOffer as Record<string, unknown> | undefined;
      console.log(
        `  ${v.label.padEnd(28)} Price=${o?.Price} ListPrice=${o?.ListPrice} teasers=${
          ((o?.Teasers ?? []) as unknown[]).length
        } highlights=${((o?.DiscountHighLight ?? []) as unknown[]).length}`,
      );
    } catch (e) {
      console.log(`  ${v.label.padEnd(28)} ERROR ${String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(
    '\n  Nota: no se prueba sesion logueada (fuera de scope). Esto solo verifica si\n' +
      '  el binding anonimo por defecto responde distinto segun params/headers publicos.',
  );
}

async function main(): Promise<void> {
  await validUntilAnalysis();
  await headerProbe();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
