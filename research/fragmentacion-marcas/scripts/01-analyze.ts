import { writeFileSync } from 'node:fs';
import { db, close } from '../../../src/lib/db.ts';

// --- Normalization levels (in-memory, experimental, NON-persisting) ---
// unaccent-equivalent in JS: NFD decompose + strip combining marks. Plus ñ->n
// (which NFD+strip already handles: ñ -> n + U+0303).
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
// N1: lower + trim + unaccent (the proposed function)
function n1(brand: string): string {
  return stripAccents(brand.trim().toLowerCase());
}
// N2: N1 + collapse internal whitespace runs to single space
function n2(brand: string): string {
  return n1(brand).replace(/\s+/g, ' ');
}
// N3: N2 + strip ALL non-alphanumeric (aggressive: kills punctuation & spaces)
function n3(brand: string): string {
  return n2(brand).replace(/[^a-z0-9]/g, '');
}

type BrandRow = { brand: string; n: number; cats: Record<string, number>; sampleNames: string[] };

// Classify the variation type among the raw forms of a group.
function classifyVariation(forms: string[]): 'accent' | 'case' | 'punct' | 'mixed' {
  let accent = false, casing = false, punct = false;
  // Compare each form against a reference at progressively looser normalizations.
  // accent-only: differ after lowercasing but same after unaccent
  const lowered = forms.map((f) => f.trim().toLowerCase());
  const unacc = forms.map((f) => n1(f));
  const noSpace = forms.map((f) => n2(f));
  const noPunct = forms.map((f) => n3(f));

  const uniq = (arr: string[]) => new Set(arr).size;

  // If raw forms differ but lowercased forms are all equal -> pure case
  if (uniq(forms) > 1 && uniq(lowered) === 1) return 'case';
  // If lowered differ but unaccented equal -> pure accent
  if (uniq(lowered) > 1 && uniq(unacc) === 1) return 'accent';
  // If unaccented differ but whitespace-collapsed equal -> pure whitespace(punct)
  if (uniq(unacc) > 1 && uniq(noSpace) === 1) return 'punct';
  // If whitespace-collapsed differ but no-punct equal -> pure punctuation
  if (uniq(noSpace) > 1 && uniq(noPunct) === 1) return 'punct';

  // Otherwise figure out which dimensions contributed
  if (uniq(lowered) < uniq(forms)) casing = true;
  if (uniq(unacc) < uniq(lowered)) accent = true;
  if (uniq(noPunct) < uniq(unacc)) punct = true;
  const dims = [accent && 'accent', casing && 'case', punct && 'punct'].filter(Boolean);
  if (dims.length === 1) return dims[0] as 'accent' | 'case' | 'punct';
  return 'mixed';
}

async function main() {
  const sql = db();

  // Per brand: category distribution (product count per top-level category).
  // brand total = SUM(cat_n) computed in TS below.
  const rows = await sql<{ brand: string; cat: string | null; cat_n: number }[]>`
    SELECT brand,
           COALESCE(split_part(trim(both '/' from category_path), '/', 1), '(sin categoria)') AS cat,
           COUNT(*)::int AS cat_n
    FROM products
    WHERE brand IS NOT NULL
    GROUP BY brand, cat
  `;

  const sampleRows = await sql<{ brand: string; name_canonical: string }[]>`
    SELECT DISTINCT ON (brand, name_canonical) brand, name_canonical
    FROM products WHERE brand IS NOT NULL
    ORDER BY brand, name_canonical
  `;
  const samplesByBrand = new Map<string, string[]>();
  for (const r of sampleRows) {
    const arr = samplesByBrand.get(r.brand) ?? [];
    if (arr.length < 4) arr.push(r.name_canonical);
    samplesByBrand.set(r.brand, arr);
  }

  const brands = new Map<string, BrandRow>();
  for (const r of rows) {
    let b = brands.get(r.brand);
    if (!b) { b = { brand: r.brand, n: 0, cats: {}, sampleNames: samplesByBrand.get(r.brand) ?? [] }; brands.set(r.brand, b); }
    b.cats[r.cat ?? '(sin categoria)'] = r.cat_n;
    b.n += r.cat_n;
  }

  const allBrands = [...brands.values()];
  console.log('distinct raw brands:', allBrands.length);

  // Group by each normalization level
  function groupBy(fn: (b: string) => string) {
    const g = new Map<string, BrandRow[]>();
    for (const b of allBrands) {
      const k = fn(b.brand);
      const arr = g.get(k) ?? [];
      arr.push(b);
      g.set(k, arr);
    }
    return g;
  }

  for (const [label, fn] of [['N1 lower+trim+unaccent', n1], ['N2 +collapse ws', n2], ['N3 +strip punct', n3]] as const) {
    const g = groupBy(fn);
    const frag = [...g.values()].filter((a) => a.length > 1);
    const collapsedForms = frag.reduce((s, a) => s + a.length, 0);
    console.log(`${label}: ${g.size} groups | ${frag.length} fragmented groups | ${collapsedForms} raw forms collapse`);
  }

  // Use N3 as the richest grouping for the detailed report (captures accent+case+punct).
  const g3 = groupBy(n3);
  const fragmented = [...g3.entries()]
    .filter(([, a]) => a.length > 1)
    .map(([key, members]) => {
      const forms = members.map((m) => m.brand);
      const variation = classifyVariation(forms);
      const totalProducts = members.reduce((s, m) => s + m.n, 0);
      // canonical suggestion: the member with most products (Title-ish original form)
      const sorted = [...members].sort((a, b) => b.n - a.n);
      const canonical = sorted[0].brand;
      // category disjointness: top category per member
      const memberCats = sorted.map((m) => {
        const top = Object.entries(m.cats).sort((a, b) => b[1] - a[1])[0];
        return { brand: m.brand, n: m.n, topCat: top?.[0], cats: m.cats, samples: m.sampleNames };
      });
      // suspicious if the two biggest members have disjoint top categories AND both non-trivial
      const catsSets = sorted.map((m) => new Set(Object.keys(m.cats)));
      let disjoint = false;
      if (sorted.length >= 2) {
        const [a, b] = catsSets;
        const inter = [...a].filter((x) => b.has(x));
        disjoint = inter.length === 0;
      }
      const biggest = sorted[0].n;
      const smallest = sorted[sorted.length - 1].n;
      const skew = smallest / biggest; // small => very skewed
      const flag = disjoint || (skew < 0.02 && disjoint);
      return { key, canonical, variation, totalProducts, members: memberCats, disjoint, biggest, smallest, skew, flag };
    })
    .sort((a, b) => b.totalProducts - a.totalProducts);

  // Variation category counts
  const byVar: Record<string, number> = {};
  for (const f of fragmented) byVar[f.variation] = (byVar[f.variation] ?? 0) + 1;
  console.log('\nfragmented groups by variation type (N3):', byVar);
  console.log('total fragmented groups (N3):', fragmented.length);
  console.log('groups flagged disjoint-categories:', fragmented.filter((f) => f.disjoint).length);

  writeFileSync(
    new URL('../dumps/fragmented-n3.json', import.meta.url),
    JSON.stringify(fragmented, null, 2),
  );
  console.log('\nwrote dumps/fragmented-n3.json');

  await close();
}
main().catch((e) => { console.error(e); process.exit(1); });
