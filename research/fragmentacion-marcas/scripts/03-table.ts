import { readFileSync, writeFileSync } from 'node:fs';

type Member = { brand: string; n: number; cats: Record<string, number> };
type Group = { canonical: string; variation: string; totalProducts: number; members: Member[]; disjoint: boolean };

const frag: Group[] = JSON.parse(readFileSync(new URL('../dumps/fragmented-n3.json', import.meta.url), 'utf8'));

const KNOWN_DISTINCT = new Set(['boss']); // manually verified genuine distinct-brand collision

const lines: string[] = [];
lines.push('| # | Forma canónica sugerida | Miembros (conteo) | Variación | Productos | Revisar |');
lines.push('|---|---|---|---|---|---|');
frag.forEach((g, i) => {
  const members = g.members.map((m) => `\`${m.brand}\` (${m.n})`).join(' + ');
  const flag = KNOWN_DISTINCT.has(g.canonical.toLowerCase())
    ? '🔴 marcas distintas'
    : g.disjoint ? '⚠️ taxonomía' : '';
  lines.push(`| ${i + 1} | \`${g.canonical}\` | ${members} | ${g.variation} | ${g.totalProducts} | ${flag} |`);
});

writeFileSync(new URL('../dumps/tabla-grupos.md', import.meta.url), lines.join('\n') + '\n');
console.log(`wrote ${frag.length} rows to dumps/tabla-grupos.md`);

// summary stats for the doc
const byVar: Record<string, { groups: number; products: number }> = {};
for (const g of frag) {
  const v = (byVar[g.variation] ??= { groups: 0, products: 0 });
  v.groups++; v.products += g.totalProducts;
}
console.log('variation summary:', JSON.stringify(byVar, null, 2));
console.log('total products in fragmented groups:', frag.reduce((s, g) => s + g.totalProducts, 0));
console.log('disjoint (taxonomy artifact):', frag.filter((g) => g.disjoint && !KNOWN_DISTINCT.has(g.canonical.toLowerCase())).length);
console.log('genuine distinct-brand collisions:', frag.filter((g) => KNOWN_DISTINCT.has(g.canonical.toLowerCase())).length);
