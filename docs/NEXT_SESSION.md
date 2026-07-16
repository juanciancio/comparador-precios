# NEXT SESSION — punto de entrada

> Doc de arranque para la próxima sesión. Estado al cierre de la sesión de Fase 3.A / Fase A.
> Fuente de verdad de decisiones: `CLAUDE.md`. Estado operativo diario: `LATEST_RUN.md`.

---

## 1. Estado actual del proyecto

- **✅ Base técnica de descuentos COMPLETA (15/07/2026).** Los cuatro hallazgos
  accionables de `research/precios-descuento/HALLAZGOS.md` están implementados. Ver
  sección 2 abajo para el detalle y para la **ventana de inconsistencia de 24-48hs**.
  Lo que queda abierto de la investigación es de **producto, no técnico**: qué precio
  mostrar, qué hacer con el ~39% de descuentos de Carrefour sin metadata y el 100% de
  Masonline (indeterminables), y si se parsea el string de `DiscountHighLight`. Eso se
  decide en Fase B4.
- **Fase 2 cerrada:** scrapers Masonline + Carrefour en autopilot vía GitHub
  Actions (`daily-scrape.yml`, 04:00 ART) + health check semanal. Se alimenta solo.
- **Fase 3.A COMPLETA (14/07/2026) — API HTTP (NestJS):** montada en el mismo repo
  del scraper. **Lista para deploy; target decidido: Fly.io, región `gru`.**
  - **12 endpoints** funcionando (Health, Products ×5, Search ×2, Compare ×2,
    Categories, Brands).
  - **91 tests de integración** (Vitest + supertest, DB real) verdes: `pnpm test:api`.
    Más 25 unit del scraper: `pnpm test:unit`.
  - **OpenAPI pulida** (`/docs`): 12/12 endpoints con example y ≥2 response schemas.
  - Global exception filter (errores unificados + `trace_id`, 500 sanitizados) y
    timing interceptor (log estructurado + header `x-response-time-ms`).
  - **Dockerfile multi-stage** probado (node:20-alpine, runtime SWC sin build step,
    usuario no-root, healthcheck): imagen **~377MB**. El objetivo era <300MB; el
    piso lo fija SWC-at-runtime (@swc/core + typescript = 60MB, no pruneables). Se
    aceptó mantener la arquitectura sin build step (decisión de Fase A).
  - Ver `docs/API.md` para setup, endpoints, env vars y deploy.

Ver `CLAUDE.md` → sección **"API HTTP (NestJS)"** para stack, runtime, config de TS
y convenciones.

---

## 2. Sesión 15/07/2026 — base técnica de descuentos

Cuatro cambios, derivados de `research/precios-descuento/HALLAZGOS.md`.

### 2.1 Fix del bug de deserialización de Teasers ✅

VTEX serializa `Teasers` con los backing fields de C# (`<Name>k__BackingField`), no
con `Name`. El schema Zod buscaba `Name`, nunca matcheaba, y `promo_description`
quedó **NULL en las 47.358 filas** de la tabla sin que nadie lo notara.

- `vtexNamedEntrySchema` (`src/schemas/vtex-product.ts`) acepta **ambas** formas.
  `vtexEntryName` resuelve el nombre; `Name` tiene prioridad, el backing field es
  fallback. Si VTEX vuelve a cambiar la serialización, sigue funcionando.
- **Se consumen `Teasers` Y `PromotionTeasers`**, no una u otra. Son la misma promo
  con distinta serialización (verificado: nombres idénticos en 11/11 ofertas del
  dump, `PromotionTeasers` con claves limpias). `joinVtexNames` las une y
  **deduplica**, así que leer las dos no duplica el string y cubre el caso de que
  VTEX deje de mandar cualquiera de las dos.
- `DiscountHighLight` **también usa backing fields** — no estaba en el brief, se
  detectó revisando el dump. Usa el mismo parseo.

### 2.2 Captura de `DiscountHighLight` ✅

Es el campo que nombra el descuento **ya aplicado** a `price`, con condición y
vigencia en el string: `"PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7"`.

- Migración `007_discount_highlight.sql`: `price_history.discount_highlight TEXT`.
- **Va solo en `price_history`, no en `products`** (el brief pedía ambas). `products`
  es por-EAN y compartida entre cadenas: un highlight de Carrefour ahí pisaría al de
  Masonline en cada corrida, replicando la volatilidad conocida de `category_path`.
  El highlight es estado de precio: por retailer, por vigencia.
- Se guarda **crudo, sin parsear**. El string es convención interna del retailer
  escrita a mano, sin contrato. Parsearlo es frágil; guardarlo preserva el dato para
  cuando Fase B4 decida qué hacer con él.
- **Es campo relevante** para el modelo de vigencias: si cambia la campaña sin mover
  el número, sigue siendo un cambio de estado del precio. Mismo criterio que
  `promo_description`.
- **Sin retro-poblado** — no tenemos el histórico y no se puede reconstruir. Las
  filas previas quedan en NULL permanente. La data limpia arranca en la primera
  corrida post-deploy.

### 2.3 Semántica honesta de `has_promo` ✅

Antes: `Teasers.length > 0`, que significaba casi lo **contrario** de lo que parece.
Un teaser es un descuento de checkout que **no** está aplicado a `price` (típicamente
"Tarjeta Carrefour 15%"). Daba 12.450 filas de Carrefour con `has_promo = true` y
cero descuento, y **0 filas en Masonline** pese a sus 2.518 productos con descuento
real.

Ahora: **`has_promo = (list_price > price)`** (`computeHasPromo` en `transform.ts`).

- Se deriva en `load`, sobre los valores **ya redondeados que se escriben** — no en
  `extract` sobre los crudos. Por eso `hasPromo` salió de `ExtractedSku`: no se
  captura de VTEX, se deriva, y tener dos fuentes de verdad permitía que
  discreparan por redondeo.
