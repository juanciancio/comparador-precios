import type { Logger } from '../lib/logger.ts';
import type { RetailerConfig } from '../config/retailers.ts';
import { fetchProductsByEan, fetchProductsByEanUnregionalized } from '../lib/vtex-client.ts';

/**
 * Guard de regionalización: verifica que la cookie `vtex_segment` esté
 * efectivamente cambiando los precios antes de escribir una sola fila.
 *
 * El modo de falla que cubre es silencioso y caro: si VTEX cambia el shape de la
 * cookie, o el `vtexRegionId` cacheado caduca, los requests siguen devolviendo 200 con
 * el precio del catálogo sin regionalizar. El scraper cargaría un catálogo entero
 * de precios fantasma etiquetados como 'olavarria', que es peor que no cargar nada
 * — se ve sano y está mal.
 *
 * ## Por qué compara contra el precio sin cookie y no contra un precio esperado
 *
 * El brief proponía chequear el sentinel contra un valor fijo (~$4.330) con ±15%.
 * Un umbral absoluto se pudre: con la inflación argentina, ese margen se agota en
 * meses y el guard empieza a abortar corridas sanas — el failure mode de un guard
 * que grita en falso es que alguien lo apaga.
 *
 * Lo que se chequea acá es la propiedad que de verdad importa y no depende del
 * nivel de precios: **con cookie y sin cookie tienen que dar distinto**. Si dan
 * igual, la cookie no está regionalizando. Cuesta un request extra por corrida.
 *
 * Limitación conocida: si algún día el precio regional coincide con el nacional
 * para el EAN sentinel, esto da falso positivo. Por eso el sentinel es
 * configurable por retailer y se elige entre los que difieren de forma estable
 * (medidos 14/14 distintos el 2026-07-20).
 */

export type RegionGuardError =
  | { kind: 'sentinel_fetch_failed'; phase: 'regional' | 'national'; detail: unknown }
  | { kind: 'sentinel_not_found'; phase: 'regional' | 'national' }
  | { kind: 'not_regionalized'; price: number };

/**
 * EAN testigo por retailer. Criterio de elección: producto de alta rotación
 * (nunca sale del catálogo) cuyo precio difiere entre el default nacional y
 * Olavarría. Ambos son Aceite Girasol Cocinero 900ml, el caso del brief.
 */
const SENTINEL_EAN: Readonly<Record<string, string>> = {
  carrefour: '7790070012050',
  masonline: '7790070012050',
};

function firstSellerPrice(products: unknown[]): number | null {
  for (const p of products) {
    if (typeof p !== 'object' || p === null) continue;
    const items = (p as { items?: unknown }).items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const sellers = (item as { sellers?: unknown }).sellers;
      if (!Array.isArray(sellers) || sellers.length === 0) continue;
      const seller =
        sellers.find(
          (s): s is { sellerDefault: boolean } =>
            typeof s === 'object' && s !== null && (s as { sellerDefault?: unknown }).sellerDefault === true,
        ) ?? sellers[0];
      if (typeof seller !== 'object' || seller === null) continue;
      const offer = (seller as { commertialOffer?: unknown }).commertialOffer;
      if (typeof offer !== 'object' || offer === null) continue;
      const price = (offer as { Price?: unknown }).Price;
      if (typeof price === 'number' && price > 0) return price;
    }
  }
  return null;
}

/**
 * Corre ANTES del scrape, no después: el punto es no escribir nunca precios
 * fantasma. Un chequeo post-corrida detectaría el problema con la tabla ya
 * contaminada y obligaría a limpiar a mano.
 */
export async function assertRegionalPricing(
  retailer: RetailerConfig,
  vtexRegionId: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; error: RegionGuardError }> {
  const ean = SENTINEL_EAN[retailer.slug];
  if (ean === undefined) {
    // Sin sentinel configurado no se bloquea la corrida: el guard es defensa en
    // profundidad, no un requisito para scrapear un retailer nuevo.
    log.warn({ step: 'region_guard' }, 'no sentinel EAN configured for retailer, skipping guard');
    return { ok: true };
  }

  const regional = await fetchProductsByEan(retailer.host, ean, vtexRegionId);
  if (!regional.ok) {
    return { ok: false, error: { kind: 'sentinel_fetch_failed', phase: 'regional', detail: regional.error } };
  }
  const regionalPrice = firstSellerPrice(regional.value);
  if (regionalPrice === null) return { ok: false, error: { kind: 'sentinel_not_found', phase: 'regional' } };

  // Sin cookie: el precio del catálogo sin regionalizar (el "fantasma").
  const national = await fetchProductsByEanUnregionalized(retailer.host, ean);
  if (!national.ok) {
    return { ok: false, error: { kind: 'sentinel_fetch_failed', phase: 'national', detail: national.error } };
  }
  const nationalPrice = firstSellerPrice(national.value);
  if (nationalPrice === null) return { ok: false, error: { kind: 'sentinel_not_found', phase: 'national' } };

  if (regionalPrice === nationalPrice) {
    return { ok: false, error: { kind: 'not_regionalized', price: regionalPrice } };
  }

  log.info(
    { step: 'region_guard', ean, regionalPrice, nationalPrice },
    'vtex_segment cookie is regionalizing prices',
  );
  return { ok: true };
}
