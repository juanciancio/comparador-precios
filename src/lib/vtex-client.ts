import './env.ts';
import { request } from 'undici';
import pLimit, { type LimitFunction } from 'p-limit';
import { z } from 'zod';
import type { Result } from './result.ts';
import { ok, err } from './result.ts';
import { retry, type RetryError } from './retry.ts';
import { logger } from './logger.ts';
import { vtexCategoryTreeSchema, type VtexCategory } from '../schemas/vtex-category.ts';

const USER_AGENT = `ComparadorPrecios/0.1 (+${process.env.CONTACT_EMAIL ?? 'contacto@dominio'})`;
const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const JITTER_MIN_MS = 100;
const JITTER_MAX_MS = 300;
const MAX_ATTEMPTS = 5;

export type VtexError =
  | { kind: 'network'; cause: unknown }
  | { kind: 'http'; status: number; body: string }
  | { kind: 'parse'; issues: z.ZodIssue[]; rawSample: string }
  | { kind: 'retry_exhausted'; attempts: number; lastError: unknown };

const RETRY_AFTER_CAP_MS = 30_000;

/** Error interno para que `retry` clasifique por status HTTP. */
class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly retryAfterMs?: number,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpStatusError';
  }
}

type UndiciHeaders = Record<string, string | string[] | undefined>;

/** Retry-After puede venir en segundos o como fecha HTTP. Devuelve ms. */
function parseRetryAfterMs(headers: UndiciHeaders): number | undefined {
  const raw = headers['retry-after'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return undefined;
}

// Un limiter por host (concurrencia 4). Si algún día se scrapean dos retailers
// en paralelo, cada dominio tiene su propio presupuesto de cortesía.
// Contador de 429 por proceso (métrica de la corrida). scrape.ts lo lee al final.
let rateLimitHits = 0;
export const getRateLimitHits = (): number => rateLimitHits;
export const resetRateLimitHits = (): void => {
  rateLimitHits = 0;
};

const limiters = new Map<string, LimitFunction>();
function limiterFor(host: string): LimitFunction {
  let limit = limiters.get(host);
  if (!limit) {
    limit = pLimit(CONCURRENCY);
    limiters.set(host, limit);
  }
  return limit;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (): number =>
  JITTER_MIN_MS + Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1));

function isNetworkError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const code = (e as { code?: unknown }).code;
  return (
    typeof code === 'string' &&
    [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ENOTFOUND',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_BODY_TIMEOUT',
      'UND_ERR_SOCKET',
    ].includes(code)
  );
}

// Retryables: 5xx, 429 (Too Many Requests) y 408 (Request Timeout), + errores
// de red. El resto de 4xx NO se reintenta.
// Nota: el CLAUDE.md dice "no retry en 4xx"; 429/408 son la excepción estándar
// (significan "reintentá con backoff"). Verificado: Masonline rate-limitea con 429.
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}
const isRetryable = (e: unknown): boolean =>
  (e instanceof HttpStatusError && isRetryableStatus(e.status)) || isNetworkError(e);

function mapRetryError(e: RetryError): VtexError {
  if (e.kind === 'exhausted') {
    return { kind: 'retry_exhausted', attempts: e.attempts, lastError: e.lastError };
  }
  if (e.error instanceof HttpStatusError) {
    return { kind: 'http', status: e.error.status, body: e.error.body };
  }
  return { kind: 'network', cause: e.error };
}

function describeErr(error: unknown): unknown {
  if (error instanceof HttpStatusError) return { http: error.status };
  if (error instanceof Error) return { name: error.name, message: error.message };
  return error;
}

type LogCtx = Record<string, unknown>;