- **También en la ruta de arrastre** (producto no disponible). `load` hardcodeaba
  `has_promo: false` ahí; con la definición nueva eso dejaría filas que se
  contradicen a sí mismas (`list_price > price` con el flag apagado). El invariante
  **`has_promo === (list_price > price)` vale sobre toda fila que el scraper escribe**,
  y hay un test que lo verifica.
- `promo_description` y `discount_highlight` **sí** se limpian en el arrastre: no los
  estamos observando, y arrastrarlos afirmaría una promo vigente que no vimos.

### 2.4 `list_price` en la API ✅

**El brief asumía que no estaba expuesto; ya lo estaba.** `RetailerOfferSchema` y
`PriceHistoryEntrySchema` incluyen `listPrice` (además de `hasPromo` y
`promoDescription`) desde Fase 3.A. O sea que `/products`, `/products/:ean`,
`/products/:ean/price-history`, `/products/recent-changes`, `/search` y
`/products/:ean/refresh` **siempre** lo devolvieron — el frontend nunca lo consumió.

- El único que faltaba era **`/compare`**, que tenía shape propio de precios. Se le
  agregaron **`masonline_list_price` y `carrefour_list_price`** (snake_case, según el
  contrato ya fijado para `*_price`). Nullable: la columna lo admite, aunque hoy sean
  0 NULLs de 47.358 filas.
- **`diff_pct` y `cheaper` siguen sobre `price`, sin cambios.** Comparar sobre precios
  de lista es decisión de producto de Fase B4.
- `hasPromo`/`promoDescription` **quedan expuestos** (decisión de Juan). Removerlos
  sería breaking; el fix los mejora solos: `promoDescription` pasa de NULL a poblado y
  `hasPromo` de basura a dato honesto. El shape no cambia.

### ⚠️ Ventana de inconsistencia post-deploy (24-48hs)

`has_promo` se corrige **fila por fila, a medida que el scraper reescribe cada
producto**. No hubo backfill destructivo: el ciclo diario limpia solo. Durante las
primeras 24-48hs conviven filas con semántica vieja y nueva.

- La corrección es automática: `unchanged()` compara el `has_promo` nuevo contra el
  almacenado, así que una fila con semántica vieja da "cambió" y se reescribe.
- Las filas que el scraper **no** toca (productos desaparecidos del catálogo)
  conservan el `has_promo` viejo hasta que el reaping las cierre. Por eso el test del
  invariante se acota a `is_available`.
- Ese primer ciclo genera **más vigencias nuevas de lo normal** (`has_promo` y
  `discount_highlight` cambian para muchas filas sin que el precio se haya movido).
  Es esperado, es de una sola vez, y no es drift de precios.

### Perf

- **Scraper: +0,002% del tiempo total de corrida.** El costo agregado es parsear dos
  arrays más por oferta. Medido sobre los dumps reales (viejo vs nuevo, mismo
  payload): el parseo de una oferta pasa de 0,00203ms a 0,00328ms, **+61,9% en
  relativo pero +0,14s en absoluto** sobre las 108.781 ofertas de Carrefour, contra
  una corrida de ~110 min. El pipeline está dominado por I/O de red y paginación
  secuencial: `extract` entero es el **0,03%** del tiempo (2,2s de CPU). Muy por
  debajo del techo de 10-15%. Los benchmarks son reproducibles contra
  `research/precios-descuento/dumps/`.
- **API: sin regresión.** `/compare` agrega dos columnas del mismo `JOIN` que ya se
  hacía: sin queries nuevas, sin JOINs nuevos. Medido con la query real
  (`limit=100`, 12 corridas, mediana): **98,3ms con `list_price` vs 107,8ms sin** —
  el "nuevo" sale más rápido, o sea que la diferencia es ruido de medición. `EXPLAIN
  (ANALYZE, BUFFERS)` confirma el **mismo plan**. Los otros cinco endpoints no
  cambiaron de shape, así que no hay nada que medir en ellos.

---

## 3. Sesión anterior (Fase A) — qué quedó hecho

- **Bootstrap NestJS con runtime SWC** (`@swc-node/register`, NO tsx — esbuild no
  emite decorator metadata y rompe la DI de Nest; detalle en `CLAUDE.md`).
- **Health check real:** `GET /health` hace `SELECT 1` contra Supabase; 200 si la
  DB responde, 503 si no.
