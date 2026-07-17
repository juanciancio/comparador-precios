import type { Result } from '../lib/result.ts';
import type { DbError } from '../lib/db.ts';
import { query } from '../lib/db.ts';
import type { Logger } from '../lib/logger.ts';
import type { ExtractedSku } from './extract.ts';
import { computeHasPromo } from './transform.ts';

export interface LoadResult {
  productsUpserted: number;
  productsNew: number;
  priceNew: number; // vigencia nueva (producto nunca visto)
  priceChanged: number; // cambió el precio/estado -> cierra+inserta (o update mismo día)
  priceUnchanged: number; // sin cambios -> solo last_seen_at
  skippedUnpriceable: number; // sin precio observable y sin nada que arrastrar -> skip total
}

interface Effective {
  price: number;
  listPrice: number | null;
  priceWithoutDiscount: number | null;
  hasPromo: boolean;
  promoDescription: string | null;
  discountHighlight: string | null;
  isAvailable: boolean;
}

interface CurrentRow {
  ean: string;
  valid_from: string; // YYYY-MM-DD
  price: string; // NUMERIC llega como string
  list_price: string | null;
  price_without_discount: string | null;
  has_promo: boolean;
  promo_description: string | null;
  discount_highlight: string | null;
  is_available: boolean;
}

interface PhInsert {
  retailer_id: number;
  ean: string;
  valid_from: string;
  valid_to: string | null;
  price: number;
  list_price: number | null;
  price_without_discount: number | null;
  has_promo: boolean;
  promo_description: string | null;
  discount_highlight: string | null;
  is_available: boolean;
}

const CHUNK = 1000;
const round2 = (n: number): number => Math.round(n * 100) / 100;

function* chunks<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

function unchanged(eff: Effective, cur: CurrentRow): boolean {
  const listEqual =
    eff.listPrice === null
      ? cur.list_price === null
      : cur.list_price !== null && eff.listPrice === Number(cur.list_price);
  // Grace bidireccional sobre price_without_discount: NO dispara vigencia nueva si
  //  - cur es NULL: fila previa al deploy (o a la captura del campo). No hay dato que
  //    comparar; lo que cambió es nuestra capacidad de observar, no el precio. `load`
  //    backfillea el valor in-place en el path de "sin cambios" (toBackfill).
  //  - eff es NULL: VTEX dejó de exponer el campo esta corrida. Conservamos el último
  //    valor bueno en vez de forzar una vigencia sobre incertidumbre. El evento
  //    económico "desapareció el descuento Mi Crf" NO se ve como pwd→NULL, sino como
  //    `price` subiendo o `discount_highlight` cambiando (ambos ya relevantes).
  // Con ambos poblados, una diferencia SÍ es cambio de estado y abre vigencia nueva.
  const pwdEqual =
    cur.price_without_discount === null ||
    eff.priceWithoutDiscount === null ||
    eff.priceWithoutDiscount === Number(cur.price_without_discount);
  return (
    eff.price === Number(cur.price) &&
    listEqual &&
    pwdEqual &&
    eff.hasPromo === cur.has_promo &&
    (eff.promoDescription ?? null) === (cur.promo_description ?? null) &&
    // Campo relevante: el highlight nombra el descuento aplicado y su vigencia
    // ("...As14 al 20.7"). Que cambie de campaña sin mover el número SÍ es un
    // cambio de estado del precio, y sin esto la fila vigente iría quedando con
    // el nombre de una promo que ya venció. Mismo criterio que promo_description.
    (eff.discountHighlight ?? null) === (cur.discount_highlight ?? null) &&
    eff.isAvailable === cur.is_available
  );
}

function insertFrom(retailerId: number, ean: string, eff: Effective, today: string): PhInsert {
  return {
    retailer_id: retailerId,
    ean,
    valid_from: today,
    valid_to: null,
    price: eff.price,
    list_price: eff.listPrice,
    price_without_discount: eff.priceWithoutDiscount,
    has_promo: eff.hasPromo,
    promo_description: eff.promoDescription,
    discount_highlight: eff.discountHighlight,
    is_available: eff.isAvailable,
  };
}

/**
 * Carga idempotente (modelo de vigencias). Todo en una transacción.
 * Ver "Lógica de load para price_history" en CLAUDE.md.
 */
