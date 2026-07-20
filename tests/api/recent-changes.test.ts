import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';
import { db } from '../../src/lib/db.ts';

const http = useTestApp();

// Defaults de RECENT_CHANGES_MAX_PRICE / RECENT_CHANGES_MAX_DIFF_PCT (src/api/config/env.ts).
const MAX_PRICE = 500000;
const MAX_DIFF_PCT = 200;

interface Offer {
  retailer: string;
  price: number;
  isAvailable: boolean;
  validFrom: string;
}
interface Product {
  ean: string;
  brand: string | null;
  retailers: Offer[];
}
interface HistoryEntry {
  retailer: string;
  validFrom: string;
  validTo: string | null;
  price: number;
}

function get(query: Record<string, string | number> = {}) {
  return request(http()).get('/products/recent-changes').query(query);
}

/** |diff| cross-retailer, o null si el producto no está disponible en ambas. */
function diffPct(p: Product): number | null {
  const priceAt = (slug: string): number | undefined =>
    p.retailers.find((r) => r.retailer === slug && r.isAvailable)?.price;
  const m = priceAt('masonline');
  const c = priceAt('carrefour');
  if (m === undefined || c === undefined || m <= 0) return null;
  return Math.abs(((c - m) / m) * 100);
}

/**
 * Reconstruye la magnitud del cambio desde /price-history, que es la única forma
 * de verificarla: el shape de respuesta es el de /products y no expone el precio
 * anterior. Replica la definición del endpoint: por cadena, precio vigente contra
 * el inmediatamente anterior; del producto, el mayor entre cadenas.
 */
async function changeMagnitude(ean: string): Promise<number> {
  const res = await request(http()).get(`/products/${ean}/price-history`);
  expect(res.status).toBe(200);
  const history = res.body.history as HistoryEntry[];

  const magnitudes = [...new Set(history.map((h) => h.retailer))].map((retailer) => {
    // /price-history viene ordenado por validFrom DESC dentro de cada cadena.
    const rows = history.filter((h) => h.retailer === retailer);
    const [current, previous] = rows;
    if (!current || !previous || current.validTo !== null || previous.price <= 0) return 0;
    return Math.abs(current.price - previous.price) / previous.price;
  });

  return Math.max(0, ...magnitudes);
}

/**
 * El endpoint necesita al menos una vigencia CERRADA para tener un cambio de
 * precio que reportar, y el truncate de la regionalización (20/07/2026) dejó la
 * tabla con una sola corrida: `valid_to IS NOT NULL` no existe todavía, así que
 * el top-N es legítimamente vacío hasta la segunda corrida diaria.
 *
 * Los asserts sobre el contenido se saltean en ese estado en vez de aflojarse:
 * cuando haya historia vuelven a exigir lo mismo que exigían antes. Lo que NO se
 * saltea nunca es el contrato (status, envelope, validación de params).
 */
