import { Global, Module } from '@nestjs/common';
import { db, type Db } from '../../../lib/db.ts';
import { PG_CONNECTION } from './database.tokens.ts';

/**
 * Exposes the scraper's singleton postgres client (src/lib/db.ts) as an
 * injectable. Global so every feature module can inject it without re-importing.
 * No new connection pool: the API shares the same driver the pipeline uses.
 */
@Global()
@Module({
  providers: [{ provide: PG_CONNECTION, useFactory: (): Db => db() }],
  exports: [PG_CONNECTION],
})
export class DatabaseModule {}
