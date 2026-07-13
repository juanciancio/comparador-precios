# Comparador de Precios — Supermercados Argentinos

Base de datos actualizada diariamente con precios de supermercados argentinos (VTEX IO) y,
a futuro, un frontend para comparar productos entre cadenas por EAN.

Arranca con **Masonline** y **Carrefour**; después escala a Coto, Día, Jumbo.

> El contexto arquitectónico completo y las decisiones tomadas están en [`CLAUDE.md`](./CLAUDE.md).

## Requisitos

- **Node.js 20+** (probado en 24)
- **pnpm**
- Un proyecto **PostgreSQL** (Supabase managed, región São Paulo / `sa-east-1`)

## Setup

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# editar .env con la DATABASE_URL de tu proyecto Supabase

# 3. Correr las migrations (crea el esquema + seed de retailers)
pnpm db:migrate
```

## Uso

```bash
# Scrapear una cadena completa
pnpm scrape --retailer=masonline

# Smoke test acotado a una sola categoría (dev)
pnpm scrape --retailer=masonline --limit-categories=1
```

## Scripts

| Script            | Descripción                                            |
| ----------------- | ------------------------------------------------------ |
| `pnpm scrape`     | Corre el scraper (`--retailer=masonline\|carrefour`)   |
| `pnpm db:migrate` | Aplica las migrations pendientes de `src/db/migrations`|
| `pnpm smoke`      | Test manual contra la API real de VTEX                 |
| `pnpm test`       | Corre los tests (vitest)                               |
| `pnpm typecheck`  | Chequeo de tipos estricto (`tsc --noEmit`)             |

## Estructura

```
bin/          CLI runners (scrape, migrate, smoke-test)
src/config/   Config por retailer
src/lib/      HTTP client VTEX, db, logger, retry, Result
src/schemas/  Zod schemas de respuestas VTEX
src/scrapers/ Lógica de scraping (base + por retailer)
src/pipeline/ extract -> transform -> load
src/db/       Migrations SQL + queries reusables
tests/        Tests (vitest)
```
