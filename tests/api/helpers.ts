import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll } from 'vitest';
import { createApp } from '../../src/api/main.ts';
import { close } from '../../src/lib/db.ts';

/**
 * Registra el ciclo de vida del INestApplication para un archivo de test y
 * devuelve un getter del http.Server para pasarle a supertest.
 *
 * Cada archivo de test corre en su propio proceso (vitest forks), así el pool
 * pg singleton es por-proceso: se abre lazy en el primer query y se cierra en
 * afterAll. `createApp()` arma la app sin escuchar (diseñado para tests).
 */
export function useTestApp(): () => Server {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await close();
  });

  return () => app.getHttpServer() as Server;
}
