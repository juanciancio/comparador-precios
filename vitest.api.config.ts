import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Tests de integración de la API (supertest contra un INestApplication real,
// DB real de Supabase). SWC transforma los .ts emitiendo decorator metadata
// (esbuild NO lo hace → rompe la DI de Nest, mismo motivo que en el runtime).
export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts'],
    // TTL comunitario del refresh bajado a 2s para poder testear la expiración.
    env: { REFRESH_TTL_SECONDS: '2' },
    // Fetch en vivo a VTEX (refresh) + Supabase: márgenes holgados.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Un archivo por proceso, secuencial: el pool pg singleton es por-proceso y
    // cada archivo lo abre/cierra en su beforeAll/afterAll sin pisar a otro.
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
      },
    }),
  ],
});
