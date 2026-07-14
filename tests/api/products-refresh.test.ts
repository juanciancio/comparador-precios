import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

// EAN real en ambas cadenas. El refresh le pega en vivo a VTEX.
const KNOWN_EAN = '7790894902018';
// El suite corre con REFRESH_TTL_SECONDS=2 (vitest.api.config.ts).
const TTL_MS = 2_000;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Tests secuenciales y dependientes del orden: cada uno deja last_seen_at en un
// estado que el siguiente asume. Vitest corre los it() de un archivo en orden.
describe('POST /products/:ean/refresh (TTL comunitario)', () => {
  it('primer refresh sobre data vieja → was_refreshed: true, updated_at reciente', async () => {
    // Garantiza staleness: esperar > TTL hace que (now - last_seen) supere el TTL,
    // sin depender de cuándo fue el último refresh externo.
    await sleep(TTL_MS + 500);
    const res = await request(http()).post(`/products/${KNOWN_EAN}/refresh`);
    expect(res.status).toBe(200);
    expect(res.body.was_refreshed).toBe(true);
    expect(Date.now() - Date.parse(res.body.updated_at)).toBeLessThan(60_000);
  });

  it('refresh inmediato después → was_refreshed: false (dentro del TTL)', async () => {
    const res = await request(http()).post(`/products/${KNOWN_EAN}/refresh`);
    expect(res.status).toBe(200);
    expect(res.body.was_refreshed).toBe(false);
  });

  it('tras esperar > TTL → was_refreshed: true de nuevo', async () => {
    await sleep(TTL_MS + 500);
    const res = await request(http()).post(`/products/${KNOWN_EAN}/refresh`);
    expect(res.status).toBe(200);
    expect(res.body.was_refreshed).toBe(true);
  });

  it('404 con EAN inexistente (no dispara pipeline)', async () => {
    const res = await request(http()).post('/products/9999999999999/refresh');
    expect(res.status).toBe(404);
  });
});
