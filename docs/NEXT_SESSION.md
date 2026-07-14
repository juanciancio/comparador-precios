# NEXT SESSION — punto de entrada

> Doc de arranque para la próxima sesión. Estado al cierre de la sesión de Fase 3.A / Fase A.
> Fuente de verdad de decisiones: `CLAUDE.md`. Estado operativo diario: `LATEST_RUN.md`.

---

## 1. Estado actual del proyecto

- **Fase 2 cerrada:** scrapers Masonline + Carrefour en autopilot vía GitHub
  Actions (`daily-scrape.yml`, 04:00 ART) + health check semanal. Se alimenta solo.
- **Fase 3.A COMPLETA (14/07/2026) — API HTTP (NestJS):** montada en el mismo repo
  del scraper. **Lista para deploy.**
  - **10 endpoints** funcionando (Health, Products ×4, Search, Compare ×2,
    Categories, Brands).
  - **39 tests de integración** (Vitest + supertest, DB real) verdes: `pnpm test:api`.
  - **OpenAPI pulida** (`/docs`): 10/10 endpoints con example y ≥2 response schemas.
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

- **GET /products/recent-changes?limit=N** — devuelve productos con cambios
  de precio en las últimas 48hs, ordenados por fecha de cambio DESC, con
  toda la info de card (precios de ambas cadenas, timestamps, badge info).
  Necesario para PWA Home "Ofertas destacadas de hoy". Workaround actual:
  /compare?sort_by=diff_pct_abs&limit=8 + N fetches individuales de
  /products/{ean}. Ver chango-web/src/app/page.tsx TODO. Detectado
  durante Fase 3.B checkpoint B1.
