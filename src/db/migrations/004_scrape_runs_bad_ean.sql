-- Contador de EANs mal formados (skipeados) por corrida. Canario de data
-- quality: si en el tiempo este número explota respecto al histórico, algo
-- cambió en la data cruda del retailer. Consulta operativa:
--   SELECT bad_ean_total FROM scrape_runs ORDER BY finished_at DESC LIMIT 10;
ALTER TABLE scrape_runs
  ADD COLUMN bad_ean_total INTEGER NOT NULL DEFAULT 0;
