import type { Result } from './result.ts';
import { ok, err } from './result.ts';

/**
 * Retry genérico y puro: no sabe nada de HTTP. El caller inyecta el predicado
 * `isRetryable` (así 5xx/network reintentan y 4xx no). La distinción de códigos
 * vive en quien conoce el transporte, no acá.
 */
export type RetryError =
  | { kind: 'non_retryable'; error: unknown }
  | { kind: 'exhausted'; attempts: number; lastError: unknown };

export interface RetryOptions {
  isRetryable: (error: unknown) => boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  jitterMs?: () => number;
  /**
   * Override del delay para un error puntual (ej. honrar Retry-After en 429).
   * Recibe el delay por defecto (backoff + jitter) y devuelve el delay final.
   */
  retryDelayMs?: (error: unknown, defaultDelayMs: number) => number;
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions,
): Promise<Result<T, RetryError>> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 100;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return ok(await fn(attempt));
    } catch (error) {
      lastError = error;
      if (!opts.isRetryable(error)) return err({ kind: 'non_retryable', error });
      if (attempt >= maxAttempts) break;

      // Backoff exponencial: 100 -> 200 -> 400 -> 800 -> 1600 ms (+ jitter opcional)
      const defaultDelayMs = baseDelayMs * 2 ** (attempt - 1) + (opts.jitterMs?.() ?? 0);
      const delayMs = opts.retryDelayMs?.(error, defaultDelayMs) ?? defaultDelayMs;
      opts.onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs);
    }
  }

  return err({ kind: 'exhausted', attempts: maxAttempts, lastError });
}
