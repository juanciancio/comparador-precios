# ─────────────────────────────────────────────────────────────────
# Stage 1 — deps: instalación de dependencias de producción
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# pnpm vía corepack, versión pineada por el campo packageManager de package.json.
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
# --prod: sin devDependencies (tsc, vitest, tsx, pino-pretty...). SWC corre en
# runtime, así que @swc-node/register + @swc/core viven en dependencies.
# Los prebuilt de @swc/core se resuelven vía optionalDependencies para linux-musl.
# Prune de los binarios nativos glibc (gnu): alpine es musl, nunca los carga.
RUN pnpm install --frozen-lockfile --prod \
  && find node_modules/.pnpm -maxdepth 1 -type d -name '*-linux-*-gnu*' -exec rm -rf {} +

# ─────────────────────────────────────────────────────────────────
# Stage 2 — runner: imagen final mínima
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Apunta SWC al tsconfig con decoradores (default tsconfig.json los tiene apagados).
ENV SWC_NODE_PROJECT=tsconfig.api.json

# node_modules ya resuelto en el stage anterior. Sin pnpm/corepack en runtime:
# api:start es solo `node --import`, así evitamos que corepack baje pnpm en runtime.
COPY --from=deps /app/node_modules ./node_modules

# Código fuente + configs de TS (SWC lee tsconfig.api.json en runtime). Sin build step.
COPY package.json tsconfig.json tsconfig.api.json ./
COPY src ./src
COPY bin ./bin

# Usuario no-root: nunca correr prod como root.
RUN addgroup -g 1001 nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3100
ENV API_PORT=3100

# Healthcheck contra la propia API (busybox wget en alpine).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --spider -q http://localhost:3100/health || exit 1

# Arranque directo (equivalente a `pnpm api:start`), sin pnpm en runtime.
CMD ["node", "--import", "@swc-node/register/esm-register", "bin/serve-api.ts"]
