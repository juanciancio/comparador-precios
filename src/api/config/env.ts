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
  API_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  // Comma-separated allowlist, or '*' for any origin (dev default).
  CORS_ORIGINS: z.string().default('*'),
  // Throttler window in seconds and max requests per window per IP.
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
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

/** CORS origin for `enableCors`: `true` (reflect any) in dev, explicit list in prod. */
export function corsOrigin(env: ApiEnv = apiEnv): true | string[] {
  const raw = env.CORS_ORIGINS.trim();
  if (raw === '*') return true;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}
