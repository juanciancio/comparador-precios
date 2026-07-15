# NEXT SESSION — punto de entrada

> Doc de arranque para la próxima sesión. Estado al cierre de la sesión de Fase 3.A / Fase A.
> Fuente de verdad de decisiones: `CLAUDE.md`. Estado operativo diario: `LATEST_RUN.md`.

---

## 1. Estado actual del proyecto

- **Fase 2 cerrada:** scrapers Masonline + Carrefour en autopilot vía GitHub
  Actions (`daily-scrape.yml`, 04:00 ART) + health check semanal. Se alimenta solo.
- **Fase 3.A COMPLETA (14/07/2026) — API HTTP (NestJS):** montada en el mismo repo
  del scraper. **Lista para deploy.**
  - **11 endpoints** funcionando (Health, Products ×5, Search, Compare ×2,
    Categories, Brands).
  - **49 tests de integración** (Vitest + supertest, DB real) verdes: `pnpm test:api`.
  - **OpenAPI pulida** (`/docs`): 11/11 endpoints con example y ≥2 response schemas.
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

## 2. Sesión anterior (Fase A) — qué quedó hecho

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

## 3. Próximos pasos en orden

Fase 3.A (Fases A→E) está **completa**. Lo que sigue:

**Inmediato — Deploy de la API:**

- Elegir target: **Fly.io vs Railway vs Render** (decisión abierta #7 en `CLAUDE.md`).
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

## 4. Contexto operativo

- Sistema de scraping funcionando: `LATEST_RUN.md` tiene el estado diario.
- Dataset actual: ~12k productos Masonline, ~26k Carrefour, ~3.9k matches
  cross-retailer por EAN (excluye "Genérico").
- **La API se prueba contra la DB real de Supabase, cero mocks en checkpoints.**
- Health del scraper a mano: `pnpm tsx bin/health-check.ts`.

---

## 5. Monetización (postponed — decisión estratégica, no se codea ahora)

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

## 6. Convenciones ya establecidas (no reinventar)

- TS estricto, cero `any`.
- Zod para todo input, sin `class-validator`.
- Sin ORM; driver `postgres` compartido con el scraper.
- Un commit por fase, mensajes en inglés `feat(scope): ...`.
- Checkpoint aprobado antes de cada fase.
- Commits directo a `main` (proyecto de un solo dev, sin ceremonia de branches).
- Timezone `America/Argentina/Buenos_Aires` para presentation de fechas.
- Imports con `.ts` explícita en todo el repo, incluido `src/api` (ver `CLAUDE.md`).

---

## 7. Aprendizajes de data / debugging (tener presente)

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

- **`loadRun` precarga catálogo completo del retailer en cada refresh** 
  (~12-26k filas), aunque el refresh toque un solo producto. 
  O(catálogo) por llamada. Con TTL comunitario 60s el volumen está 
  acotado; no impacta MVP. Cuando la mediana de duración del endpoint 
  supere 500ms o el CPU de Supabase pase 60%, refactorizar a un path 
  `loadRunForSingleEan(ean)` que hace SELECT puntual en vez de precarga.
  Detectado en Fase B (14/07/2026).
---

## Endpoints faltantes (backlog)

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