async function vtexGet<T>(
  host: string,
  pathAndQuery: string,
  schema: z.ZodType<T>,
  ctx: LogCtx,
): Promise<Result<T, VtexError>> {
  const limit = limiterFor(host);
  const url = `https://${host}${pathAndQuery}`;

  const doRequest = (): Promise<unknown> =>
    limit(async () => {
      await sleep(jitter());
      const res = await request(url, {
        method: 'GET',
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        headersTimeout: REQUEST_TIMEOUT_MS,
        bodyTimeout: REQUEST_TIMEOUT_MS,
      });
      if (res.statusCode >= 400) {
        const body = await res.body.text();
        let retryAfterMs: number | undefined;
        if (res.statusCode === 429) {
          rateLimitHits += 1;
          retryAfterMs = parseRetryAfterMs(res.headers);
          const rawRetryAfter = res.headers['retry-after'];
          if (rawRetryAfter !== undefined && retryAfterMs === undefined) {
            logger.warn(
              { ...ctx, retryAfterRaw: rawRetryAfter },
              'unparseable Retry-After, falling back to backoff',
            );
          }
        }
        throw new HttpStatusError(res.statusCode, body.slice(0, 500), retryAfterMs);
      }
      return res.body.json();
    });

  const result = await retry(doRequest, {
    isRetryable,
    maxAttempts: MAX_ATTEMPTS,
    baseDelayMs: 100,
    // En 429 con Retry-After, esperar al menos lo que pide el server (capado a 30s).
    retryDelayMs: (error, defaultDelayMs) => {
      if (error instanceof HttpStatusError && error.retryAfterMs !== undefined) {
        if (error.retryAfterMs > RETRY_AFTER_CAP_MS) {
          logger.warn(
            {
              ...ctx,
              status: 429,
              retryAfterOriginalMs: error.retryAfterMs,
              retryAfterCappedMs: RETRY_AFTER_CAP_MS,
            },
            'Retry-After exceeded cap',
          );
        }
        return Math.max(defaultDelayMs, Math.min(error.retryAfterMs, RETRY_AFTER_CAP_MS));
      }
      return defaultDelayMs;
    },
    onRetry: ({ attempt, delayMs, error }) =>
      logger.warn(
        { ...ctx, step: 'vtex_retry', attempt, delayMs, err: describeErr(error) },
        'retrying vtex request',
      ),
  });

  if (!result.ok) {
    const mapped = mapRetryError(result.error);
    logger.error({ ...ctx, step: 'vtex_request', err: mapped }, 'vtex request failed');
    return err(mapped);
  }

  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    const rawSample = JSON.stringify(result.value).slice(0, 500);
    logger.error(
      { ...ctx, step: 'vtex_parse', issues: parsed.error.issues.slice(0, 5), rawSample },
      'vtex response failed schema validation',
    );
    return err({ kind: 'parse', issues: parsed.error.issues, rawSample });
  }

  return ok(parsed.data);
}

// El listado de productos se valida solo como array a nivel transporte; el parse
// producto-por-producto (vtexProductSchema) ocurre en extract, para no perder
// una página entera por un SKU malformado.
const productListSchema = z.array(z.unknown());

export function fetchCategoryTree(
  host: string,
  depth: number,
): Promise<Result<VtexCategory[], VtexError>> {
  return vtexGet(
    host,
    `/api/catalog_system/pub/category/tree/${depth}`,
    vtexCategoryTreeSchema,
    { host, step: 'category_tree' },
  );
}

export function fetchProductsByCategory(
  host: string,
  categoryId: string,
  from: number,
  to: number,
): Promise<Result<unknown[], VtexError>> {
  const query = `/api/catalog_system/pub/products/search/?fq=C:${categoryId}&_from=${from}&_to=${to}`;
  return vtexGet(host, query, productListSchema, {
    host,
    categoryId,
    from,
    to,
    step: 'products_by_category',
  });
}

export function fetchProductsByBrand(
  host: string,
  categoryId: string,
  brandId: number,
  from: number,
  to: number,
): Promise<Result<unknown[], VtexError>> {
  const query = `/api/catalog_system/pub/products/search/?fq=C:${categoryId}&fq=B:${brandId}&_from=${from}&_to=${to}`;
  return vtexGet(host, query, productListSchema, {
    host,
    categoryId,
    brandId,
    from,
    to,
    step: 'products_by_brand',
  });
}
