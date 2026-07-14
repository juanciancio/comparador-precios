import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { DatabaseModule } from './common/database/database.module.ts';
import { HealthModule } from './modules/health/health.module.ts';
import { ProductsModule } from './modules/products/products.module.ts';
import { SearchModule } from './modules/search/search.module.ts';
import { CompareModule } from './modules/compare/compare.module.ts';
import { CategoriesModule } from './modules/categories/categories.module.ts';
import { BrandsModule } from './modules/brands/brands.module.ts';
import { apiEnv, isProduction } from './config/env.ts';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: apiEnv.LOG_LEVEL,
        base: { service: 'api' },
        // Pretty output in dev only; pino-pretty is a devDependency and is
        // pruned in the production image.
        ...(isProduction()
          ? {}
          : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
      },
    }),
    ThrottlerModule.forRoot([
      { ttl: apiEnv.RATE_LIMIT_TTL * 1000, limit: apiEnv.RATE_LIMIT_LIMIT },
    ]),
    // Cache in-memory global (sin Redis). Solo /categories y /brands lo usan vía
    // CacheInterceptor; el default TTL es un fallback.
    CacheModule.register({ isGlobal: true, ttl: 5 * 60 * 1000 }),
    DatabaseModule,
    HealthModule,
    ProductsModule,
    SearchModule,
    CompareModule,
    CategoriesModule,
    BrandsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
