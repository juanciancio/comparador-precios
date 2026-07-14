import '../src/lib/env.ts';
import { logger } from '../src/lib/logger.ts';
import { db, close } from '../src/lib/db.ts';

/**
 * Health check semanal (corre en CI). Falla (exit 1 → email a Juan) si detecta
 * señales de degradación. Canarios simples, no diagnóstico fino:
 *  1. La última corrida exitosa de cada retailer tiene < 48hs.
 *  2. `products` tiene al menos 30k filas (canario de "algo dejó de escribir").
 *  3. `bad_ean_total` de la última corrida no supera el doble del promedio de las
 *     últimas 7 (canario de degradación de data quality del retailer).
 */

const MIN_PRODUCTS = 30_000;
const STALE_HOURS = 48;
const BAD_EAN_FACTOR = 2;

const log = logger.child({ step: 'health_check' });

async function main(): Promise<void> {
  const sql = db();
  const failures: string[] = [];

  const retailers = await sql<{ id: number; slug: string }[]>`SELECT id, slug FROM retailers`;

  // 1) frescura por retailer
  for (const r of retailers) {
    const last = await sql<{ age_hours: string | null }[]>`
      SELECT EXTRACT(EPOCH FROM (NOW() - MAX(finished_at))) / 3600 AS age_hours
      FROM scrape_runs
      WHERE retailer_id = ${r.id} AND status = 'success'
    `;
    // EXTRACT/división vuelven como string en postgres.js -> coercionar.
    const ageRaw = last[0]?.age_hours;
    const age = ageRaw === null || ageRaw === undefined ? null : Number(ageRaw);
    if (age === null || Number.isNaN(age)) {
      failures.push(`[${r.slug}] no hay ninguna corrida exitosa registrada`);
    } else if (age > STALE_HOURS) {
      failures.push(`[${r.slug}] última corrida exitosa hace ${age.toFixed(1)}h (> ${STALE_HOURS}h)`);
    } else {
      log.info({ retailer: r.slug, ageHours: Number(age.toFixed(1)) }, 'freshness OK');
    }
  }

  // 2) canario de catálogo
  const prod = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM products`;
  const productCount = Number(prod[0]!.count);
  if (productCount < MIN_PRODUCTS) {
    failures.push(`products tiene ${productCount} filas (< ${MIN_PRODUCTS})`);
  } else {
    log.info({ productCount }, 'catalog size OK');
  }

  // 3) degradación de bad_ean por retailer (skip si el baseline es 0)
  for (const r of retailers) {
    const rows = await sql<{ bad_ean_total: number; rn: number }[]>`
      SELECT bad_ean_total, ROW_NUMBER() OVER (ORDER BY finished_at DESC) AS rn
      FROM scrape_runs
      WHERE retailer_id = ${r.id} AND status = 'success' AND finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 7
    `;
    if (rows.length === 0) continue;
    const latest = Number(rows.find((x) => Number(x.rn) === 1)!.bad_ean_total);
    const avg = rows.reduce((a, x) => a + Number(x.bad_ean_total), 0) / rows.length;
    if (avg <= 0) {
      log.info({ retailer: r.slug, latest, avg }, 'bad_ean baseline insufficient (skipping check)');
      continue;
    }
    if (latest > avg * BAD_EAN_FACTOR) {
      failures.push(
        `[${r.slug}] bad_ean_total=${latest} supera ${BAD_EAN_FACTOR}x el promedio de las últimas ${rows.length} (${avg.toFixed(0)})`,
      );
    } else {
      log.info({ retailer: r.slug, latest, avg: Number(avg.toFixed(0)) }, 'bad_ean OK');
    }
  }

  await close();

  if (failures.length > 0) {
    for (const f of failures) log.error({ failure: f }, 'health check FAILED');
    log.error({ failures: failures.length }, 'health check failed — see failures above');
    process.exitCode = 1;
    return;
  }
  log.info('all health checks passed');
}

await main();
