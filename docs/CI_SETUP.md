# CI Setup — Scraping diario con GitHub Actions

Este proyecto corre el scraping diario en **GitHub Actions** (decisión post-Fase 2:
gratis, versionado con el código, email automático en fallos, sin infra propia).

Hay dos workflows:

- **`.github/workflows/daily-scrape.yml`** — corre todos los días 04:00 ART
  (07:00 UTC): migraciones → Masonline → Carrefour → reporte cruzado, y commitea
  `LATEST_RUN.md` al repo.
- **`.github/workflows/health-check.yml`** — corre 1 vez por semana y falla (→
  email a Juan) si detecta señales de degradación (corridas viejas, catálogo
  vacío, o `bad_ean_total` disparado).

---

## 1. Secrets a configurar (obligatorio antes del primer run)

En GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
Agregá los cuatro:

| Secret | Qué es | De dónde sacarlo |
|---|---|---|
| `DATABASE_URL` | Connection string **pooled** de Supabase (la misma que tu `.env`). Usar el **Session pooler** (IPv4, puerto 5432) — la conexión directa es IPv6-only y falla en los runners. | Supabase → Project Settings → Database → Connection string → *Session pooler* |
| `SUPABASE_URL` | El project URL. | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | La **service role** key (NO la anon key). | Supabase → Project Settings → API → `service_role` secret |
| `CONTACT_EMAIL` | El email que va en el User-Agent de las requests. | El tuyo. |

> ⚠️ La `service_role` key bypasea RLS. Nunca la commitees ni la pongas en el
> frontend; vive solo como secret de Actions y en tu `.env` local.

---

## 2. Permisos del workflow

`daily-scrape.yml` declara `permissions: contents: write` porque el paso final
hace `git push` de `LATEST_RUN.md` usando el `GITHUB_TOKEN`. Si además tu org
tiene el default en read-only, verificá:
**Settings → Actions → General → Workflow permissions → "Read and write permissions"**.

---

## 3. Primer run manual (verificación end-to-end)

**No dejes el schedule activo sin haber probado antes.** Una vez cargados los
secrets:

1. Andá a la pestaña **Actions → Daily scrape → Run workflow** (botón que aparece
   gracias a `workflow_dispatch`).
2. Corré y mirá los logs. Debería: instalar deps, aplicar migraciones (0 pending
   si ya está al día), scrapear ambos retailers, y commitear `LATEST_RUN.md`.
3. Si falla, GitHub te manda email automático. Revisá el step que rompió.

Recién cuando un run manual pase end-to-end, el schedule diario queda confiable.

---

## 4. Notas de diseño

- **Secuencial, no paralelo:** Masonline y después Carrefour. Correrlos en
  paralelo desde el mismo runner triplica el riesgo de rate-limit sin ahorro real
  (comparten pool de conexiones a DB).
- **`concurrency.cancel-in-progress: false`:** si el cron dispara mientras una
  corrida anterior sigue viva, la nueva **espera**, no cancela. Data safety >
  puntualidad.
- **Timeout 4hs:** margen sobre ~45min (Masonline) + ~110min (Carrefour). Si se
  cuelga más que eso, el job falla a propósito (→ email).
- **`db:migrate` antes de scrapear:** es idempotente (0 pending = no-op). Evita
  que una migración nueva sin aplicar rompa una corrida. Si no lo querés, se puede
  sacar; entonces acordate de correr `pnpm db:migrate` a mano al agregar migraciones.
- **`[skip ci]` en el commit del bot:** evita loops (aunque el workflow no tiene
  trigger `push`, es defensivo).
