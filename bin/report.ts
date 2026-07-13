import '../src/lib/env.ts';
import { close } from '../src/lib/db.ts';
import { logger } from '../src/lib/logger.ts';
import { crossRetailerReport } from '../src/reports/cross-retailer.ts';

/**
 * CLI de reportes. Uso: `pnpm report --cross-retailer`.
 * El output va a stdout en texto plano (pipeable a archivo).
 */
async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));

  if (flags.has('--cross-retailer')) {
    try {
      const text = await crossRetailerReport();
      // eslint-disable-next-line no-console
      console.log(text);
    } catch (error) {
      logger.error({ err: error, step: 'report' }, 'cross-retailer report failed');
      process.exitCode = 1;
    } finally {
      await close();
    }
    return;
  }

  // eslint-disable-next-line no-console
  console.error('uso: pnpm report --cross-retailer');
  process.exitCode = 1;
}

await main();
