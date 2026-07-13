import '../src/lib/env.ts';
import { logger } from '../src/lib/logger.ts';
import {
  fetchCategoryTree,
  fetchProductsByCategory,
  getRateLimitHits,
} from '../src/lib/vtex-client.ts';
import { vtexProductSchema } from '../src/schemas/vtex-product.ts';
import { retailers } from '../src/config/retailers.ts';
import type { VtexCategory } from '../src/schemas/vtex-category.ts';

/**
 * Smoke de reconocimiento de Carrefour (Sub-fase 2.0). NO es código de producción:
 * verifica empíricamente que Carrefour se comporta como Masonline antes de tocar
 * el scraper. Requests secuenciales (concurrencia efectiva 1) para ser cortés con
 * un retailer más grande. Reporta los 5 puntos del checkpoint 2.0.
 */

const { host, treeDepth } = retailers.carrefour;
const log = logger.child({ retailer: 'carrefour', step: 'smoke' });

// Heurística amplia de "departamento basura" (solo para reportar candidatos, no
// para filtrar acá). Lo que salga alimenta skipDepartmentPatterns en 2.1.
const junkRe = /\(old\)|test|empleado|backup|prueba|no\s*usar|borrar|mercadolibre|generic/i;

const section = (title: string): void => {
  // eslint-disable-next-line no-console
  console.log(`\n========== ${title} ==========`);
};

// ---------- 1) Árbol de categorías ----------
section('1) CATEGORY TREE');
const treeResult = await fetchCategoryTree(host, treeDepth);
if (!treeResult.ok) {
  log.error({ err: treeResult.error }, 'category tree fetch failed — aborting smoke');
  process.exit(1);
}
const tree = treeResult.value;

const countNodes = (nodes: VtexCategory[]): number =>
  nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);

log.info(
  { topLevel: tree.length, totalNodes: countNodes(tree) },
  'category tree fetched',
);
// eslint-disable-next-line no-console
console.log(`Top-level departments: ${tree.length}`);
for (const d of tree) {
  const flag = junkRe.test(d.name) ? '  <-- JUNK?' : '';
  // eslint-disable-next-line no-console
  console.log(`  [${d.id}] ${d.name} (children: ${d.children.length})${flag}`);
}
const junkCandidates = tree.filter((d) => junkRe.test(d.name));
// eslint-disable-next-line no-console
console.log(
  `\nJunk candidates: ${junkCandidates.length ? junkCandidates.map((d) => d.name).join(' | ') : '(none)'}`,
);

// ---------- 2) fq=C top-level trae productos ----------
section('2) fq=C top-level -> products (probing a few departments)');
// Excluimos junk (ej: "Test Category") de la selección: no deben ser primary.
const realDepts = tree.filter((d) => !junkRe.test(d.name));
// Muestra: los primeros grandes + los últimos (suelen ser chicos: mascotas, etc.)
const probes = [...realDepts.slice(0, 4), ...realDepts.slice(-2)].filter(
  (d, i, arr) => arr.findIndex((x) => x.id === d.id) === i,
);
let primary: VtexCategory | undefined;
let primaryRaw: unknown[] = [];
for (const d of probes) {
  const r = await fetchProductsByCategory(host, String(d.id), 0, 49);
  if (!r.ok) {
    // eslint-disable-next-line no-console
    console.log(`  [${d.id}] ${d.name} -> ERROR ${JSON.stringify(r.error).slice(0, 120)}`);
    continue;
  }
  const n = r.value.length;
  // eslint-disable-next-line no-console
  console.log(`  [${d.id}] ${d.name} -> page0 count=${n}${n === 50 ? ' (>=50, big)' : ''}`);
  if (n > 0 && !primary) {
    primary = d;
    primaryRaw = r.value;
  }
}
if (!primary) {
  log.error('no top-level department returned products — CRITICAL, stop and discuss');
  process.exit(1);
}
// eslint-disable-next-line no-console
console.log(`\nPrimary department for deep checks: [${primary.id}] ${primary.name}`);

// ---------- 3) fq=C intermedias/hojas -> vacío? ----------
section('3) fq=C intermediate / leaf -> expect EMPTY (same as Masonline point 7)');
// Un intermedio = hijo del primary que a su vez tiene hijos. Una hoja = nodo sin hijos.
const intermediate = primary.children.find((c) => c.children.length > 0);
const leaf =
  intermediate?.children.find((c) => c.children.length === 0) ??
  primary.children.find((c) => c.children.length === 0);

if (intermediate) {
  const r = await fetchProductsByCategory(host, String(intermediate.id), 0, 49);
  const n = r.ok ? r.value.length : -1;
  // eslint-disable-next-line no-console
  console.log(
    `  INTERMEDIATE [${intermediate.id}] ${intermediate.name} -> count=${n} ${
      n === 0 ? 'OK (empty, as expected)' : n > 0 ? '!!! NON-EMPTY -> STRATEGY CHANGE' : '(error)'
    }`,
  );
} else {
  // eslint-disable-next-line no-console
  console.log('  (no intermediate node found under primary department)');
}
if (leaf) {
  const r = await fetchProductsByCategory(host, String(leaf.id), 0, 49);
  const n = r.ok ? r.value.length : -1;
  // eslint-disable-next-line no-console
  console.log(
    `  LEAF         [${leaf.id}] ${leaf.name} -> count=${n} ${
      n === 0 ? 'OK (empty, as expected)' : n > 0 ? '!!! NON-EMPTY -> STRATEGY CHANGE' : '(error)'
    }`,
  );
} else {
  // eslint-disable-next-line no-console
  console.log('  (no leaf node found under primary department)');
}

// ---------- 4) EAN population ----------
section('4) EAN population (first 20 products of primary department)');
// Aseguramos tener al menos 20 productos del primary department.
let raw20 = primaryRaw;
if (raw20.length < 20) {
  const more = await fetchProductsByCategory(host, String(primary.id), raw20.length, 49);
  if (more.ok) raw20 = [...raw20, ...more.value];
}
raw20 = raw20.slice(0, 20);

let withEan = 0;
let parseFail = 0;
const eanSamples: string[] = [];
for (const item of raw20) {
  const parsed = vtexProductSchema.safeParse(item);
  if (!parsed.success) {
    parseFail += 1;
    continue;
  }
  const ean = parsed.data.items[0]?.ean;
  if (ean && ean.trim() !== '') {
    withEan += 1;
    if (eanSamples.length < 8) eanSamples.push(`${ean} (${parsed.data.brand ?? '?'})`);
  }
}
const pct = raw20.length ? ((withEan / raw20.length) * 100).toFixed(1) : '0.0';
// eslint-disable-next-line no-console
console.log(`  Sampled: ${raw20.length} products | with EAN: ${withEan} (${pct}%) | parseFail: ${parseFail}`);
// eslint-disable-next-line no-console
console.log(`  EAN samples:\n    ${eanSamples.join('\n    ')}`);
// eslint-disable-next-line no-console
console.log(
  `  Verdict: ${Number(pct) >= 95 ? 'OK (>=95%, matching viable)' : Number(pct) >= 80 ? 'MARGINAL (80-95%)' : '!!! PROBLEM (<80%)'}`,
);

// ---------- 5) Rate limiting ----------
section('5) RATE LIMITING');
// eslint-disable-next-line no-console
console.log(`  Total requests issued: sequential (effective concurrency 1)`);
// eslint-disable-next-line no-console
console.log(`  429 hits during smoke: ${getRateLimitHits()}`);

section('SMOKE DONE');
log.info('carrefour smoke finished');
