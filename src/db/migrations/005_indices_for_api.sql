-- Índices para la API (Fase 3.B). El listado con only_matched=true corre, por
-- cada producto, una subquery correlacionada:
--   SELECT COUNT(*) FROM price_history
--   WHERE ean = ? AND valid_to IS NULL AND is_available
-- Sin filtros extra, eso son ~34k evaluaciones. Con idx_ph_ean_valid_from el
-- planner ya usaba índice pero rondaba ~250ms (arriba del target de 200ms):
-- el índice trae la vigencia por EAN pero todavía filtra valid_to + is_available
-- en cada loop.
--
-- Este índice PARCIAL contiene solo las filas "precio actual y disponible"
-- (justo el predicado), keyed por ean. La subquery pasa a ser index-only:
-- cuenta entradas por ean sin tocar el heap. Verificado con EXPLAIN ANALYZE.
CREATE INDEX idx_ph_current_available
  ON price_history(ean)
  WHERE valid_to IS NULL AND is_available;
