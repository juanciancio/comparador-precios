import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module.ts';
import { apiEnv, corsOrigin } from './config/env.ts';
import { logger } from '../lib/logger.ts';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.ts';
import { TimingInterceptor } from './common/interceptors/timing.interceptor.ts';

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Comparador de Precios API')
    .setDescription(
      'API HTTP del comparador de precios de supermercados argentinos ' +
        '(Masonline + Carrefour). La llave universal es el EAN. Los precios usan ' +
        'un modelo de vigencias SCD-2: el "precio actual" es la fila con ' +
        '`valid_to IS NULL`. Read-only salvo el refresh on-demand ' +
        '(`POST /products/:ean/refresh`), que reingesta un producto puntual. ' +
        'Todos los errores comparten un shape común con `trace_id` para ' +
        'correlación con los logs.',
    )
    .setVersion('0.1')
    .addTag('Health', 'Liveness y reachability de la DB.')
    .addTag('Products', 'Catálogo unificado, detalle, histórico y refresh on-demand.')
    .addTag('Search', 'Búsqueda de productos por nombre/marca.')
    .addTag('Compare', 'Comparación cross-retailer por EAN y estadísticas.')
    .addTag('Categories', 'Categorías con conteo de productos (cacheado).')
    .addTag('Brands', 'Marcas con conteo de productos y matches (cacheado).')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document), {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { defaultModelsExpandDepth: 2 },
  });
}

/** Builds the Nest app without listening. Used by bootstrap() and by tests. */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  // POST habilitado por el refresh on-demand (POST /products/:ean/refresh).
  // credentials: true anticipa cookies/auth de Fase 4; hoy no hay credenciales.
  app.enableCors({ origin: corsOrigin(), methods: ['GET', 'POST', 'OPTIONS'], credentials: true });
  // Filtro de errores + timing, globales. Comparten el logger pino de la API.
  const apiLog = logger.child({ service: 'api' });
  app.useGlobalFilters(new HttpExceptionFilter(apiLog));
  app.useGlobalInterceptors(new TimingInterceptor(apiLog));
  setupSwagger(app);
  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.listen(apiEnv.API_PORT, '0.0.0.0');
  app
    .get(Logger)
    .log(
      `API listening on http://localhost:${apiEnv.API_PORT} — docs at /docs, spec at /docs-json`,
    );
}
