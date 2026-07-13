import './env.ts';
import postgres from 'postgres';
import type { Result } from './result.ts';
import { ok, err } from './result.ts';
import { logger } from './logger.ts';

export type DbError = { kind: 'query'; error: unknown };

type Db = ReturnType<typeof postgres>;

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

let sql: Db | undefined;

/** Cliente postgres singleton. Se crea lazy en el primer uso. */
export function db(): Db {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL no está seteada (revisá .env)');
    sql = postgres(url, { ssl: sslForUrl(url), onnotice: () => {} });
  }
  return sql;
}

/** Envuelve una operación de DB en Result. Nada de throws de errores esperados. */
export async function query<T>(fn: (sql: Db) => Promise<T>): Promise<Result<T, DbError>> {
  try {
    return ok(await fn(db()));
  } catch (error) {
    logger.error({ step: 'db_query', err: error }, 'db query failed');
    return err({ kind: 'query', error });
  }
}

/** Cierra la conexión (shutdown limpio del CLI). */
export async function close(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = undefined;
  }
}
