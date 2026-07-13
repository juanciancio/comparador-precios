import './env.ts';
import pino from 'pino';

/**
 * Logger raíz. Salida JSON estructurada, contexto base { service: 'scraper' }.
 * Para logs con contexto usar el `.child()` nativo de pino:
 *   const log = logger.child({ retailer, categoryId, step });
 */
export const logger = pino({
  base: { service: 'scraper' },
  level: process.env.LOG_LEVEL ?? 'info',
});

export type Logger = typeof logger;
