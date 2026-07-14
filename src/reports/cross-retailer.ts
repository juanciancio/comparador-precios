import '../lib/env.ts';
import { db } from '../lib/db.ts';
import { diffBucketIndex, DIFF_BUCKET_COUNT, DIFF_TIE_TOLERANCE_PCT } from '../lib/diff-buckets.ts';

/**
 * Reporte cruzado por EAN entre Masonline y Carrefour. Es la métrica que valida
 * el approach del proyecto: cuántos productos matchean por EAN (la llave
 * universal). Precio actual = fila de vigencia con `valid_to IS NULL` y
 * disponible. Los EANs ya están normalizados (ver descubrimiento 9 en CLAUDE.md),
 * así que el JOIN por string es exacto — sin falsos negativos por padding.
 *
 * Salida en texto plano (para pipe a archivo o pegar en el reporte final).
 */

interface MatchRow {
  ean: string;
  name_canonical: string;
  brand: string | null;
  masonline_price: string; // NUMERIC llega como string
  carrefour_price: string;
  diff_pct: string; // (carrefour - masonline) / masonline * 100
}

// Etiquetas de display del histograma (el orden matchea los buckets de diff-buckets.ts).
const BUCKET_LABELS = ['< 5%', '5–10%', '10–25%', '25–50%', '≥ 50%'] as const;

const fmtMoney = (s: string): string =>
  Number(s).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (s: string, n: number): string => (s.length >= n ? s : s + ' '.repeat(n - s.length));
const padL = (s: string, n: number): string => (s.length >= n ? s : ' '.repeat(n - s.length) + s);

/** Barra de texto proporcional (para histogramas). */
function bar(count: number, max: number, width = 40): string {
  if (max === 0) return '';
  return '█'.repeat(Math.round((count / max) * width));
}