async function hasClosedVigencias(): Promise<boolean> {
  const rows = await db()<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM price_history WHERE valid_to IS NOT NULL
  `;
  return rows[0]!.n > 0;
}

describe('GET /products/recent-changes', () => {
  it('devuelve 200 con productos y el envelope de GET /products', async () => {
    const res = await get({ limit: 8 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (!(await hasClosedVigencias())) return;
    expect(res.body.data.length).toBeGreaterThan(0);
    // Top-N, no página: offset fijo en 0 y total = universo de la ventana.
    expect(res.body.pagination).toMatchObject({ limit: 8, offset: 0 });
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(res.body.data.length);

    for (const p of res.body.data as Product[]) {
      expect(p.ean).toBeTruthy();
      expect(p.retailers.length).toBeGreaterThan(0);
      // Solo entran productos con oferta vigente y disponible.
      expect(p.retailers.some((r) => r.isAvailable)).toBe(true);
    }
  });

  it('excluye la marca catchall "Genérico"/"Generico"', async () => {
    const res = await get({ limit: 30 });
    expect(res.status).toBe(200);
    for (const p of res.body.data as Product[]) {
      expect(p.brand).not.toBe('Genérico');
      expect(p.brand).not.toBe('Generico');
    }
  });

  it('ordena por magnitud de cambio DESC (verificado contra /price-history)', async () => {
    const res = await get({ limit: 8 });
    expect(res.status).toBe(200);
    const data = res.body.data as Product[];
    if (!(await hasClosedVigencias())) return;
    expect(data.length).toBeGreaterThan(1);

    const first = await changeMagnitude(data[0]!.ean);
    const last = await changeMagnitude(data[data.length - 1]!.ean);

    // Todo resultado cambió de precio: magnitud > 0, nunca un primer avistaje.
    expect(last).toBeGreaterThan(0);
    expect(first).toBeGreaterThanOrEqual(last);
  });

  it('respeta ?limit=3', async () => {
    const res = await get({ limit: 3 });
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(3);
    if (!(await hasClosedVigencias())) return;
    expect(res.body.data).toHaveLength(3);
  });

  it('rechaza limit fuera de rango (max 30) y hours fuera de rango (max 168)', async () => {
    expect((await get({ limit: 31 })).status).toBe(400);
    expect((await get({ hours: 169 })).status).toBe(400);
    expect((await get({ hours: 0 })).status).toBe(400);
  });

  it('?hours=24 devuelve un subset de ?hours=48', async () => {
    const wide = await get({ limit: 30, hours: 48 });
    const narrow = await get({ limit: 30, hours: 24 });
    expect(wide.status).toBe(200);
    expect(narrow.status).toBe(200);

    // Ventana más chica => nunca más productos que la más grande.
    expect(narrow.body.pagination.total).toBeLessThanOrEqual(wide.body.pagination.total);

    // Y sus cambios caen dentro de la ventana: el precio vigente de alguna cadena
    // empezó a regir hace <=24hs. validFrom es DATE, así que el borde admisible
    // es el día de hoy o el anterior (un cambio de las 23:00 de ayer entra).
    const floor = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);
    for (const p of narrow.body.data as Product[]) {
      const newest = p.retailers.map((r) => r.validFrom).sort().at(-1)!;
      expect(newest >= floor).toBe(true);
    }
  });

  it('aplica el techo de precio: ninguna cadena supera RECENT_CHANGES_MAX_PRICE', async () => {
    const res = await get({ limit: 30 });
    expect(res.status).toBe(200);
    for (const p of res.body.data as Product[]) {
      for (const offer of p.retailers) {
        if (offer.isAvailable) expect(offer.price).toBeLessThanOrEqual(MAX_PRICE);
      }
    }
  });

  it('aplica el techo de diff: ningún |diff_pct| supera RECENT_CHANGES_MAX_DIFF_PCT', async () => {
    const res = await get({ limit: 30 });
    expect(res.status).toBe(200);
    for (const p of res.body.data as Product[]) {
      const diff = diffPct(p);
      if (diff !== null) expect(diff).toBeLessThanOrEqual(MAX_DIFF_PCT);
    }
  });

  it('?min_diff_pct filtra por diferencia cross-retailer y exige ambas cadenas', async () => {
    const res = await get({ limit: 30, min_diff_pct: 20 });
    expect(res.status).toBe(200);
    for (const p of res.body.data as Product[]) {
      const diff = diffPct(p);
      expect(diff).not.toBeNull();
      expect(diff!).toBeGreaterThanOrEqual(20);
    }
  });

  it('cachea 5 min con cache-key por query params (MISS -> HIT)', async () => {
    // Query propia del test: la cache-key es la URL, así que no la comparte con
    // los tests de arriba y el primer request es un MISS genuino.
    const q = { limit: 4, hours: 47 };
    const first = await get(q);
    const second = await get(q);

    expect(first.status).toBe(200);
    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);

    // Otros params => otra key => MISS.
    const other = await get({ limit: 4, hours: 46 });
    expect(other.headers['x-cache']).toBe('MISS');
  });
});
