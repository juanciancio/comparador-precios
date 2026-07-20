/**
 * Regiones de precio. VTEX cobra distinto por región y el catálogo sin
 * regionalizar devuelve un precio que nadie paga (en Carrefour no matchea
 * ninguna de las 16 ciudades medidas; en Masonline coincide con CABA).
 * Ver `docs/REGIONALIZACION.md` en chango-web para la evidencia completa.
 *
 * La regionalización se aplica mandando la cookie `vtex_segment` en cada
 * request del scraper (ver `buildVtexSegmentCookie` en lib/vtex-client.ts).
 * El query param `?regionId=` NO sirve: `catalog_system` lo ignora.
 *
 * ## Cómo agregar una región nueva
 *
 * 1. Obtener el `regionId` de cada retailer para el CP (son específicos por
 *    retailer: cada cadena tiene su propia instancia de VTEX):
 *
 *      curl 'https://www.carrefour.com.ar/api/checkout/pub/regions?country=ARG&postalCode={cp}'
 *      curl 'https://www.masonline.com.ar/api/checkout/pub/regions?country=ARG&postalCode={cp}'
 *
 *    La respuesta es `[{ id, sellers: [...] }]`. El `id` es el `regionId`.
 * 2. Agregar la entrada acá con ese `regionId` por retailer.
 * 3. Correr el scraper para esa región (poblará `price_history` con su `region_id`).
 *
 * Los IDs se cachean estáticos a propósito: no se resuelven en runtime al
 * arrancar el scraper. Cambian muy de vez en cuando y un fetch al arranque
 * agrega un punto de falla a cambio de nada.
 */

export interface RegionRetailerConfig {
  /** `id` devuelto por /api/checkout/pub/regions para el CP de la región. */
  readonly regionId: string;
}

export interface RegionConfig {
  readonly displayName: string;
  readonly postalCode: string;
  readonly retailers: Readonly<Record<string, RegionRetailerConfig>>;
}

export const regions = {
  olavarria: {
    displayName: 'Olavarría',
    postalCode: '7400',
    retailers: {
      // Decodifica a `SW#carrefourar0137;...0139;...` — la lista de sellers que
      // atienden el CP va embebida en el propio ID. `carrefourar0139` es
      // "Hiper Olavarría".
      carrefour: {
        regionId:
          'U1cjY2FycmVmb3VyYXIwMTM3O2NhcnJlZm91cmFyMDEzOTtjYXJyZWZvdXJhcjAxNjc7Y2FycmVmb3VyYXIwMTkxO2NhcnJlZm91cmFyMDIxNjtjYXJyZWZvdXJhcjAyNTg7Y2FycmVmb3VyYXIwODk5',
      },
      masonline: { regionId: 'v2.2FF411B31A0F35726A458C0C62E80AB7' },
    },
  },
} as const satisfies Record<string, RegionConfig>;

export type RegionKey = keyof typeof regions;

/**
 * Única región cargada hoy. Los endpoints sirven esta región y nada más; el
 * query param `?region=` se agrega cuando haya una segunda.
 */
export const DEFAULT_REGION: RegionKey = 'olavarria';

/**
 * `regionId` de VTEX para (región, retailer). Devuelve `undefined` si el
 * retailer no está configurado para esa región — el caller decide si eso es
 * fatal (el scraper lo es: sin regionId scrapearía el precio fantasma).
 */
export function regionIdFor(region: RegionKey, retailerSlug: string): string | undefined {
  const entry: Readonly<Record<string, RegionRetailerConfig>> = regions[region].retailers;
  return entry[retailerSlug]?.regionId;
}