export async function crossRetailerReport(): Promise<string> {
  const sql = db();

  const rows = await sql<MatchRow[]>`
    SELECT
      p.ean,
      p.name_canonical,
      p.brand,
      m.price::text  AS masonline_price,
      c.price::text  AS carrefour_price,
      ROUND(((c.price - m.price) / m.price * 100)::numeric, 2)::text AS diff_pct
    FROM products p
    JOIN price_history m
      ON m.ean = p.ean
      AND m.retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
      AND m.valid_to IS NULL
      AND m.is_available
    JOIN price_history c
      ON c.ean = p.ean
      AND c.retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
      AND c.valid_to IS NULL
      AND c.is_available
    WHERE m.price > 0
      -- "Genérico" es un catchall que cada cadena usa distinto; no es comparable
      -- cross-retailer (ver "Data quality signals conocidas" en CLAUDE.md). Se
      -- excluyen las 2 variantes hasta canonicalizar marcas (Fase 3+). El guard
      -- de NULL evita descartar matches legítimos sin marca.
      AND (p.brand IS NULL OR p.brand NOT IN ('Genérico', 'Generico'))
    ORDER BY ABS((c.price - m.price) / m.price) DESC
  `;

  // Exclusivos por cadena (EAN con precio vigente y disponible en una, no en la otra).
  const exclusives = await sql<{ masonline_only: string; carrefour_only: string }[]>`
    WITH m AS (
      SELECT ean FROM price_history
      WHERE retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
        AND valid_to IS NULL AND is_available
    ),
    c AS (
      SELECT ean FROM price_history
      WHERE retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
        AND valid_to IS NULL AND is_available
    )
    SELECT
      (SELECT COUNT(*) FROM m WHERE ean NOT IN (SELECT ean FROM c))::text AS masonline_only,
      (SELECT COUNT(*) FROM c WHERE ean NOT IN (SELECT ean FROM m))::text AS carrefour_only
  `;

  const out: string[] = [];
  const line = (s = ''): void => void out.push(s);
  const rule = (): void => line('─'.repeat(78));

  line();
  line('════════════════════════════════════════════════════════════════════════════');
  line('  REPORTE CRUZADO POR EAN — Masonline vs Carrefour');
  line('════════════════════════════════════════════════════════════════════════════');

  // 1) Total de matches
  const total = rows.length;
  line();
  line(`  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: ${total.toLocaleString('es-AR')}`);
  line(`  (ambas cadenas, precio vigente y disponible, price > 0)`);

  if (total === 0) {
    line();
    line('  Sin matches. ¿Corrió el scraper de ambas cadenas?');
    return out.join('\n');
  }

  const diffs = rows.map((r) => Number(r.diff_pct));
  const absDiffs = diffs.map((d) => Math.abs(d));

  // 2) Histograma de |diferencia %| (buckets compartidos con /compare/stats).
  const bucketCounts = new Array<number>(DIFF_BUCKET_COUNT).fill(0);
  for (const d of absDiffs) bucketCounts[diffBucketIndex(d)]! += 1;
  const maxBucket = Math.max(...bucketCounts);
  line();
  rule();
  line('  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)');
  rule();
  BUCKET_LABELS.forEach((label, i) => {
    const cnt = bucketCounts[i]!;
    const pct = ((cnt / total) * 100).toFixed(1);
    line(`  ${pad(label, 8)} ${padL(cnt.toLocaleString('es-AR'), 7)} (${padL(pct, 5)}%) ${bar(cnt, maxBucket)}`);
  });

  // 3) Ranking "quién es más barato" (tolerancia 1% = empate)
  let masCheaper = 0;
  let carCheaper = 0;
  let ties = 0;
  for (const d of diffs) {
    if (Math.abs(d) <= DIFF_TIE_TOLERANCE_PCT) ties += 1;
    else if (d > 0) masCheaper += 1; // carrefour más caro -> masonline más barato
    else carCheaper += 1;
  }
  const pctOf = (n: number): string => ((n / total) * 100).toFixed(1);
  line();
  rule();
  line(`  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ ${DIFF_TIE_TOLERANCE_PCT}%)`);
  rule();
  line(`  Masonline más barato: ${padL(masCheaper.toLocaleString('es-AR'), 7)} (${pctOf(masCheaper)}%)`);
  line(`  Carrefour más barato: ${padL(carCheaper.toLocaleString('es-AR'), 7)} (${pctOf(carCheaper)}%)`);
  line(`  Empate:               ${padL(ties.toLocaleString('es-AR'), 7)} (${pctOf(ties)}%)`);

  // 4) Top 20 por |diff %| (spot-check: 300% suele ser promo real o bug unidad/pack)
  line();
  rule();
  line('  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual');
  rule();
  line(`  ${pad('EAN', 15)} ${padL('Mas $', 13)} ${padL('Car $', 13)} ${padL('diff%', 9)}  Producto`);
  for (const r of rows.slice(0, 20)) {
    const d = Number(r.diff_pct);
    const cheaper = Math.abs(d) <= DIFF_TIE_TOLERANCE_PCT ? '=' : d > 0 ? 'M' : 'C';
    line(
      `  ${pad(r.ean, 15)} ${padL(fmtMoney(r.masonline_price), 13)} ${padL(fmtMoney(r.carrefour_price), 13)} ${padL(r.diff_pct, 8)}% ${cheaper} ${(r.brand ? `[${r.brand}] ` : '')}${r.name_canonical}`.slice(0, 120),
    );
  }

  // 5) Distribución por brand (top 20 con más matches)
  const byBrand = new Map<string, number>();
  for (const r of rows) {
    const b = r.brand ?? '(sin marca)';
    byBrand.set(b, (byBrand.get(b) ?? 0) + 1);
  }
  const topBrands = [...byBrand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const maxBrand = topBrands[0]?.[1] ?? 0;
  line();
  rule();
  line('  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)');
  rule();
  for (const [brand, cnt] of topBrands) {
    line(`  ${pad(brand.slice(0, 24), 24)} ${padL(cnt.toLocaleString('es-AR'), 6)}  ${bar(cnt, maxBrand, 30)}`);
  }

  // 6) Exclusivos por cadena
  const ex = exclusives[0]!;
  line();
  rule();
  line('  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)');
  rule();
  line(`  Solo en Masonline: ${Number(ex.masonline_only).toLocaleString('es-AR')}`);
  line(`  Solo en Carrefour: ${Number(ex.carrefour_only).toLocaleString('es-AR')}`);

  line();
  line('════════════════════════════════════════════════════════════════════════════');
  return out.join('\n');
}
