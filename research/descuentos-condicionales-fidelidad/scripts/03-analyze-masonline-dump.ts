/**
 * Pregunta 1 + 2: analiza el dump crudo de Masonline. Reporta:
 *  - Todas las claves presentes en commertialOffer (para ver qué NO parseamos).
 *  - Por producto: Price, ListPrice, ratio, y el CONTENIDO de todo campo que
 *    pueda nombrar una condición (Teasers, PromotionTeasers, DiscountHighLight,
 *    Installments, RewardValue, GiftSkuIds, DiscountHighLightName, etc.).
 *  - Búsqueda recursiva de strings que delaten cantidad-condicional o fidelidad:
 *    2da, 2x1, 3x2, llevando, club, member, fidel, loyalty, mas club.
 *
 * Uso: pnpm tsx research/descuentos-condicionales-fidelidad/scripts/03-analyze-masonline-dump.ts
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DUMP = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps', 'raw-masonline.json');

const CONDITION_RE = /\b(2da|2x1|3x2|4x3|llevando|lleva|segunda unidad|\d+\s*%|al\s*50)/i;
const LOYALTY_RE = /(club|member|miembro|fidel|loyalty|mas\s*club|masclub|socio)/i;

interface Entry { queriedEan: string; meta?: { bucket?: string; name?: string; dbPrice?: string; dbList?: string }; products: unknown[]; }

function walkStrings(node: unknown, out: string[], path = ''): void {
  if (typeof node === 'string') { if (node.trim()) out.push(`${path} = ${node}`); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, out, `${path}[${i}]`)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walkStrings(v, out, path ? `${path}.${k}` : k);
  }
}

async function main(): Promise<void> {
  const data = JSON.parse(await readFile(DUMP, 'utf8')) as Entry[];

  // 1. Universo de claves de commertialOffer
  const offerKeys = new Map<string, number>();
  const nonEmptyOfferKeys = new Map<string, number>();
  for (const e of data) {
    for (const p of e.products as any[]) {
      for (const item of p.items ?? []) {
        for (const seller of item.sellers ?? []) {
          const offer = seller.commertialOffer ?? {};
          for (const [k, v] of Object.entries(offer)) {
            offerKeys.set(k, (offerKeys.get(k) ?? 0) + 1);
            const empty = v == null || (Array.isArray(v) && v.length === 0) || v === 0 || v === false || v === '';
            if (!empty) nonEmptyOfferKeys.set(k, (nonEmptyOfferKeys.get(k) ?? 0) + 1);
          }
        }
      }
    }
  }
  console.log('=== Claves de commertialOffer (presencia / no-vacías) ===');
  for (const [k, n] of [...offerKeys.entries()].sort()) {
    console.log(`  ${k.padEnd(28)} present=${n}  nonEmpty=${nonEmptyOfferKeys.get(k) ?? 0}`);
  }

  // 2. Por producto: precio + campos de promo relevantes
  console.log('\n=== Por producto: Price / ListPrice / campos de condición ===');
  for (const e of data) {
    const p = (e.products as any[])[0];
    if (!p) continue;
    const item = p.items?.[0];
    const seller = item?.sellers?.find((s: any) => s.sellerDefault) ?? item?.sellers?.[0];
    const o = seller?.commertialOffer ?? {};
    const ratio = o.ListPrice ? (o.Price / o.ListPrice).toFixed(3) : 'n/a';
    console.log(`\n[${e.meta?.bucket}] ${e.queriedEan}  ${String(p.productName).slice(0, 42)}`);
    console.log(`  Price=${o.Price}  ListPrice=${o.ListPrice}  PriceWithoutDiscount=${o.PriceWithoutDiscount}  ratio=${ratio}`);
    console.log(`  Teasers=${JSON.stringify(o.Teasers ?? [])}`);
    console.log(`  PromotionTeasers=${JSON.stringify(o.PromotionTeasers ?? [])}`);
    console.log(`  DiscountHighLight=${JSON.stringify(o.DiscountHighLight ?? [])}`);
    if (o.RewardValue) console.log(`  RewardValue=${o.RewardValue}`);
    if (Array.isArray(o.Installments) && o.Installments.length) console.log(`  Installments[0]=${JSON.stringify(o.Installments[0])}`);
    if (Array.isArray(o.GiftSkuIds) && o.GiftSkuIds.length) console.log(`  GiftSkuIds=${JSON.stringify(o.GiftSkuIds)}`);
  }

  // 3. Búsqueda recursiva de condición / fidelidad en TODO el JSON
  console.log('\n=== Rastros de condición de cantidad (regex) en todo el JSON crudo ===');
  let condHits = 0, loyaltyHits = 0;
  for (const e of data) {
    const strings: string[] = [];
    walkStrings(e.products, strings);
    const cond = strings.filter((s) => CONDITION_RE.test(s.split(' = ')[1] ?? ''));
    const loy = strings.filter((s) => LOYALTY_RE.test(s.split(' = ')[1] ?? ''));
    if (cond.length) { condHits += cond.length; console.log(`  [${e.queriedEan}] COND:`); cond.slice(0, 6).forEach((s) => console.log(`     ${s.slice(0, 120)}`)); }
    if (loy.length) { loyaltyHits += loy.length; console.log(`  [${e.queriedEan}] LOYALTY:`); loy.slice(0, 6).forEach((s) => console.log(`     ${s.slice(0, 120)}`)); }
  }
  console.log(`\nTotal hits condición=${condHits}  fidelidad=${loyaltyHits}`);
  if (condHits === 0) console.log('  -> CERO rastro de condición de cantidad en el catalog endpoint de Masonline.');
  if (loyaltyHits === 0) console.log('  -> CERO rastro de programa de fidelidad (MasClub) en el catalog endpoint de Masonline.');
}

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