- **Swagger UI en `/docs`**, spec JSON en `/docs-json` (título "Comparador de
  Precios API" v0.1).
- **DatabaseModule global** reusa el singleton `src/lib/db.ts` (token
  `PG_CONNECTION` / `@InjectPg()`), sin segundo pool.
- Throttler 100/min por IP, CORS por env, `ZodValidationPipe` global cableado,
  env validado con Zod (`src/api/config/env.ts`).
- **Ambos typechecks verdes:** `pnpm typecheck` (scraper) y `pnpm api:build` (API).
- Commit: `feat(api): bootstrap NestJS app with health check`.
- **Puerto default de dev: `3100`** (el 3000 colisiona con frameworks frontend y,
  en la máquina de Juan, con un túnel SSH). Correr con `pnpm api:dev`.

---

## 4. Próximos pasos en orden

Fase 3.A (Fases A→E) está **completa**. Lo que sigue:

**Inmediato — Deploy de la API:**

- Target **decidido: Fly.io, región `gru`** (São Paulo, la más cercana a AR). Cierra
  la decisión abierta #7 de `CLAUDE.md`.
- El `Dockerfile` ya está probado y funcionando (build + run + healthcheck OK).
- Envs mínimas en el target: `DATABASE_URL` (Session pooler de Supabase),
  `NODE_ENV=production`, `CORS_ORIGINS` con el dominio de la PWA. Ver tabla en
  `docs/API.md`.
- Al deployar, apuntar el healthcheck del proveedor a `/health`.

**Después — Fase 3.B (PWA):**

- PWA con **Next.js en repo separado**, consumiendo el OpenAPI (`/docs-json`).
- Mostrar timestamp "actualizado hace X" (ver "Arquitectura de refresh de precios").
- Consumir `POST /products/:ean/refresh` desde la ficha detalle.
- Implementar el `suspicion_score` en el frontend (decisión abierta #6): reglas
  `diff_pct > 200%`, precio absoluto > $500k, mismatch pack/unidad.

**Fase 3.C (post-lanzamiento):** SSE broadcast (ver "Arquitectura de refresh de precios").

---

## Arquitectura de refresh de precios (roadmap decidido)

Los precios en retailers argentinos se mueven intradiariamente (verificado empíricamente con Motorola G67 el 14/07/2026: cambió de $499.999 a $599.999 entre el scrape de 6AM y las 10AM). El scrape diario captura snapshots; la data envejece varias horas antes del próximo scrape. No es bug, es frecuencia de sampleo.

**Estrategia multi-capa:**

- **Scrape diario:** base del catálogo, historia, listados amplios. Ya implementado y en autopilot.
- **Refresh on-demand con TTL comunitario 60s:** fichas detalle, comparaciones puntuales. Endpoint `POST /products/:ean/refresh`. A implementar en Fase B.
- **SSE broadcast a rooms por categoría (futuro):** cuando un refresh cambia un precio, todos los usuarios viendo esa categoría reciben el update en vivo. Efecto de red genuino y moat competitivo — cuantos más usuarios activos, más fresca la data para todos.
- **Timestamp visible siempre en frontend:** "actualizado hace X". Gestiona expectativas del usuario sobre frescura.

**Implementación gradual:**

- **Fase 3.A (ahora, en Fase B):** endpoint refresh simple con TTL comunitario 60s.
- **Fase 3.B (PWA):** consumo del endpoint desde ficha detalle + timestamp visible en UI.
- **Fase 3.C (post-lanzamiento, cuando haya usuarios reales):** SSE broadcast con rooms por categoría top-level. Sin usuarios reales no aporta valor — es sobreingeniería.
- **Fase 4 (app nativa):** push notifications sobre SSE events para productos "seguidos".

**Notas de diseño para cuando llegue Fase 3.C:**

- Preferir SSE sobre WebSockets bidireccionales. Es la mitad de complejo, funciona sobre HTTP normal (más fácil de proxear detrás de Cloudflare), y alcanza para el caso de uso (server → cliente únicamente; el trigger de refresh sigue siendo POST HTTP normal).
- Rooms por categoría top-level (Almacén, Electro, etc.). El frontend se suscribe automáticamente a la categoría en que está el usuario; cambia de room al navegar. Simple para el frontend, moderado en carga.
- Cada evento incluye `updated_at` timestamp para que el frontend descarte eventos out-of-order.

**Cómo el TTL comunitario resuelve escenarios adversariales:**

Si 500 usuarios abren el mismo producto en 10 segundos (por ejemplo, un influencer lo mencionó), sin coordinación dispararían 500 requests contra VTEX. VTEX rate-limitea al tercero. Con TTL comunitario 60s, solo el primero dispara fetch real; los otros 499 obtienen esa data recién refrescada. Y si el precio cambió, TODOS los 500 se enteran instantáneamente vía SSE (cuando se implemente). El escenario adversarial se convierte en el escenario ideal.

---

## 5. Contexto operativo

- Sistema de scraping funcionando: `LATEST_RUN.md` tiene el estado diario.
- Dataset actual: ~12k productos Masonline, ~26k Carrefour, ~3.9k matches
  cross-retailer por EAN (excluye "Genérico").
- **La API se prueba contra la DB real de Supabase, cero mocks en checkpoints.**
- Health del scraper a mano: `pnpm tsx bin/health-check.ts`.

---

## 6. Monetización (postponed — decisión estratégica, no se codea ahora)

- **No hay monetización activa en esta fase.** Los ~$5-40/mes de infra los cubre
  Juan como inversión.
- **Al lanzar la PWA públicamente:** links de afiliado a los retailers comparados
  (investigar programa Awin / Carrefour AR) + botón "Invitame un cafecito" en el
  footer. Cero fricción ética, cero intrusividad visual.
- **Freemium y B2B** (venta de data agregada a medios/fintech/consultoras):
  evaluados para 12-18+ meses, no ahora.
- **Consideración de diseño para no cerrar puertas:** cuando el frontend haga "ir
  a comprar en X retailer", enviar un evento a un endpoint de tracking propio
  **antes** del redirect. No se implementa ahora, pero se tiene en mente al
  diseñar la API pública para la PWA.

---

## 7. Convenciones ya establecidas (no reinventar)

- TS estricto, cero `any`.
- Zod para todo input, sin `class-validator`.
- Sin ORM; driver `postgres` compartido con el scraper.
- Un commit por fase, mensajes en inglés `feat(scope): ...`.
- Checkpoint aprobado antes de cada fase.
- Commits directo a `main` (proyecto de un solo dev, sin ceremonia de branches).
- Timezone `America/Argentina/Buenos_Aires` para presentation de fechas.
- Imports con `.ts` explícita en todo el repo, incluido `src/api` (ver `CLAUDE.md`).

---

## 8. Aprendizajes de data / debugging (tener presente)

- **Los precios en retailers argentinos se mueven intradiariamente.** Nuestro
  scrape diario captura snapshots; la data puede envejecer varias horas antes del
  próximo scrape. No es bug, es frecuencia de sampleo. **Diseñar el frontend con
  "última actualización: hace X" visible.**
- **Cuando algo no cierra en verificación manual, no saltar a hipótesis complejas
  antes de comparar fetch actual con DB.** La explicación más simple (el mundo real
  cambió) suele ser la correcta.

---

## Aprendizajes operativos (14/07/2026)

- **Los precios en retailers argentinos se mueven varias veces al día.** El scrape diario captura snapshots fieles al momento de la corrida, pero la data puede envejecer horas antes del próximo scrape. Cualquier comparación entre "DB nuestra" y "web en vivo" puede diferir sin que sea bug del sistema.

- **Cuando algo no cierra en verificación manual, la explicación más simple (el mundo real cambió) suele ser la correcta.** No saltar a hipótesis complejas (bug de mapeo VTEX, diferencia regional por IP, error de load) antes de comparar el fetch actual con la DB. El test más simple: fetchear el producto en vivo desde el mismo cliente que usa el scraper y comparar contra lo que hay guardado. Si difieren, es staleness normal.

- **La verificación manual visual detectó un no-bug que ningún health check hubiera detectado.** El sistema tenía data internamente consistente pero desactualizada respecto a la realidad. Los health checks actuales miden invariantes de calidad (`price > 0`, EANs únicos, `rate_limit_hits` bajos), no frescura contra realidad externa. Es un límite esperado del monitoreo automatizado, no un fallo — solo hay que tenerlo en mente al diseñar frontend (mostrar timestamp de última actualización siempre).

- **El diseño del suspicion_score debe basarse en reglas concretas derivadas de casos verificados manualmente, no en abstracciones.** Caso Motorola G67 (EAN 7790894902018): diferencia de 53-83% (dependiendo del momento) entre Masonline y Carrefour, mismo producto físico, sin promos activas en ninguna cadena. Diagnóstico: diferencia real de mercado, no anomalía. **Score BAJO** — no requiere warning especial en el frontend, es competencia genuina de precios.

- **Cuando se definen buckets numéricos que aparecen en múltiples lugares (reporte batch + endpoint API + eventualmente frontend), la regla de fronteras (left/right-inclusive) debe estar explicitada como constante compartida, no reimplementada en cada lado.** Convención decidida: left-inclusive, right-exclusive (estándar numpy/pandas), sobre `ABS(diff_pct)` **ya redondeado a 2 decimales** (el mismo valor exhibido). Vive en `src/lib/diff-buckets.ts` (`DIFF_BUCKET_EDGES`, `diffBucketIndex`, `DIFF_TIE_TOLERANCE_PCT`), importado por el reporte y por `/compare/stats`. Detectado 14/07/2026 en Fase C. **Matiz del diagnóstico:** la regla de fronteras ya era left-inclusive en ambos lados; el desvío real (4 productos) venía del **redondeo** — el endpoint bucketeaba el diff crudo y el reporte el redondeado. Los 114 productos "exactamente en frontera" (5/10/25/50%) NO causaban discrepancia: al ser ambos left-inclusive, caían en el mismo bucket en las dos implementaciones. Lección secundaria: verificar la hipótesis de la causa antes de asumirla — la que parecía obvia (criterio de fronteras) no era la real (redondeo).

- **La verificación manual escala hasta cierto punto**. En Fase B/C detectamos manualmente: staleness intradiaria (Motorola), redondeo de diff_pct (114 productos frontera), sinónimos en search (coca light). Después de eso, empezó a haber muchas reglas sutiles conviviendo. Los tests automatizados de Fase D son la red que evita que futuros cambios rompan reglas ya establecidas.

### Deuda técnica identificada (no bloqueante)

Tres ítems, ninguno bloquea el deploy. Los tres tienen un umbral explícito para
saber cuándo dejan de ser aceptables — no revisitarlos antes.

- **`category_path` es volátil entre corridas.** Vive en `products` (por EAN, no
  por retailer) y el load lo pisa sin COALESCE: refleja el último retailer que
  procesó el producto, no un consenso. **El detalle vive en `CLAUDE.md` → "Nota
  sobre volatilidad de category_path"** (incluye el contraste con `brand`, que en
  el mismo `ON CONFLICT` tiene la semántica opuesta). Impacto hoy: bajo, los
  filtros andan porque filtran contra el path presente. Umbral: cualquier
  agregación o join que asuma "categoría estable por producto" va a driftear entre
  corridas del scraper. Regla práctica al medir por cadena: hacerlo sobre productos
  **exclusivos** de esa cadena. Detectado 14/07/2026 en el análisis de top-levels.

- **Índice sobre `valid_to IS NOT NULL` deliberadamente NO agregado.** El driver de
  `/products/recent-changes` hace Seq Scan sobre las filas cerradas (5.611 de
  44.218 = 12,7%). A esa selectividad el planner elige seq scan y tiene razón, y un
  índice parcial sobre ese predicado se volvería *menos* selectivo con el tiempo:
  la proporción de filas cerradas tiende a 100%. La query default corre en 131ms
  contra un target de 300ms. Umbral: el driver escala lineal con la historia (~5k
  filas/día ⇒ ~1,8M al año); cuando la mediana del endpoint pase 300ms, la salida
  es indexar **por recencia del cambio**, no por `valid_to IS NOT NULL`. Ver
  "Decisiones de recent-changes".

- **`loadRun` precarga catálogo completo del retailer en cada refresh**
  (~12-26k filas), aunque el refresh toque un solo producto. O(catálogo) por
  llamada. Con TTL comunitario 60s el volumen está acotado; no impacta MVP.
  Umbral: cuando la mediana de duración del endpoint supere 500ms o el CPU de
  Supabase pase 60%, refactorizar a un path `loadRunForSingleEan(ean)` que hace
  SELECT puntual en vez de precarga. Detectado en Fase B (14/07/2026).

---

## Endpoints y params agregados el 14/07/2026

Un endpoint nuevo y tres cambios de params. Todos con tests de integración.

| Cambio | Qué | Commit |
| --- | --- | --- |
| **`GET /products/recent-changes`** | Endpoint nuevo. Productos con cambio de precio en las últimas N horas, para la home de la PWA. Params: `limit` (def 8, max 30), `hours` (def 48, max 168), `min_diff_pct`. Mismo envelope que `GET /products`. | `15cd069` |
| **`sort_by` / `sort_dir` en `/search`** | Alinea `/search` con `/products` (mismos valores; no hay `relevance` porque sin FTS no hay ranking). | `d91de1e` |
| **`brand` multi-valor** | En `/products` y `/search`. Repetible, OR entre valores: `?brand=Natura&brand=Cocinero`. | `d96a899` |
| **`category_top`** | En `/products` y `/search`. Match exacto contra el departamento top-level, repetible, OR entre valores. **Depreca `category`** (substring inseguro: `?category=Limpieza` trae 867 productos de fuera de `/Limpieza/`). Ver `docs/analysis/top-levels-2026-07-14.md`. | `3a55e5e` |

---

## Endpoints agregados hoy (15/07/2026)

### `GET /search/facets` — facets de marca para el sidebar

Alimenta el sidebar de filtros de `/buscar?q=...` y `/categoria/[slug]` en la PWA.
Antes no había forma de obtener estos contadores: `/brands` es global y no se
scopea, y el frontend midió que juntarlos client-side vía paginación tomaba ~3.4s
y 19 requests para Almacén.

Params: `q` (opcional, ≥2 chars), `category_top` (repetible), `only_matched`,
`brand_query` (nuevo, filtra marcas por substring), `limit` (def 10, max 50).
Respuesta: `{ brands: [{ name, count }] }`. **No acepta el `category` deprecado**
— es endpoint nuevo, no hay backwards-compat que sostener.

**La invariante de scope es la razón de ser del diseño.** Los counts se calculan
sobre exactamente el mismo conjunto de productos que devolverían `/search` o
`/products` con esos params, **antes** del filtro de marca. Si divergieran, los
números del sidebar mentirían respecto de la grilla de al lado. Se sostiene con
código, no con disciplina: el recorte se traduce a SQL en un único
`ProductsRepository.scopeSql()` que consumen `listProducts` (o sea `/products` y
`/search`) y `brandFacets`. Los términos de `q` salen de un único `toTerms()` en
`search.service.ts`. Hay 4 tests que suman los counts de un scope y exigen que den
el `total` del listado; se verificaron con mutación (romper `only_matched` en los
facets hace fallar 3 tests, incluido el de invariante).

Facets **estáticos** a propósito: no se recalculan cuando el usuario tilda marcas.
Eso es lo que permite ver "otras marcas disponibles en este scope" y que los
números no se muevan al filtrar.

**Genérico NO se excluye, ni siquiera con `only_matched=true`** (decisión de Juan,
15/07/2026). La regla dura del proyecto aplica a comparaciones de precio
cross-retailer (`/compare`, `matched_count`, `recent-changes`); `only_matched` solo
filtra por disponibilidad en ≥2 cadenas y nunca la excluyó. Excluirla en los facets
rompería la invariante contra `/products?only_matched=true`, que sí devuelve los 149
productos catchall (109 `Generico` + 40 `Genérico`). **Pendiente:** hay una
discusión abierta sobre si `only_matched` *debería* excluir marcas catchall — es
semánticamente raro que las incluya —, pero es cambio de scope de `/products` y
`/search`. Tratar en sesión aparte **antes de Fase B4**.

Counts observados al implementar (spot-check):

| scope | productos | marcas | top 5 |
| --- | --- | --- | --- |
| `q=leche` | 412 | 125 | La Serenísima 45, Carrefour 36, Milka 17, Gadnic 15, Las Tres Niñas 15 |
| `category_top=Almacén` | 1843 | 245 | Carrefour 317, Genérico 86, Alicante 65, La Parmesana 60, Knorr 53 |

Suma de counts = total del scope en ambos (412 y 1843). Coincide con lo que midió
el frontend.

**Sin índices nuevos.** Medido con `EXPLAIN ANALYZE`: sin scope 11ms,
`category_top=Almacén` 14ms, Almacén + `only_matched` 23ms. El único que pasa de
100ms es el scope con `q` (**137ms** para `q=leche`): el `ILIKE '%term%'` con
wildcard inicial no puede usar btree y hace Seq Scan sobre las 34.965 filas de
`products`. **No es deuda nueva** — es el mismo costo que `/search` ya paga hoy, y
se resuelve junto con el FTS pendiente (ver backlog): un `tsvector` + GIN, o un
índice trigram `USING gin (name_canonical gin_trgm_ops)` si se quiere atacar solo
la latencia sin tocar el ranking. **No aplicado**, a la espera de revisión.

#### `brand_query` insensible a acentos y ñ — FIXED 15/07/2026

**Destraba B3.2** (sidebar de filtros, ya integrado en main del frontend).

El filtro era `ILIKE '%texto%'`: case-insensitive pero sensible a acentos y ñ.
Nuestro usuario es argentino tipeando en celular, donde no tildar es la norma.
El caso grave no era devolver vacío sino **devolver la marca equivocada**:
`brand_query=serenisima` traía `La Serenisima Baby` (3 productos, el catálogo la
tiene sin acento) y **no** `La Serenísima` (45 en `q=leche`). El usuario creía
haber encontrado la marca y filtraba 3 productos equivocados — data que miente
sin avisar. `generico` y `tres ninas` devolvían vacío.

Fix: `unaccent()` de los dos lados, tanto en el filtro como en la comparación de
**prefijo** del ORDER BY (`ProductsRepository.unaccentIlike`). El prefijo importa
tanto como el filtro: sin unaccent ahí, `'Éxito' ILIKE 'ex%'` es false y la marca
cae al grupo substring, sepultada detrás de `Tex` (975 productos) pese a que el
usuario tipeó su prefijo exacto. Hay un test que ancla justo ese caso.

Alcance quirúrgico: **solo** `brand_query` de `/search/facets`, que es texto libre
tipeado. El filtro `brand` de `/products` y `/search` sigue siendo match exacto —
recibe el nombre canónico que el sidebar tildó, no algo tipeado.

**La cadena `brand_query` → `brand` es consistente, no hay bug ahí.** El facet
agrupa con `GROUP BY p.brand` sobre la columna cruda, así que cada fila es una
marca exacta y su count es el del match exacto; unaccent decide **qué marcas se
listan**, no **cómo se agrupan**. El count que ve el usuario es el que obtiene al
tildar, aunque haya tipeado sin acento. Anclado en un test que contrasta cada
facet contra `/products?brand=<nombre exacto>`.

Efecto lateral que conviene conocer: `brand_query=generico` ahora devuelve
`Genérico` (2294) **y** `Generico` (1313) como opciones separadas, igual que
`aguila` trae `Aguila` y `Águila`. Es correcto — son marcas distintas en la DB y
se tildan por separado —, pero es la cara visible de la **fragmentación de marca**
documentada más abajo (116 pares). Si algún día se decide fusionarlas, es ahí y no
acá.

**Migración `006_unaccent_extension.sql`.** `CREATE EXTENSION IF NOT EXISTS
unaccent`, **sin acción manual en el dashboard de Supabase**: la conexión de la app
(usuario `postgres`) puede crearla. En Supabase la extensión vive en el schema
`extensions` (convención de la plataforma, junto a pgcrypto y uuid-ossp); la
migración no fuerza `WITH SCHEMA` para no romper el Postgres local de dev, donde
ese schema no existe y la extensión aterriza en `public`. Ambos están en el
search_path de su plataforma.

**Sin índice, y el que parecía obvio no existe.** `CREATE INDEX ... (unaccent(brand)
text_pattern_ops)` **falla**: `unaccent()` es STABLE (depende del diccionario), no
IMMUTABLE, y Postgres exige IMMUTABLE en expresiones de índice. Se podría envolver
en una función IMMUTABLE, pero sería mentirle al planner. Y aun así no serviría:
un btree con `text_pattern_ops` solo cubre `LIKE 'prefijo%'`, no el `'%texto%'` con
wildcard inicial que usa el filtro. Medido, no hace falta (mediana de 12 corridas):

| scope | sin `brand_query` | con `brand_query` + unaccent |
| --- | --- | --- |
| sin scope | 11.0ms | 77.1ms |
| `category_top=Almacén` | 13.3ms | 15.5ms |
| `q=leche` | 135.8ms | 136.1ms |

unaccent cuesta ~2µs por fila: se nota solo sin scope (35k filas → +66ms), es
marginal en Almacén (+2ms) y nulo en `q=leche`, donde el Seq Scan del `q` ya
domina. Nada pasa de 100ms, y sin `brand_query` la función ni se evalúa. El plan
ya era Seq Scan antes del fix: no hay degradación de plan, solo CPU por fila.

---

## Endpoints y params pendientes (backlog)

Nada de esto bloquea el deploy ni la Fase 3.B. Ordenados por cuán bloqueados están.

- **`sort_by=price` en `/products` y `/search` — BLOQUEADO, requiere decisión de
  producto.** La semántica es ambigua: un producto tiene hasta dos precios vigentes
  (uno por cadena), así que "ordenar por precio" puede significar el más barato, el
  de una cadena elegida, o el promedio. Y los productos de una sola cadena tendrían
  que ordenarse contra los de dos. **No implementar hasta que Juan defina la
  semántica**; no hay default obvio que no sorprenda a alguien.

- **`sort_by=diff_pct_abs` en `/products` y `/search`.** Hoy solo existe en
  `/compare` (junto con su alias `diff`). Llevarlo a `/products` implica decidir qué
  pasa con los no-matcheados, que no tienen diff: excluirlos (como hace `/compare`)
  cambiaría el universo del listado, que es justamente lo que `/products` no hace.
  Emparentado con el punto anterior — conviene resolver los dos juntos.

- **FTS en `/search`.** Hoy es multi-término con `ILIKE '%term%'` (AND entre
  términos, OR entre `name` y `brand`). Sin índice de texto no hay ranking, por eso
  `sort_by` no ofrece `relevance` y el default es nombre asc. Limitación conocida y
  verificada: "coca light" no matchea sinónimos. Cuando se implemente, `tsvector` +
  GIN y ahí sí agregar `sort_by=relevance`.

- **`suspicion_score`.** Decisión abierta #6 de `CLAUDE.md`; se implementa en el
  frontend. **Los fixtures ya están documentados** — ver "Casos de estudio para
  suspicion_score" al final de este archivo: el caso ancla (EAN `7896015519223`,
  brand "100 Pipers" sobre una pasta Sensodyne), 9 mismatches más de regresión, los
  4 tipos de falso positivo que hay que esquivar, y la fragmentación de marca (116
  pares) con la advertencia de que Levenshtein solo no alcanza.

