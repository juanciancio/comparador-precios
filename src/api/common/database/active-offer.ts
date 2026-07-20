import type { Db } from '../../../lib/db.ts';
import { ACTIVE_REGION } from '../../config/region.ts';

/**
 * Predicado "este producto tiene al menos una oferta vigente en la región activa".
 *
 * ## Por qué existe
 *
 * `products` es un catálogo de EANs vistos alguna vez; `price_history` es lo que
 * efectivamente se puede cotizar hoy. Después del truncate de la regionalización
 * (20/07/2026) quedaron 11.143 productos (28% de la tabla) sin ninguna oferta
 * vigente: EANs que existían en el catálogo fantasma pero que no reaparecieron
 * scrapeando Olavarría. Sin este filtro, los listados devuelven productos sin
 * precio en un comparador de precios, y el sidebar muestra marcas y categorías
 * muertas.
 *
 * **No se borran de `products`**: un huérfano puede ser un producto que no se
 * vende en Olavarría, uno que una corrida salteó (transitorio), o uno
 * descontinuado. En los dos primeros casos vuelve, y `first_seen_at` / `image_url`
 * no son recuperables. Se filtran en los listados y se dejan accesibles por EAN
 * directo.
 *
 * ## Dónde aplica y dónde NO
 *
 * Aplica en `/products`, `/search`, `/search/facets`, `/brands` y `/categories`.
 *
 * **NO aplica en `GET /products/:ean`**: un link directo o un EAN copiado tiene
 * que resolver, devolviendo el producto con `retailers: []`. El frontend tiene el
 * estado "sin oferta activa". Filtrarlo ahí convertiría un producto conocido en un
 * 404, que es peor información que "no lo tenemos cotizado".
 *
 * `/compare` y `/products/recent-changes` ya filtran solos: parten de un JOIN
 * contra ofertas vigentes.
 *
 * ## Requisito de uso
 *
 * La query que lo incluya tiene que tener `products` aliasado como `p`.
 *
 * No exige `is_available`: un producto no disponible arrastra el último precio
 * conocido (ver "Manejo de transiciones de disponibilidad" en CLAUDE.md), así que
 * sigue siendo cotizable y tiene que aparecer, marcado como no disponible.
 */
export function hasActiveOffer(sql: Db) {
  return sql`EXISTS (
    SELECT 1 FROM price_history ph
    WHERE ph.ean = p.ean
      AND ph.region_id = ${ACTIVE_REGION}
      AND ph.valid_to IS NULL
  )`;
}
