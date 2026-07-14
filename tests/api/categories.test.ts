import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

describe('GET /categories', () => {
  // Un solo test para no acoplar el orden: la cache (TTL 5min) persiste entre
  // tests del archivo, así que el primer request debe ser el genuino MISS.
  it('devuelve categorías ordenadas DESC y cachea (MISS→HIT, 2do ≥5x más rápido)', async () => {
    const t0 = performance.now();
    const first = await request(http()).get('/categories');
    const firstMs = performance.now() - t0;

    const t1 = performance.now();
    const second = await request(http()).get('/categories');
    const secondMs = performance.now() - t1;

    expect(first.status).toBe(200);
    expect(first.body.length).toBeGreaterThan(0);

    // Ordenado por product_count DESC.
    const counts = first.body.map((c: { product_count: number }) => c.product_count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]!).toBeGreaterThanOrEqual(counts[i]!);
    }

    // Cache: primer request MISS, segundo HIT y mucho más rápido.
    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(firstMs).toBeGreaterThan(secondMs * 5);
  });
});
