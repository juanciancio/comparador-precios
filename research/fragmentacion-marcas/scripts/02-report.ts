import { readFileSync } from 'node:fs';

type Member = { brand: string; n: number; topCat?: string; cats: Record<string, number>; samples: string[] };
type Group = {
  key: string; canonical: string; variation: string; totalProducts: number;
  members: Member[]; disjoint: boolean; biggest: number; smallest: number; skew: number; flag: boolean;
};

const frag: Group[] = JSON.parse(readFileSync(new URL('../dumps/fragmented-n3.json', import.meta.url), 'utf8'));

console.log('=== TOP 20 BY PRODUCTS AFFECTED ===');
for (const g of frag.slice(0, 20)) {
  const forms = g.members.map((m) => `"${m.brand}"(${m.n})`).join(' + ');
  const split = g.members.map((m) => Math.round((m.n / g.totalProducts) * 100)).join('/');
  console.log(`[${g.variation}]${g.disjoint ? ' ⚠DISJOINT' : ''} ${g.totalProducts}p  ${forms}  split=${split}`);
}

console.log('\n=== DISJOINT-CATEGORY GROUPS (question 4 candidates) ===');
for (const g of frag.filter((x) => x.disjoint)) {
  console.log(`\n[${g.variation}] "${g.canonical}" (${g.totalProducts}p) skew=${g.skew.toFixed(3)}`);
  for (const m of g.members) {
    const cats = Object.entries(m.cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join(', ');
    console.log(`   "${m.brand}" (${m.n}p) cats=[${cats}]`);
    console.log(`       ej: ${m.samples.slice(0, 2).join(' | ')}`);
  }
}
