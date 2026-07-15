/**
 * Verificación concreta del bug de Teasers: corre el `extract` REAL de producción
 * contra el payload crudo del testigo y muestra qué sale.
 *
 * Hipótesis: vtexTeaserSchema espera `Name`, pero VTEX serializa los Teasers con
 * backing fields de C# (`<Name>k__BackingField`). Zod tolera la clave desconocida
 * y deja `Name` undefined -> buildPromoDescription devuelve null -> has_promo=true
 * pero promo_description=NULL.
 *
 * Uso: pnpm tsx research/precios-descuento/scripts/07-verify-teaser-bug.ts
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractSkus } from '../../../src/pipeline/extract.ts';
import { db, close } from '../../../src/lib/db.ts';

const DUMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dumps');
const WITNESS = '7896009419294';
const sql = db();

async function main(): Promise<void> {
  const raw = await readFile(join(DUMP_DIR, 'raw-carrefour.json'), 'utf8');
  const dump = JSON.parse(raw) as Array<{ queriedEan: string; products: unknown[] }>;
  const entry = dump.find((e) => e.queriedEan === WITNESS);
  if (!entry) throw new Error('testigo no está en el dump');

  console.log('=== TEASER CRUDO tal como lo manda VTEX ===\n');
  const p = entry.products[0] as Record<string, unknown>;
  const it = ((p.items ?? []) as Array<Record<string, unknown>>)[0];
  const s = ((it?.sellers ?? []) as Array<Record<string, unknown>>)[0];
  const o = s?.commertialOffer as Record<string, unknown>;
  console.log(JSON.stringify(o.Teasers, null, 2));

  console.log('\n=== LO QUE PRODUCE extractSkus() (código de producción) ===\n');
  for (const product of entry.products) {
    const res = extractSkus(product, 'www.carrefour.com.ar');
    for (const row of res.rows) {
      console.log(
        JSON.stringify(
          {
            ean: row.ean,
            price: row.price,
            listPrice: row.listPrice,
            hasPromo: row.hasPromo,
            promoDescription: row.promoDescription,
          },
          null,
          2,
        ),
      );
    }
    if (res.warnings.length) console.log('warnings:', JSON.stringify(res.warnings));
  }

  console.log('\n>>> hasPromo=true pero promoDescription=null: el nombre de la promo se pierde.\n');

  console.log('=== ¿Pasa en TODA la DB? promo_description no nulo por retailer ===\n');
  const rows = await sql`
    SELECT r.slug,
           COUNT(*)::text AS filas,
           COUNT(*) FILTER (WHERE ph.has_promo)::text AS con_has_promo,
           COUNT(*) FILTER (WHERE ph.promo_description IS NOT NULL)::text AS con_descripcion
    FROM price_history ph
    JOIN retailers r ON r.id = ph.retailer_id
    GROUP BY r.slug ORDER BY r.slug
  `;
  console.table(rows);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => close());
