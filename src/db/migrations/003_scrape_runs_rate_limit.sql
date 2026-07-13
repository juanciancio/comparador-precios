-- Contador de respuestas 429 (rate limit) por corrida. Métrica operativa:
-- si una corrida full ve >20 hits, revisar concurrencia/jitter antes de repetir.
ALTER TABLE scrape_runs
  ADD COLUMN rate_limit_hits INTEGER NOT NULL DEFAULT 0;
