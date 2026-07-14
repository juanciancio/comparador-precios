import '../src/lib/env.ts';
import { z } from 'zod';
import { logger } from '../src/lib/logger.ts';
import { db, close } from '../src/lib/db.ts';
import { retailers } from '../src/config/retailers.ts';
import { scrapeDepartments, type ScrapeStats } from '../src/scrapers/base-scraper.ts';
import { extractSkus } from '../src/pipeline/extract.ts';
import { normalizeSku, EanDeduper } from '../src/pipeline/transform.ts';
import { loadRun, reap } from '../src/pipeline/load.ts';
import { getRateLimitHits, resetRateLimitHits } from '../src/lib/vtex-client.ts';

const REAP_THRESHOLD = 0.8;

function parseArgs(argv: string[]): unknown {
  const flags: Record<string, string> = {};
  for (const arg of argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) flags[match[1]!] = match[2]!;
  }
  return {
    retailer: flags['retailer'],
    limitCategories:
      flags['limit-categories'] !== undefined ? Number(flags['limit-categories']) : undefined,
  };
}

const argsSchema = z.object({
  retailer: z.enum(['masonline', 'carrefour']),
  limitCategories: z.number().int().positive().optional(),
});

async function main(): Promise<void> {
  const parsed = argsSchema.safeParse(parseArgs(process.argv));
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues },
      'invalid args — use --retailer=masonline|carrefour [--limit-categories=N]',
    );
    process.exitCode = 1;
    return;
  }
  const { retailer: slug, limitCategories } = parsed.data;
  const retailer = retailers[slug];
  const log = logger.child({ retailer: slug });

  resetRateLimitHits();
  const sql = db();

  const retailerRows = await sql<{ id: number }[]>`SELECT id FROM retailers WHERE slug = ${slug}`;
  const retailerRow = retailerRows[0];
  if (!retailerRow) {
    log.error({ step: 'init' }, 'retailer not seeded in DB (run pnpm db:migrate)');
    await close();
    process.exitCode = 1;
    return;
  }
  const retailerId = retailerRow.id;

  const runRows = await sql<{ id: number }[]>`
    INSERT INTO scrape_runs (retailer_id, started_at, status)
    VALUES (${retailerId}, NOW(), 'running')
    RETURNING id
  `;
  const runId = runRows[0]!.id;
  const startedAt = Date.now();
  log.info({ runId, limitCategories: limitCategories ?? null }, 'scrape run started');

  // Baseline para department_went_empty: departamentos con productos de este
  // retailer (el nombre de departamento es el 2do segmento de category_path).
  const baseRows = await sql<{ dept: string }[]>`
    SELECT DISTINCT split_part(p.category_path, '/', 2) AS dept
    FROM products p JOIN retailer_products rp ON rp.ean = p.ean
    WHERE rp.retailer_id = ${retailerId} AND p.category_path IS NOT NULL
  `;
  const baseline = new Set(baseRows.map((r) => r.dept).filter((d) => d.length > 0));

  const deduper = new EanDeduper(log);
  const seenEans = new Set<string>();
  const warnings = {
    noEan: 0,
    badEan: { total: 0, non_numeric: 0, wrong_length: 0, other: 0 },
    zod: 0,
    noSeller: 0,
  };
  const stats: ScrapeStats = {
    departmentsProcessed: 0,
    departmentsEmpty: 0,
    departmentsWentEmpty: 0,
  };
  const errorSummary: unknown[] = [];
  let errors = 0;

  const opts = {
    ...(limitCategories !== undefined ? { limitDepartments: limitCategories } : {}),
    wasNonEmpty: (name: string) => baseline.has(name),
    stats,
  };

  try {
    for await (const scraped of scrapeDepartments(retailer, log, opts)) {
      const extracted = extractSkus(scraped.raw, retailer.host);
      for (const warn of extracted.warnings) {
        if (warn.kind === 'no_ean') warnings.noEan += 1;
        else if (warn.kind === 'bad_ean') {
          warnings.badEan.total += 1;
          warnings.badEan[warn.reason] += 1;
          if (errorSummary.length < 100) errorSummary.push(warn);
        } else if (warn.kind === 'no_seller') warnings.noSeller += 1;
        else {
          warnings.zod += 1;
          if (errorSummary.length < 100) errorSummary.push(warn);
        }
      }
      for (const row of extracted.rows) {
        const normalized = normalizeSku(row);
        seenEans.add(normalized.ean);
        deduper.add(normalized);
      }
    }

    const loadResult = await loadRun(retailerId, deduper.values(), log);
    if (!loadResult.ok) {
      errors += 1;
      errorSummary.push({ step: 'load', error: String(loadResult.error.error) });
      throw new Error('load failed');
    }
    const loaded = loadResult.value;

    // Reaping con guard por 80% del último success (fail-safe, no por flag).
    let reaped = 0;
    const lastRows = await sql<{ products_scraped: number | null }[]>`
      SELECT products_scraped FROM scrape_runs
      WHERE retailer_id = ${retailerId} AND status = 'success'
      ORDER BY finished_at DESC LIMIT 1
    `;
    const lastScraped = lastRows[0]?.products_scraped ?? null;
    if (lastScraped === null) {
      log.info({ step: 'reap' }, 'skipping reaping: no previous successful run (no baseline)');
    } else if (seenEans.size < lastScraped * REAP_THRESHOLD) {
      log.warn(
        { step: 'reap', productsThisRun: seenEans.size, productsLastRun: lastScraped },
        'skipping reaping: current run scraped below 80% of last successful',
      );
    } else {
      const reapResult = await reap(retailerId, [...seenEans], log);
      if (reapResult.ok) reaped = reapResult.value.reaped;
      else {
        errors += 1;
        errorSummary.push({ step: 'reap', error: String(reapResult.error.error) });
      }
    }

    const rateLimitHits = getRateLimitHits();
    await sql`
      UPDATE scrape_runs SET
        status = 'success', finished_at = NOW(),
        products_scraped = ${seenEans.size}, products_new = ${loaded.productsNew},
        errors_count = ${errors}, error_summary = ${JSON.stringify(errorSummary)}::jsonb,
        rate_limit_hits = ${rateLimitHits}, bad_ean_total = ${warnings.badEan.total}
      WHERE id = ${runId}
    `;

    log.info(
      {
        runId,
        durationMs: Date.now() - startedAt,
        uniqueEans: seenEans.size,
        productsNew: loaded.productsNew,
        price: { new: loaded.priceNew, changed: loaded.priceChanged, unchanged: loaded.priceUnchanged },
        skippedUnpriceable: loaded.skippedUnpriceable,
        warnings,
        dedupDuplicates: deduper.duplicateCount,
        departments: stats,
        reaped,
        rateLimitHits,
        errors,
      },
      'scrape run complete',
    );
  } catch (error) {
    const rateLimitHits = getRateLimitHits();
    log.error({ runId, err: error, rateLimitHits }, 'scrape run failed');
    await sql`
      UPDATE scrape_runs SET
        status = 'failed', finished_at = NOW(),
        products_scraped = ${seenEans.size}, products_new = 0,
        errors_count = ${errors + 1}, error_summary = ${JSON.stringify(errorSummary)}::jsonb,
        rate_limit_hits = ${rateLimitHits}, bad_ean_total = ${warnings.badEan.total}
      WHERE id = ${runId}
    `;
    process.exitCode = 1;
  } finally {
    await close();
  }
}

await main();
