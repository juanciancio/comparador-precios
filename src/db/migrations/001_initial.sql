-- Retailers: cadenas de supermercado
CREATE TABLE retailers (
  id           SMALLSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,        -- 'masonline', 'carrefour'
  name         TEXT NOT NULL,               -- 'Masonline', 'Carrefour Argentina'
  base_url     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Productos: llave universal EAN, un producto físico único en el mundo
CREATE TABLE products (
  ean              TEXT PRIMARY KEY,        -- EAN-13 (o EAN-8 en casos raros)
  name_canonical   TEXT NOT NULL,           -- nombre elegido (primer retailer que lo vio)
  brand            TEXT,
  category_path    TEXT,                    -- último path visto
  image_url        TEXT,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_last_seen ON products(last_seen_at);

-- Retailer products: mapeo (retailer, EAN) -> catálogo del retailer
CREATE TABLE retailer_products (
  retailer_id          SMALLINT NOT NULL REFERENCES retailers(id),
  ean                  TEXT NOT NULL REFERENCES products(ean),
  sku_id_retailer      TEXT NOT NULL,       -- itemId en VTEX
  product_id_retailer  TEXT NOT NULL,       -- productId en VTEX
  product_url          TEXT,
  retailer_name        TEXT,                -- nombre como lo llama esta cadena
  is_available         BOOLEAN NOT NULL DEFAULT true,
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (retailer_id, ean)
);

CREATE INDEX idx_rp_sku ON retailer_products(retailer_id, sku_id_retailer);

-- Price history: una fila por CAMBIO de precio (modelo de vigencias)
CREATE TABLE price_history (
  retailer_id       SMALLINT NOT NULL REFERENCES retailers(id),
  ean               TEXT NOT NULL REFERENCES products(ean),
  valid_from        DATE NOT NULL,           -- primer día que rige este precio
  valid_to          DATE,                    -- último día vigente (NULL = precio actual)
  price             NUMERIC(12, 2) NOT NULL,
  list_price        NUMERIC(12, 2),
  has_promo         BOOLEAN NOT NULL DEFAULT false,
  promo_description TEXT,
  is_available      BOOLEAN NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (retailer_id, ean, valid_from)
);

-- Índice parcial: acelera "cuál es el precio actual de X"
CREATE UNIQUE INDEX idx_ph_current
  ON price_history(retailer_id, ean)
  WHERE valid_to IS NULL;

-- Índice para queries históricas por producto
CREATE INDEX idx_ph_ean_valid_from
  ON price_history(ean, valid_from DESC);

-- Índice para queries por rango temporal
CREATE INDEX idx_ph_valid_from ON price_history(valid_from);

-- Scrape runs: telemetría de cada corrida
CREATE TABLE scrape_runs (
  id                   SERIAL PRIMARY KEY,
  retailer_id          SMALLINT NOT NULL REFERENCES retailers(id),
  started_at           TIMESTAMPTZ NOT NULL,
  finished_at          TIMESTAMPTZ,
  status               TEXT NOT NULL,        -- 'running' | 'success' | 'failed'
  products_scraped     INTEGER,
  products_new         INTEGER,
  errors_count         INTEGER,
  error_summary        JSONB
);
