import '../../lib/env.ts';
import { z } from 'zod';

/**
 * API environment. Reuses the scraper's .env loader (side-effect import above)
 * so DATABASE_URL and LOG_LEVEL come from the same source as the pipeline.
 * API-specific vars (port, CORS, rate limit) are validated here with Zod.
 */
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
  // Default 3100: 3000 colisiona con frameworks frontend y, en la máquina de
  // Juan, con un túnel SSH. Ver CLAUDE.md → "API HTTP (NestJS)".
  API_PORT: z.coerce.number().int().positive().max(65535).default(3100),
  // Comma-separated allowlist, or '*' for any origin (dev default).
  CORS_ORIGINS: z.string().default('*'),
  // Throttler window in seconds and max requests per window per IP.
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
  // TTL comunitario del refresh on-demand. Expuesto como env para poder bajarlo
  // (p. ej. 2s) en el suite de tests de integración.
  REFRESH_TTL_SECONDS: z.coerce.number().int().min(0).default(60),
  // Techos de outliers de /products/recent-changes. Existen porque hay evidencia
  // empírica de data quality que se colaría en la home como si fuera oferta:
  // Set Tarteras Ilko a $4.3M, Bolso Iael con 1040% de diff, Taza Doble G con
  // 300%. Ver CLAUDE.md → "Data quality signals conocidas".
  RECENT_CHANGES_MAX_PRICE: z.coerce.number().positive().default(500000),
  RECENT_CHANGES_MAX_DIFF_PCT: z.coerce.number().positive().default(200),
});

export type ApiEnv = z.infer<typeof EnvSchema>;

function loadApiEnv(): ApiEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid API environment: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const apiEnv: ApiEnv = loadApiEnv();

export function isProduction(env: ApiEnv = apiEnv): boolean {
  return env.NODE_ENV === 'production';
}

// Default de CORS en producción cuando CORS_ORIGINS no se configuró (queda en
// '*'): prod es restrictivo por default en vez de depender de un secret en Fly.
// La env var sigue funcionando como override explícito.
// www.changui.ar importa aunque Vercel lo redirija: el request inicial sale
// desde ese origin antes del redirect, y sin él el browser bloquea la primera
// visita desde www.
// Si se activan Vercel Preview Deployments, agregar función matcher para
// https://chango-pwa-*.vercel.app además de los origins fijos.
const ALLOWED_ORIGINS = [
  'https://changui.ar',
  'https://www.changui.ar',
  'https://chango-pwa.vercel.app',
];

/** CORS origin for `enableCors`: `true` (reflect any) in dev, explicit list in prod. */
export function corsOrigin(env: ApiEnv = apiEnv): true | string[] {
  const raw = env.CORS_ORIGINS.trim();
  if (raw === '*') return isProduction(env) ? ALLOWED_ORIGINS : true;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}