### Ya implementados (histórico)

- ~~**GET /products/recent-changes?limit=N**~~ — **IMPLEMENTED 14/07/2026.**
  Params: `limit` (default 8, max 30), `hours` (default 48, max 168),
  `min_diff_pct` (opcional). Devuelve el envelope de `GET /products`, así que
  chango-web puede tirar el workaround (`/compare?sort_by=diff_pct_abs` + N
  fetches de `/products/{ean}`) y reusar el cliente tipado tal cual. Ver
  "Decisiones de recent-changes" abajo.

---

## Decisiones de recent-changes (14/07/2026)

> Las **reglas** del endpoint viven en `CLAUDE.md` → "Reglas de recent-changes"
> (fuente de verdad). Acá queda solo la evidencia medida que las respalda.

- **Ventana sobre `first_seen_at`, no `valid_from`** (regla en `CLAUDE.md`).
  Matiz que no está allá: el caso de retroactividad intradiaria (segundo cambio
  del mismo día, que hace UPDATE in-place y deja `first_seen_at` en el insert
  original) sigue cayendo dentro de cualquier ventana de 24hs, así que la regla
  no lo pierde.

- **Los números detrás de "la ventana no filtra nada" (14/07/2026):** de las
  38.607 filas vigentes, las 38.607 tienen `first_seen_at` dentro de las últimas
  48hs — el catálogo nació el 13/07. Los 5.313 EANs con cambio real salen enteros
  de exigir precio anterior distinto. En el batch del 14/07: 5.424 cambios de
  precio, 187 filas nuevas que repiten precio (promo/disponibilidad) y 14 primeros
  avistajes, los dos últimos grupos correctamente excluidos.

