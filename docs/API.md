# API HTTP — Comparador de Precios

API read-only (salvo el refresh on-demand) sobre el dataset unificado de precios
de supermercados argentinos (Masonline + Carrefour). Framework: **NestJS** con
runtime **SWC** (TS sin build step). Contrato: **OpenAPI/JSON**.

- Swagger UI interactivo: **`/docs`**
- OpenAPI JSON: **`/docs-json`**

La fuente de verdad de decisiones de arquitectura es [`CLAUDE.md`](../CLAUDE.md)
(sección "API HTTP (NestJS)").

---

## Setup local (5 pasos)

```bash
# 1. Clonar
git clone <repo-url> && cd olavarria-comparador-precios

# 2. Instalar dependencias (Node 20+, pnpm 10)
pnpm install

# 3. Copiar el env de ejemplo y completar DATABASE_URL
cp .env.example .env
#    Editar .env: DATABASE_URL apuntando a Postgres/Supabase (ver tabla abajo).

# 4. Migrar la DB (idempotente)
pnpm db:migrate

# 5. Levantar la API en modo watch
pnpm api:dev
```

La API queda en `http://localhost:3100` (Swagger en `/docs`). El puerto default
es **3100**, no 3000 (el 3000 colisiona con frameworks frontend / túneles SSH).

> La API se prueba **contra la DB real** (Supabase en dev y prod). No hay mocks.

---

## Endpoints

Detalle completo, schemas y ejemplos en **`/docs`**. Resumen:

| Método | Path | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Liveness + reachability de la DB (200 ok / 503 down). |
| `GET` | `/products` | Listado paginado del catálogo unificado con precios por cadena. Filtros: `brand`, `category`, `only_matched`, `sort_by`, `sort_dir`. |
| `GET` | `/products/:ean` | Detalle de un producto (el EAN se normaliza: strip de ceros a la izquierda). |
| `GET` | `/products/:ean/price-history` | Histórico de vigencias (SCD-2). Filtros: `retailer`, `from`, `to`. |
| `POST` | `/products/:ean/refresh` | Refresh on-demand contra los retailers (TTL comunitario, ver nota abajo). |
| `GET` | `/search` | Búsqueda por nombre/marca (multi-término, ILIKE). Requiere `q` (≥2 chars). |
| `GET` | `/compare` | Comparación cross-retailer por EAN. Excluye marca "Genérico". Filtros: `brand`, `category`, `min_diff_pct`, `cheaper_at`, `sort_by`. |
| `GET` | `/compare/stats` | Estadísticas globales del match (histograma de \|diff%\|, quién es más barato, exclusivos). |
| `GET` | `/categories` | Categorías con conteo de productos (cacheado 5 min). |
| `GET` | `/brands` | Marcas con conteo de productos y de matches cross-retailer (cacheado 5 min). Filtros: `limit`, `min_products`. |

**Convenciones:** query params en `snake_case`, response bodies en `camelCase`
(salvo el contrato fijo `masonline_price`/`carrefour_price`/`diff_pct` del compare
y `was_refreshed`/`updated_at` del refresh). Fechas de presentación en
`America/Argentina/Buenos_Aires`.

**Errores:** shape unificado con `trace_id` para correlación con los logs:

```json
{
  "statusCode": 404,
  "message": "No existe producto con EAN 9999999999999",
  "error": "Not Found",
  "path": "/products/9999999999999",
  "timestamp": "2026-07-14T10:00:00.000Z",
  "trace_id": "3f1c2e8a-9b4d-4a2e-8c1f-0a1b2c3d4e5f"
}
```

Los 500 salen sanitizados (sin stack ni detalle interno); el stack completo
queda en los logs, correlacionable por `trace_id`.

---

## Variables de entorno

| Variable | Descripción | Default | Requerida |
| --- | --- | --- | --- |
| `DATABASE_URL` | Connection string de Postgres/Supabase. En Supabase usar el **Session pooler** (IPv4, puerto 5432); la conexión directa es IPv6-only. | — | **Sí** |
| `API_PORT` | Puerto HTTP de la API. | `3100` | No |
| `NODE_ENV` | `production` activa whitelist de CORS y desactiva pretty logs. | `development` | No |
| `CORS_ORIGINS` | `*` (refleja cualquier origen, dev) o lista separada por comas (prod). | `*` | No |
| `LOG_LEVEL` | Nivel de pino (`info`, `debug`, ...). | `info` | No |
| `RATE_LIMIT_TTL` | Ventana del throttler, en segundos. | `60` | No |
| `RATE_LIMIT_LIMIT` | Máximo de requests por ventana por IP. | `100` | No |
| `REFRESH_TTL_SECONDS` | TTL comunitario del refresh on-demand (ver nota). | `60` | No |
| `CONTACT_EMAIL` | Email para el User-Agent honesto del cliente VTEX. | `contacto@dominio` | No |

El `.env.example` trae todas con placeholders. **Nunca commitear `.env`.**

---

## Tests

Integration tests (Vitest + supertest) contra la DB real, cero mocks:

```bash
pnpm test:api     # solo la API (8 archivos, 39 tests en tests/api/)
pnpm test:unit    # solo el scraper (normalización, parsing)
pnpm test         # ambos
```

Los tests levantan un `INestApplication` real y le pegan con supertest. El
`REFRESH_TTL_SECONDS` se baja a `2` en el suite para testear la expiración del
TTL sin esperar 60s. Cubren happy paths + casos sutiles (normalización EAN, TTL
comunitario, exclusión Genérico, tolerancia de tie 1%, bucketing de diff).

---

## Deploy con Docker

Imagen multi-stage, runtime SWC (sin build step), usuario no-root, healthcheck
contra `/health`.

```bash
# Build
docker build -t comparador-api .

# Run (pasando el env; mínimo DATABASE_URL)
docker run --rm -p 3100:3100 --env-file .env comparador-api

# O con envs explícitas mínimas:
docker run --rm -p 3100:3100 \
  -e DATABASE_URL='postgres://user:pass@host:5432/db' \
  comparador-api

# Verificar
curl http://localhost:3100/health   # -> 200 { "status": "ok", ... }
```

El contenedor expone `3100` y trae un `HEALTHCHECK` que Docker/orquestador puede
consumir. Target de deploy (Fly.io / Railway / Render) pendiente de decisión
(ver `docs/NEXT_SESSION.md`).

---

## Notas

**Refresh comunitario (TTL 60s):** `POST /products/:ean/refresh` hace fetch en
vivo contra los retailers, pero con un cache comunitario de 60 segundos: si el
producto se refrescó recientemente por *cualquier* cliente, la llamada devuelve
la data cacheada (`was_refreshed: false`) sin volver a pegarle a los retailers.
Así, ante una ráfaga (500 usuarios abriendo el mismo producto), solo el primero
genera carga real; el resto obtiene esa data fresca. Existe para no abusar de los
retailers ni comerse su rate-limiting.

**Monetización y uso de datos:** no hay monetización activa en esta fase; la
estrategia (afiliados, freemium, B2B) está documentada en
[`docs/NEXT_SESSION.md`](./NEXT_SESSION.md) (sección "Monetización").
