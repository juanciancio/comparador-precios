import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module.ts';
import { apiEnv, corsOrigin } from './config/env.ts';

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Comparador de Precios API')
    .setDescription(
      'Read-only HTTP API over the Argentine supermarket price dataset ' +
        '(Masonline + Carrefour). Prices use an SCD-2 validity model; ' +
        '"current price" is the row with `valid_to IS NULL`.',
    )
    .setVersion('0.1')
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
  app.enableCors({ origin: corsOrigin(), methods: ['GET', 'OPTIONS'] });
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
