# NEXT SESSION — punto de entrada

> Doc de arranque para la próxima sesión. Estado del proyecto al cierre de Fase 2.
> Fuente de verdad de decisiones: `CLAUDE.md`. Estado operativo diario: `LATEST_RUN.md`.

---

## 1. Estado actual

**Fase 2 cerrada. Sistema en autopilot.**

- **Dos retailers scrapeados y persistidos** con el mismo pipeline: Masonline
  (~12.2k productos con precio) y Carrefour (~26.3k productos con precio).
- **GitHub Actions corre el scraping diario** (`daily-scrape.yml`, 04:00 ART):
  Masonline → Carrefour → reporte cruzado, y commitea `LATEST_RUN.md`. Health
  check semanal (`health-check.yml`) como canario de degradación.
- **Match cross-retailer estable: ~3.977 EANs** (última corrida de cierre; se
  mueve en el rango ~3.9k entre corridas por drift natural de precios/stock, no
  por bugs). Excluye la marca catchall "Genérico" (ver `CLAUDE.md` →
  "Data quality signals conocidas").
- **Invariantes vigentes:** todo `price_history.price > 0`; EANs normalizados a
  forma canónica; idempotencia real (input idéntico por producto → cero escrituras).

Nada bloqueante abierto. El sistema se alimenta solo.

---

## 2. Qué se está esperando (antes de decidir frontend)

**No arrancar el frontend todavía.** Falta data para una decisión informada:
**web reflexiva vs app con notificaciones push.**

Se necesitan **5-7 días de historia diaria acumulada** (a partir de ~2026-07-19)
para medir la **frecuencia real de cambios de precio**. La pregunta que responde
esa data:

- Si los precios cambian **seguido** (muchas vigencias nuevas por día) → hay caso
  para **notificaciones push** (app: "bajó el producto que seguís").
- Si cambian **poco** (pocos cambios por día) → una **web reflexiva** (mirás
  cuando querés) alcanza y sobra; no justifica una app.

La decisión frontend (punto 1 de "Decisiones abiertas" en `CLAUDE.md`) se toma
**con este número en la mano**, no antes.

---

## 3. Casos de estudio pendientes para `suspicion_score` (Fase 3)

El `suspicion_score` (Fase 3) necesita reglas calibradas con casos reales. Estos
tres salieron del top-20 de diferencias del reporte cruzado y **requieren
investigación de campo** (mirar las fichas reales en cada sitio) antes de escribir
las reglas:

1. **Motorola Moto G67 256GB** (+83% de diff, EANs `7790894901943` /
   `7790894902018`). Masonline $499.999 vs Carrefour $916.799. **Verificar si son
   el producto idéntico** o difieren en condiciones comerciales (financiación,
   bundle, versión de RAM/almacenamiento con mismo EAN). Es el caso "marca real,
   diff alta, ¿legítima?".

2. **H2oh! saborizadas** (+82% en cuatro sabores: limón, naranja, manzana, pomelo;
   EANs `7791813*`). Masonline $1.759,45 vs Carrefour $3.200. **Probable
   pack-vs-unidad** (una cadena vende la unidad 1,5L, la otra el pack) con el mismo
   EAN. Caso "mismo EAN, distinta unidad de venta".

3. **Iael — bolso kit de seguridad** (+1325%, EAN `7798160620154`). Masonline
   $3.999 vs Carrefour $56.990. **Probable error de carga catastrófico** en un
   retailer (dígito de más). Caso "outlier absurdo = data error, no promo".

Cada uno mapea a una regla candidata del score: (1) condiciones comerciales,
(2) mismatch pack/unidad por keywords, (3) umbral absurdo (`diff_pct > 200%` +
`precio > $500k`). **No se implementó `suspicion_score` todavía** — es un
mini-proyecto de Fase 3.

---

## 4. Query sugerida para el día 5-7 (frecuencia de cambios)

Determina si las notificaciones push tienen caso (app) o si una web reflexiva
alcanza. Cuenta vigencias nuevas (= cambios de precio/estado) por día y retailer:

```sql
-- NOTA: el schema usa modelo de vigencias, NO hay columna `scraped_at`.
-- `valid_from` (DATE) es el día en que empezó a regir un precio = el día del cambio.
SELECT valid_from, retailer_id, COUNT(*) AS cambios
FROM price_history
WHERE valid_from >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY valid_from, retailer_id
ORDER BY valid_from, retailer_id;
```

**Cómo leerlo:** el primer día de cada retailer infla el conteo (carga inicial de
vigencias); ignorar ese pico y mirar los días siguientes. Muchos `cambios/día`
sostenidos → push tiene caso. Pocos → web reflexiva.

Complemento útil (magnitud de los cambios, no solo cantidad):

```sql
SELECT valid_from, retailer_id,
       COUNT(*) AS cambios,
       COUNT(*) FILTER (WHERE has_promo) AS con_promo
FROM price_history
WHERE valid_from >= CURRENT_DATE - INTERVAL '7 days' AND valid_to IS NULL
GROUP BY valid_from, retailer_id
ORDER BY valid_from, retailer_id;
```

---

## 5. Estado operativo diario

**`LATEST_RUN.md`** (en la raíz del repo) es el reporte cruzado más reciente,
commiteado automáticamente por el workflow diario. Es la fuente rápida de "cómo
está el comparador hoy" sin tener que correr nada. Para regenerarlo a mano:
`pnpm report --cross-retailer`.

Para verificar salud del sistema a mano: `pnpm tsx bin/health-check.ts`.
