# NEXT SESSION — punto de entrada

> Doc de arranque para la próxima sesión. Estado al cierre de la sesión de Fase 3.A / Fase A.
> Fuente de verdad de decisiones: `CLAUDE.md`. Estado operativo diario: `LATEST_RUN.md`.

---

## 1. Estado actual del proyecto

- **Fase 2 cerrada:** scrapers Masonline + Carrefour en autopilot vía GitHub
  Actions (`daily-scrape.yml`, 04:00 ART) + health check semanal. Se alimenta solo.
- **Fase 3.A en curso — API HTTP (NestJS):** montada en el mismo repo del scraper.
  - **Fase A (bootstrap + health check): COMPLETA y commiteada.**
  - **Fase B (Products module): es lo próximo.** No arrancada.

Ver `CLAUDE.md` → sección **"API HTTP (NestJS)"** para stack, runtime, config de TS
y convenciones (leer antes de codear Fase B).

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

### Inmediato — Fase B (Products module)

1. **`ProductsController` con 3 endpoints:**
   - `GET /products` — paginado + filtros: `limit`, `offset`, `brand`,
     `category`, `only_matched`, `sort_by`, `sort_dir`.
   - `GET /products/:ean` — detalle individual (404 si no existe).
   - `GET /products/:ean/price-history` — histórico, filtrable por `retailer` y
     rango `from`/`to`.
2. **`EXPLAIN ANALYZE` de la query de `only_matched=true`** con filtros
   combinados. Objetivo: **<200ms** contra Supabase. Si el planner no usa
   índices, agregar migración `006_indices_for_api.sql` con los faltantes
   (decisión abierta #8 en `CLAUDE.md`).
3. **Reportar al terminar Fase B:** outputs de `curl` de los 3 endpoints, un
   ejemplo con filtros combinados, `EXPLAIN ANALYZE` de la query más pesada, e
   índices nuevos si hubo.

### Siguientes fases dentro de 3.A

- **Fase C:** Search (`GET /search`) + Compare (`GET /compare`, `GET /compare/stats`).
  Recordar excluir `brand IN ('Genérico','Generico')` en compare.
- **Fase D:** Categories (`GET /categories`) + Brands (`GET /brands`). Cacheables.
- **Fase E:** pulido OpenAPI (contrato con PWA/Flutter, prioridad alta), global
  exception filter, timing interceptor, **Dockerfile multi-stage**, tests de
  integración con supertest (≥1 por módulo, contra DB real).

### Después de Fase 3.A

- Sesión propia para **deployar la API** (target por decidir: Fly.io / Railway /
  Render — decisión abierta #7 en `CLAUDE.md`).
- **Fase 3.B:** PWA con Next.js en **repo separado**, consumiendo el OpenAPI.

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
