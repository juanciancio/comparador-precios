import '../src/lib/env.ts';
import { logger } from '../src/lib/logger.ts';
import { db, close } from '../src/lib/db.ts';
import { normalizeEan } from '../src/pipeline/transform.ts';

/**
 * Migración retroactiva one-shot: canoniza los EAN ya persistidos (strip de ceros
 * a la izquierda) para que el matching cross-retailer sea consistente. Ver punto 9
 * de "Descubrimientos técnicos ya validados" en CLAUDE.md.
 *
 * Las FKs (retailer_products.ean, price_history.ean) apuntan a products.ean SIN
 * ON UPDATE CASCADE, así que el rename es: insertar fila canónica -> repuntar
 * hijos -> borrar fila vieja (respeta el FK en cada paso).
 *
 * Casos:
 *  - rename limpio: el EAN canónico no existía todavía -> se migra.
 *  - colisión (merge): el EAN canónico YA existe como otra fila (mismo producto
 *    físico bajo dos formatos de string). NO se mergea a ciegas (implicaría fundir
 *    dos cadenas de vigencias SCD-2): se saltea y se reporta para revisión manual.
 *  - invalid: un EAN guardado que no normaliza (no-dígitos / fuera de rango).
 *    No debería existir; se reporta y se saltea.
 *
 * Idempotente: segunda corrida no encuentra candidatos -> cero cambios.
 */

const log = logger.child({ step: 'normalize_existing_eans' });

interface Candidate {
  raw: string;
  normalized: string;
}

async function main(): Promise<void> {
  const sql = db();

  const before = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM products`;
  const productsBefore = Number(before[0]!.count);

  const rows = await sql<{ ean: string }[]>`SELECT ean FROM products`;

  const candidates: Candidate[] = [];
  const invalid: Array<{ ean: string; reason: string }> = [];
  for (const { ean } of rows) {
    const r = normalizeEan(ean);
    if (!r.ok) {
      invalid.push({ ean, reason: r.error.kind });
      continue;
    }
    if (r.value !== ean) candidates.push({ raw: ean, normalized: r.value });
  }

  log.info(
    { productsBefore, candidates: candidates.length, invalid: invalid.length },
    'scan complete',
  );

  for (const inv of invalid) {
    log.warn({ ean: inv.ean, reason: inv.reason }, 'stored EAN does not normalize, skipping');
  }

  if (candidates.length === 0) {
    log.info(
      { productsBefore },
      'no EANs to migrate — catalog already canonical (0 rows changed)',
    );
    await close();
    return;
  }

  const conflicts: Candidate[] = [];
  let migrated = 0;

  await sql.begin(async (tx) => {
    // Set de EANs existentes para detectar colisiones de merge en vivo.
    const existing = new Set(rows.map((r) => r.ean));

    for (const { raw, normalized } of candidates) {
      if (existing.has(normalized)) {
        conflicts.push({ raw, normalized });
        continue;
      }

      // 1) fila canónica nueva (copia todas las columnas de la vieja)
      await tx`
        INSERT INTO products (ean, name_canonical, brand, category_path, image_url, first_seen_at, last_seen_at)
        SELECT ${normalized}, name_canonical, brand, category_path, image_url, first_seen_at, last_seen_at
        FROM products WHERE ean = ${raw}
      `;
      // 2) repuntar hijos (no colisionan: no había filas con el EAN canónico)
      await tx`UPDATE retailer_products SET ean = ${normalized} WHERE ean = ${raw}`;
      await tx`UPDATE price_history SET ean = ${normalized} WHERE ean = ${raw}`;
      // 3) borrar fila vieja (ya sin hijos que la referencien)
      await tx`DELETE FROM products WHERE ean = ${raw}`;

      existing.delete(raw);
      existing.add(normalized);
      migrated += 1;
    }
  });

  for (const c of conflicts) {
    log.warn(
      { raw: c.raw, normalized: c.normalized, reason: 'merge_conflict' },
      'canonical EAN already exists as a separate row — skipped, needs manual merge review',
    );
  }

  const after = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM products`;
  const productsAfter = Number(after[0]!.count);

  log.info(
    {
      productsBefore,
      productsAfter,
      migrated,
      conflicts: conflicts.length,
      invalid: invalid.length,
      productsDelta: productsAfter - productsBefore,
    },
    'retroactive EAN normalization complete',
  );

  await close();
}

await main();