- **Sin migración de índice.** La query default corre en **131ms** (target: 300ms).
  El plan usa `idx_ph_ean_valid_from` para el LATERAL al precio anterior,
  `products_pkey` y `idx_ph_current_available` para los techos. El único Seq Scan
  es el driver (`valid_to IS NOT NULL`: 5.611 de 44.218 filas): a 12,7% de
  selectividad el planner elige seq scan y tiene razón, y un índice parcial sobre
  ese predicado se volvería *menos* selectivo con el tiempo (la proporción de
  filas cerradas tiende a 100%). **Deuda a futuro:** ese driver escanea todas las
  filas cerradas históricas, así que crece lineal con la historia (~5k filas/día
  ⇒ ~1,8M al año). Cuando la mediana del endpoint pase 300ms, la salida es
  indexar por recencia del cambio, no por `valid_to IS NOT NULL`.

- **El driver es el lado chico a propósito.** Arrancar por las filas vigentes y
  buscar la anterior con LATERAL da el mismo result set pero corre 38.353
  lookups en vez de 5.611: medido, **1785ms vs 131ms**. Si alguien "simplifica"
  la query hacia esa forma, es una regresión de 13x.

- **Que el top-N quede dominado por productos de una sola cadena es esperado y
  correcto — decisión tomada, no pendiente.** El endpoint ordena por magnitud de
  cambio y no filtra por comparabilidad: qué mostrar es responsabilidad del
  consumidor. El frontend pasa `min_diff_pct=N` (que ya exige ambas cadenas)
  cuando la home quiera solo comparables. No se le pone `only_matched` por default.

