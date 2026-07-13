import { existsSync } from 'node:fs';

/**
 * Carga .env al importar este módulo (side-effect). Sin dependencias externas:
 * process.loadEnvFile está en Node >=20.12. En entornos sin .env (CI, prod) se
 * asume que las variables ya vienen del ambiente.
 *
 * Importar `./env.ts` PRIMERO en cualquier módulo que lea process.env al cargarse
 * (logger, vtex-client) garantiza que las variables estén disponibles a tiempo.
 */
function loadDotEnv(): void {
  if (!existsSync('.env')) return;
  const proc = process as unknown as { loadEnvFile?: (p?: string) => void };
  if (typeof proc.loadEnvFile === 'function') proc.loadEnvFile('.env');
}

loadDotEnv();
