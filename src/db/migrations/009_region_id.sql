-- Regionalización de precios. Hasta hoy el scraper pegaba a VTEX sin región y
-- traía el precio del catálogo sin regionalizar: en Carrefour no coincide con
-- ninguna de las 16 ciudades medidas (es un precio fantasma que nadie paga), en
-- Masonline coincide con CABA. Sobre 14 productos comparables, 14/14 tenían algún
-- precio distinto al de Olavarría y 3/14 cambiaban de ganador cross-retailer.
-- Evidencia completa: docs/REGIONALIZACION.md en chango-web.
--
-- El precio y la disponibilidad son función de (retailer, región), así que la
-- región pasa a ser parte de la identidad de una oferta y de su vigencia:
--   retailer_products: PK (retailer_id, ean)             -> (retailer_id, ean, region_id)
--   price_history:     PK (retailer_id, ean, valid_from) -> (retailer_id, ean, region_id, valid_from)
--
-- Hoy se carga una sola región (olavarria, CP 7400). El esquema queda listo para
-- más: sumar una región debe ser configuración (src/config/regions.ts), no otra
-- migración de PK sobre una tabla ya grande.
--
-- TEXT y no VARCHAR(64): convención del repo (todas las llaves de texto —ean,
-- slug, sku_id_retailer— son TEXT). No hay largo natural que justifique el cap.

BEGIN;

-- 1) Truncate. El histórico previo es pre-regionalización y no corresponde a
-- ninguna región real: no se puede reetiquetar como 'olavarria' porque no son
-- los precios de Olavarría. Son 8 días de historia; se tiran ahora que es barato.
-- La primera corrida post-migración repuebla todo con region_id = 'olavarria'.
--
-- `products` NO se trunca: es metadata a nivel EAN (nombre, marca, categoría,
-- imagen, first_seen_at), no tiene precio ni región, y el scraper la reupserta
-- igual. Truncarla perdería first_seen_at sin ganar nada.
TRUNCATE TABLE price_history;
TRUNCATE TABLE retailer_products;

-- 2) Columna. NOT NULL sin DEFAULT es seguro porque las tablas quedaron vacías
-- arriba; a propósito no se pone DEFAULT 'olavarria', para que un INSERT que se
-- olvide de la región falle ruidoso en vez de etiquetar mal la fila.
ALTER TABLE retailer_products ADD COLUMN region_id TEXT NOT NULL;
ALTER TABLE price_history     ADD COLUMN region_id TEXT NOT NULL;

-- 3) PKs compuestas.
ALTER TABLE retailer_products DROP CONSTRAINT retailer_products_pkey;
ALTER TABLE retailer_products ADD PRIMARY KEY (retailer_id, ean, region_id);

ALTER TABLE price_history DROP CONSTRAINT price_history_pkey;
ALTER TABLE price_history ADD PRIMARY KEY (retailer_id, ean, region_id, valid_from);

-- 4) Índices. Los tres de price_history filtran o identifican una oferta, así que
-- todos necesitan la región o pierden selectividad (y el unique parcial pasaría a
-- prohibir que dos regiones tengan precio vigente para el mismo producto).
DROP INDEX idx_ph_current;
CREATE UNIQUE INDEX idx_ph_current
  ON price_history(retailer_id, ean, region_id)
  WHERE valid_to IS NULL;

-- Índice parcial de la API (ver 005): la subquery de only_matched cuenta ofertas
-- vigentes y disponibles por EAN. Con varias regiones cargadas contaría de más,
-- así que region_id entra como primera columna del predicado por EAN.
DROP INDEX idx_ph_current_available;
CREATE INDEX idx_ph_current_available
  ON price_history(ean, region_id)
  WHERE valid_to IS NULL AND is_available;

-- Historial de un producto: siempre scopeado a una región.
DROP INDEX idx_ph_ean_valid_from;
CREATE INDEX idx_ph_ean_valid_from
  ON price_history(ean, region_id, valid_from DESC);

-- idx_rp_sku (retailer_id, sku_id_retailer) e idx_ph_valid_from quedan como
-- están: el primero ya es de altísima selectividad sin la región, el segundo es
-- un scan por rango temporal donde la región no discrimina.

COMMIT;

-- Rollback (referencia; el proyecto es forward-only en la práctica). Devuelve el
-- esquema pero NO los datos: el truncate de arriba es irreversible y la data
-- previa era inservible de todos modos. Post-rollback hay que re-scrapear.
--
--   BEGIN;
--   TRUNCATE TABLE price_history;
--   TRUNCATE TABLE retailer_products;
--   DROP INDEX idx_ph_current; DROP INDEX idx_ph_current_available; DROP INDEX idx_ph_ean_valid_from;
--   ALTER TABLE price_history DROP CONSTRAINT price_history_pkey;
--   ALTER TABLE price_history DROP COLUMN region_id;
--   ALTER TABLE price_history ADD PRIMARY KEY (retailer_id, ean, valid_from);
--   ALTER TABLE retailer_products DROP CONSTRAINT retailer_products_pkey;
--   ALTER TABLE retailer_products DROP COLUMN region_id;
--   ALTER TABLE retailer_products ADD PRIMARY KEY (retailer_id, ean);
--   CREATE UNIQUE INDEX idx_ph_current ON price_history(retailer_id, ean) WHERE valid_to IS NULL;
--   CREATE INDEX idx_ph_current_available ON price_history(ean) WHERE valid_to IS NULL AND is_available;
--   CREATE INDEX idx_ph_ean_valid_from ON price_history(ean, valid_from DESC);
--   COMMIT;