---

## Casos de estudio para suspicion_score

Casos verificados a mano, para usar como fixtures cuando se implemente el score
(decisión abierta #6 en `CLAUDE.md`). Precedentes previos, todavía sin curar acá:
**Motorola G67** (ver "Aprendizajes operativos" arriba — diferencia real de
mercado, score BAJO) y los outliers del reporte cross-retailer en `LATEST_RUN.md`
(**Ilko** $4.3M, **Iael** 1325% diff, **Doble G** 300% diff, **H2oh!**).

- **Brand mismatch con nombre del producto**. Verificado 14/07/2026 durante Fase
  B3.1 del frontend. Producto con `brand="100 Pipers"` (marca de whisky) pero
  `name="Crema Dental Sensodyneext Fresh Blanqueamiento"`. Es error de catálogo
  del retailer (probablemente copy-paste incorrecto de brand al cargar el SKU).
  Detectable con fuzzy match brand vs primeras 2-3 palabras del name — si el
  Jaccard similarity o Levenshtein normalizado cae por debajo de un umbral, señal
  fuerte de data quality issue.

  **Score sugerido: ALTO (100+ pts).** Este tipo de mismatch afecta agregaciones
  downstream: cuando la home aplique dedup por marca, dos productos Sensodyne van
  a pasar el filtro porque el sistema los cuenta como marcas distintas.

  **EAN del caso: `7896015519223`.** Presente en ambas cadenas, así que el score
  se puede testear sobre un producto matcheado:
  - masonline: `Crema Dental Sensodyneext Fresh Blanqueamiento 50gr` ← de acá sale
    el `name_canonical` (el load hace `COALESCE(products.brand, EXCLUDED.brand)`:
    gana el primer retailer que lo vio, y nunca se pisa).
  - carrefour: `Pasta dental Sensodyne blanqueador extra fresh 50 g.`

  Query de reproducción:

  ```sql
  SELECT ean, brand, name_canonical FROM products
  WHERE name_canonical ILIKE '%Sensodyne%' AND brand ILIKE '%100 Pipers%';
  ```

  **La marca `100 Pipers` es un basurero, no un caso aislado:** tiene exactamente
  2 productos y ninguno es whisky. El otro es `7794757267108` — *Tempera Pomo
  250gr Blanco* (masonline). No existe ningún whisky 100 Pipers en el catálogo.
  Fixture útil: el score tiene que marcar los dos.

- **Otros brand mismatch encontrados en el mismo barrido** (14/07/2026, sobre los
  34k productos). Sirven como set de regresión — todos deberían dar score ALTO:

  | EAN | brand | name |
  | --- | --- | --- |
  | `309970215798` | IMAGI KIDZ | Labial Líquido **Revlon** Colorstay Matte 005 |
  | `7802107000876` | Bárbara | Cerveza **Kunstmann** Ipa 473 ml |
  | `7613036961448` | Starburst | **Starbucks** Nespresso Colombia 10 uni |
  | `7798456650124` | Vitamet | Suplemento Dietario **Granger** Pancakes Proteicos |
  | `7896359015061` | Easy Find | Hermetico **San Remo** Flor Redondo Chico 480ml |
  | `7790715011806` | Colorin | **Comodín** Enduido Interior 1 L |
  | `7798282170131` | MIA CASA | Papel Aluminio **Colonial** 5 M |
  | `7797750009270` | Whirlpool | Cocina a Gas **Eslabón de Lujo** 56 CM |
  | `7891112203693` | Tramontina | **IPANEMA** juego cubiertos 24 piezas Negro |

  **Falsos positivos que el score va a tener que esquivar** (encontrados en el
  mismo barrido, NO son mismatch): marca-licencia (`Disney` → "Short *Mickey*"),
  sub-marca de marca propia (`Carrefour` → "Palmeritas *El Mercado*"), revendedor
  multi-marca (`Gadnic` → "Handy *Baofeng*"), y palabras del name que además son
  marcas del catálogo (`Worksite` → "Destornillador Punta *Philips*", donde
  Philips es el tipo de punta, no la marca).

- **Fragmentación de marca (misma marca escrita de dos formas).** No es lo mismo
  que el mismatch, pero **rompe la home por la misma vía** — dedup por marca las
  cuenta como distintas — así que conviene atacarlas juntas. Hay **116 pares** que
  colapsan al normalizar caso/acento/puntuación: `Aguila`/`Águila` (41 y 7),
  `Atma`/`ATMA` (20 y 89), `Ayudin`/`Ayudín` (39 y 22), `Dermaglos`/`Dermaglós`
  (41 y 6), `Aston`/`ASTON` (171 y 11), `Bel Gioco`/`Belgioco` (15 y 8),
  `7 Up`/`7up` (2 y 10), `Ga.Ma`/`Gama` (11 y 24), `Fisher Price`/`Fisher-Price`.

  Esto **no lo cubre `normalizeBrand`** (`src/pipeline/transform.ts`), que es
  deliberadamente conservador: trim, colapso de espacios y strip de puntuación
  final, sin tocar caso ni acentos. Es decisión vigente, no bug.

  El precedente **H2oh!** cae acá y muestra el límite: el retailer carga
  `brand="H20!"` (con cero) y `name="Agua Saborizada H2oh! Sabor Naranja"`. Un
  umbral de longitud mínima ingenuo (>=6 chars) lo dejaría pasar.

  **Cuidado con Levenshtein solo:** a distancia 1 aparecen 56 pares, y muchos son
  marcas genuinamente distintas — `Antex`/`Intex`, `Bosca`/`Bosch`,
  `Bimbi`/`Bimbo`, `Arcoa`/`Arcor`. La distancia de edición sola no alcanza; hace
  falta cruzarla con categoría o con presencia de la marca en el name.

---

## Cómo retomar este repo

Para futuras instancias que arranquen frío en este repo.

### Antes de tocar nada: confirmá en qué repo estás

El proyecto vive en **dos repos con sesiones separadas**, y comparten vocabulario
(fases, "B3.1", endpoints):

- `olavarria-comparador-precios` — **este**: scraper + API. Backend.
- `chango-web` — PWA Next.js. Frontend.

Un pedido puede llegar dirigido a la instancia equivocada. Pasó dos veces el
14/07/2026: un pedido de dedup del frontend llegó acá, y trabajo hecho por otra
sesión del backend se atribuyó a esta. **Corré `git log --oneline -5` y `pwd`
antes de aceptar la premisa de un pedido**, sobre todo si menciona trabajo previo
que no está en tu contexto. Si el trabajo no está, decilo en vez de reconstruirlo
a ciegas.

Corolario: **no toques `chango-web` desde acá**. Regenerar sus tipos (`pnpm
api:sync`) le corresponde a la sesión del frontend cuando consuma la API.

### Setup

```bash
pnpm install
cp .env.example .env        # completar DATABASE_URL (Session pooler de Supabase)
pnpm db:migrate             # idempotente
```

### Los dos typechecks tienen que estar verdes

```bash
pnpm typecheck   # scraper — el tsconfig base EXCLUYE src/api
pnpm api:build   # API — tsconfig.api.json, con decoradores
```

La asimetría es deliberada, no la "simplifiques": el base no puede tipar los
decoradores de Nest sin `experimentalDecorators`. Ver `CLAUDE.md` → "Config
asimétrica de TS".

### Tests

```bash
pnpm test:api    # 72 integration, DB real de Supabase, CERO mocks
pnpm test:unit   # 25 unit del scraper (normalización, parsing)
```

Los de API corren contra la DB real a propósito. Si un test falla por conteos
(totales, cantidad de resultados), **primero revisá si la data cambió** — el
scraper corre diario a las 04:00 ART y mueve precios y catálogo. No todo fallo es
regresión.

### Correr la API

```bash
pnpm api:dev     # watch, http://localhost:3100 — docs en /docs, spec en /docs-json
```

Puerto 3100, no 3000 (colisiona con frontends y con un túnel SSH de Juan).

### Dónde vive cada cosa

- **`CLAUDE.md` — fuente de verdad de decisiones.** Reglas, invariantes,
  anti-patterns, stack. Si vas a escribir una regla, va acá.
- **`docs/NEXT_SESSION.md` (este archivo) — estado y evidencia.** Números medidos,
  deuda con su umbral, casos de estudio. Si vas a escribir un número o un caso, va
  acá. **Regla anti-drift:** cuando una regla y su evidencia se separan, la regla va
  a `CLAUDE.md` y acá queda un puntero. No dupliques el texto en los dos.
- **`docs/analysis/*.md` — snapshots fechados**, regenerables desde la DB. No se
  mantienen a mano; cada uno lleva la query que lo produce.
- **`docs/API.md`** — setup, endpoints, env vars, deploy.
- **`LATEST_RUN.md`** — estado operativo diario del scraper.

### Cómo trabaja Juan

Ver `CLAUDE.md` → "Cómo trabajar con Juan". En corto: es el arquitecto, vos
ejecutás. Preguntá antes de asumir, trabajá en pasos verificables, y **documentá la
consecuencia, no solo el hecho** — el schema decía `-- último path visto` sobre
`category_path` desde el día uno y aun así se cometió el error que esa nota debería
haber evitado, porque nunca se escribió qué se seguía de ahí.
