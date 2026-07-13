import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import pino from 'pino';
import type { Result } from '../src/lib/result.ts';
import { ok, err } from '../src/lib/result.ts';

/**
 * Carga .env si existe, sin dependencias externas.
 * process.loadEnvFile está disponible en Node >=20.12; si no, se asume que
 * las variables ya vienen del entorno (CI, prod).
 */
function loadDotEnv(): void {
  if (!existsSync('.env')) return;
  const proc = process as unknown as { loadEnvFile?: (p?: string) => void };
  if (typeof proc.loadEnvFile === 'function') proc.loadEnvFile('.env');
}

type MigrateError =
  | { kind: 'config'; message: string }
  | { kind: 'sql'; error: unknown };

/**
 * SSL: Supabase (pooler o directa) exige TLS; Postgres local (Docker) no lo
 * soporta. Se decide por hostname: local -> sin ssl, remoto -> 'require'.
 */
function sslForUrl(url: string): 'require' | false {
  try {
    const hostname = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1'].includes(hostname) ? false : 'require';
  } catch {
    return 'require';
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(here, '../src/db/migrations');

loadDotEnv();

const logger = pino({ name: 'migrate', level: process.env.LOG_LEVEL ?? 'info' });

async function migrate(): Promise<Result<{ applied: string[] }, MigrateError>> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return err({ kind: 'config', message: 'DATABASE_URL no está seteada (revisá .env)' });
  }

  const sql = postgres(url, { max: 1, onnotice: () => {}, ssl: sslForUrl(url) });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const appliedRows = await sql<{ name: string }[]>`SELECT name FROM _migrations`;
    const applied = new Set(appliedRows.map((r) => r.name));
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      logger.info({ step: 'migrate', total: files.length }, 'no pending migrations');
      return ok({ applied: [] });
    }

    const done: string[] = [];
    for (const file of pending) {
      const contents = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      // Cada migration corre en su propia transacción: DDL transaccional en
      // Postgres, así una falla no deja el esquema a medias.
      await sql.begin(async (tx) => {
        await tx.unsafe(contents);
        await tx`INSERT INTO _migrations (name) VALUES (${file})`;
      });
      logger.info({ step: 'apply', migration: file }, 'migration applied');
      done.push(file);
    }

    return ok({ applied: done });
  } catch (error) {
    return err({ kind: 'sql', error });
  } finally {
    await sql.end();
  }
}

const result = await migrate();
if (!result.ok) {
  logger.error({ step: 'migrate', err: result.error }, 'migration run failed');
  process.exitCode = 1;
} else {
  logger.info(
    { step: 'migrate', applied: result.value.applied, count: result.value.applied.length },
    'migration run complete',
  );
}
