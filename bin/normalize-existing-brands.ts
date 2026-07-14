import '../src/lib/env.ts';
import { logger } from '../src/lib/logger.ts';
import { db, close } from '../src/lib/db.ts';
import { normalizeBrand } from '../src/pipeline/transform.ts';

/**
 * Migración retroactiva one-shot: aplica normalizeBrand (conservadora) a las
 * marcas ya persistidas en `products`. `brand` no es PK ni tiene FKs, así que es
 * un UPDATE in-place directo. Idempotente: segunda corrida = cero cambios.
 */

const log = logger.child({ step: 'normalize_existing_brands' });

async function main(): Promise<void> {
  const sql = db();

  const rows = await sql<{ ean: string; brand: string }[]>`
    SELECT ean, brand FROM products WHERE brand IS NOT NULL
  `;

  const updates = rows
    .map((r) => ({ ean: r.ean, from: r.brand, to: normalizeBrand(r.brand) }))
    .filter((u) => u.to !== u.from);

  log.info({ scanned: rows.length, toUpdate: updates.length }, 'brand scan complete');

  if (updates.length === 0) {
    log.info('no brands to normalize — already canonical (0 rows changed)');
    await close();
    return;
  }

  let migrated = 0;
  await sql.begin(async (tx) => {
    for (const u of updates) {
      // to === '' se guarda como NULL (marca era solo puntuación/espacios).
      const value = u.to === '' ? null : u.to;
      await tx`UPDATE products SET brand = ${value} WHERE ean = ${u.ean}`;
      migrated += 1;
    }
  });

  // Muestra de ejemplos para inspección visual.
  const samples = updates.slice(0, 10).map((u) => `"${u.from}" -> "${u.to}"`);
  log.info({ migrated, samples }, 'retroactive brand normalization complete');

  await close();
}

await main();