export function loadRun(
  retailerId: number,
  rows: ExtractedSku[],
  log: Logger,
): Promise<Result<LoadResult, DbError>> {
  return query((sql) =>
    sql.begin(async (tx) => {
      const todayRow = await tx<{ today: string }[]>`
        SELECT ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::text AS today
      `;
      const today = todayRow[0]!.today;

      const knownRows = await tx<{ ean: string }[]>`
        SELECT ean FROM retailer_products WHERE retailer_id = ${retailerId}
      `;
      const knownEans = new Set(knownRows.map((r) => r.ean));

      const curRows = await tx<CurrentRow[]>`
        SELECT ean, valid_from::text AS valid_from, price::text AS price,
               list_price::text AS list_price,
               price_without_discount::text AS price_without_discount,
               has_promo, promo_description,
               discount_highlight, is_available
        FROM price_history
        WHERE retailer_id = ${retailerId} AND valid_to IS NULL
      `;
      const currentByEan = new Map(curRows.map((r) => [r.ean, r]));

      const survivors: Array<{ row: ExtractedSku; eff: Effective }> = [];
      const toInsert: PhInsert[] = [];
      const toClose: string[] = [];
      const sameDay: Array<{ ean: string; eff: Effective }> = [];
      const toBump: string[] = [];
      // Sin cambio de precio, pero la fila vigente tiene price_without_discount en
      // NULL (previa a la captura del campo) y ahora sí lo observamos: se backfillea
      // in-place, sin abrir vigencia. Es la ventana de transición post-deploy; una vez
      // poblado todo, este array queda vacío y volvemos a solo-bump. Ver grace en unchanged().
      const toBackfill: Array<{ ean: string; pwd: number }> = [];
      const result: LoadResult = {
        productsUpserted: 0,
        productsNew: 0,
        priceNew: 0,
        priceChanged: 0,
        priceUnchanged: 0,
        skippedUnpriceable: 0,
      };

      for (const row of rows) {
        const cur = currentByEan.get(row.ean);
        const priceable = row.isAvailable && row.price > 0;
        const carryPrice = cur && Number(cur.price) > 0 ? Number(cur.price) : null;

        let eff: Effective;
        if (!priceable) {
          // Sin precio observable: arrastrar el último real, o skip total si no hay.
          if (carryPrice === null) {
            result.skippedUnpriceable += 1;
            log.warn(
              {
                productId: row.productId,
                sku: row.skuId,
                ean: row.ean,
                price: row.price,
                isAvailable: row.isAvailable,
                firstSeen: !knownEans.has(row.ean),
                reason: 'first_seen_unavailable_or_zero_price',
              },
              'skipping SKU with no observable price and nothing to carry',
            );
            continue;
          }
          const carryListPrice = cur!.list_price !== null ? Number(cur!.list_price) : null;
          eff = {
            price: carryPrice,
            listPrice: carryListPrice,
            // Es un precio observado, no metadata de promo: se arrastra como price y
            // list_price (último valor conocido), no se limpia a null. Si la fila que
            // cierra no lo tenía (legacy), queda null y el grace de unchanged() lo
            // trata como "sin dato", no como cambio.
            priceWithoutDiscount:
              cur!.price_without_discount !== null ? Number(cur!.price_without_discount) : null,
            // Derivado, no false: has_promo es función pura de (price, list_price),
            // y ambos se arrastran. Hardcodear false acá dejaría filas que se
            // contradicen a sí mismas (list_price > price con el flag apagado).
            hasPromo: computeHasPromo(carryPrice, carryListPrice),
            // La metadata de promo SÍ se limpia: no la estamos observando (el
            // producto no está disponible), y arrastrarla afirmaría una promo
            // vigente que no vimos. Un descuento sin metadata es normal (39% de
            // los de Carrefour no traen ninguna).
            promoDescription: null,
            discountHighlight: null,
            isAvailable: false,
          };
        } else {
          const price = round2(row.price);
          const listPrice = row.listPrice !== null ? round2(row.listPrice) : null;
          eff = {
            price,
            listPrice,
            priceWithoutDiscount:
              row.priceWithoutDiscount !== null ? round2(row.priceWithoutDiscount) : null,
            hasPromo: computeHasPromo(price, listPrice),
            promoDescription: row.promoDescription,
            discountHighlight: row.discountHighlight,
            isAvailable: true,
          };
        }

        survivors.push({ row, eff });

        if (!cur) {
          toInsert.push(insertFrom(retailerId, row.ean, eff, today));
          result.priceNew += 1;
        } else if (unchanged(eff, cur)) {
          if (cur.price_without_discount === null && eff.priceWithoutDiscount !== null) {
            toBackfill.push({ ean: row.ean, pwd: eff.priceWithoutDiscount });
          } else {
            toBump.push(row.ean);
          }
          result.priceUnchanged += 1;
        } else if (cur.valid_from === today) {
          sameDay.push({ ean: row.ean, eff });
          result.priceChanged += 1;
        } else {
          toClose.push(row.ean);
          toInsert.push(insertFrom(retailerId, row.ean, eff, today));
          result.priceChanged += 1;
        }
      }

      // 1) products (padre) — name_canonical/first_seen_at intactos en conflict
      for (const part of chunks(survivors, CHUNK)) {
        const vals = part.map(({ row }) => ({
          ean: row.ean,
          name_canonical: row.retailerName,
          brand: row.brand,
          category_path: row.categoryPath,
          image_url: row.imageUrl,
        }));
        const ret = await tx<{ is_new: boolean }[]>`
          INSERT INTO products ${tx(vals)}
          ON CONFLICT (ean) DO UPDATE SET
            category_path = EXCLUDED.category_path,
            brand         = COALESCE(products.brand, EXCLUDED.brand),
            image_url     = COALESCE(EXCLUDED.image_url, products.image_url),
            last_seen_at  = NOW()
          RETURNING (xmax = 0) AS is_new
        `;
        result.productsUpserted += ret.length;
        result.productsNew += ret.filter((r) => r.is_new).length;
      }

      // 2) retailer_products
      for (const part of chunks(survivors, CHUNK)) {
        const vals = part.map(({ row, eff }) => ({
          retailer_id: retailerId,
          ean: row.ean,
          sku_id_retailer: row.skuId,
          product_id_retailer: row.productId,
          product_url: row.productUrl,
          retailer_name: row.retailerName,
          is_available: eff.isAvailable,
        }));
        await tx`
          INSERT INTO retailer_products ${tx(vals)}
          ON CONFLICT (retailer_id, ean) DO UPDATE SET
            sku_id_retailer     = EXCLUDED.sku_id_retailer,
            product_id_retailer = EXCLUDED.product_id_retailer,
            product_url         = EXCLUDED.product_url,
            retailer_name       = EXCLUDED.retailer_name,
            is_available        = EXCLUDED.is_available,
            last_seen_at        = NOW()
        `;
      }

      // 3) price_history: cerrar vigencias viejas ANTES de insertar las nuevas
      for (const part of chunks(toClose, CHUNK * 10)) {
        await tx`
          UPDATE price_history SET valid_to = ${today}::date - 1
          WHERE retailer_id = ${retailerId} AND valid_to IS NULL AND ean = ANY(${part})
        `;
      }
      for (const part of chunks(toInsert, CHUNK)) {
        await tx`INSERT INTO price_history ${tx(part)}`;
      }
      // update in-place cuando el precio ya cambió hoy (2da+ corrida del día)
      for (const u of sameDay) {
        await tx`
          UPDATE price_history SET
            price = ${u.eff.price}, list_price = ${u.eff.listPrice},
            price_without_discount = ${u.eff.priceWithoutDiscount},
            has_promo = ${u.eff.hasPromo}, promo_description = ${u.eff.promoDescription},
            discount_highlight = ${u.eff.discountHighlight},
            is_available = ${u.eff.isAvailable}, last_seen_at = NOW()
          WHERE retailer_id = ${retailerId} AND ean = ${u.ean} AND valid_to IS NULL
        `;
      }
      // sin cambios -> solo last_seen_at
      for (const part of chunks(toBump, CHUNK * 10)) {
        await tx`
          UPDATE price_history SET last_seen_at = NOW()
          WHERE retailer_id = ${retailerId} AND valid_to IS NULL AND ean = ANY(${part})
        `;
      }
      // backfill de price_without_discount en filas legacy (sin cambio de precio).
      // Un solo statement batcheado por chunk vía unnest; pwd nunca es null acá (es
      // la condición de entrada al array). Idempotente: en la 2da corrida la fila ya
      // tiene el valor, cur deja de ser null y estas filas caen en toBump.
      for (const part of chunks(toBackfill, CHUNK * 10)) {
        const eans = part.map((b) => b.ean);
        const pwds = part.map((b) => b.pwd);
        await tx`
          UPDATE price_history ph
          SET price_without_discount = data.pwd, last_seen_at = NOW()
          FROM unnest(${eans}::text[], ${pwds}::numeric[]) AS data(ean, pwd)
          WHERE ph.retailer_id = ${retailerId} AND ph.valid_to IS NULL AND ph.ean = data.ean
        `;
      }

      return result;
    }),
  );
}

/**
 * Reaping: cierra la vigencia de productos NO vistos hoy que llevan 3+ días sin
 * verse (tolera que una categoría falle un día puntual). El guard de 80% que
 * decide si correr esto vive en bin/scrape.ts.
 */
export function reap(
  retailerId: number,
  seenEans: string[],
  log: Logger,
): Promise<Result<{ reaped: number }, DbError>> {
  return query(async (sql) => {
    const rows = await sql<{ ean: string }[]>`
      UPDATE price_history
      SET valid_to = (last_seen_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      WHERE retailer_id = ${retailerId}
        AND valid_to IS NULL
        AND NOT (ean = ANY(${seenEans}))
        AND (last_seen_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
            <= (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 3
      RETURNING ean
    `;
    if (rows.length > 0) {
      log.info({ reaped: rows.length, step: 'reap' }, 'closed vigencias of disappeared products');
    }
    return { reaped: rows.length };
  });
}
