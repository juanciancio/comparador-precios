import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { DIFF_TIE_TOLERANCE_PCT } from '../../src/lib/diff-buckets.ts';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

interface Row {
  ean: string;
  brand: string | null;
  masonline_price: number;
  masonline_list_price: number | null;
  carrefour_price: number;
  carrefour_list_price: number | null;
  diff_pct: number;
  cheaper: 'masonline' | 'carrefour' | 'tie';
}

describe('GET /compare', () => {
  it('devuelve más de 3000 matches reales', async () => {
    const res = await request(http()).get('/compare').query({ limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBeGreaterThan(3000);
  });

  it('NUNCA devuelve marca Genérico/Generico (regla de negocio principal)', async () => {
    const res = await request(http()).get('/compare').query({ limit: 100 });
    expect(res.status).toBe(200);
    for (const r of res.body.data as Row[]) {
      expect(['Genérico', 'Generico']).not.toContain(r.brand);
    }
  });

  it('sort_by=diff_pct_abs&sort_dir=desc → ordenado por |diff_pct| descendente', async () => {
    const res = await request(http())
      .get('/compare')
      .query({ sort_by: 'diff_pct_abs', sort_dir: 'desc', limit: 10 });
    expect(res.status).toBe(200);
    const abs = (res.body.data as Row[]).map((r) => Math.abs(r.diff_pct));
    for (let i = 1; i < abs.length; i++) expect(abs[i - 1]!).toBeGreaterThanOrEqual(abs[i]!);
  });

  it('min_diff_pct=50 → todos con |diff_pct| >= 50', async () => {
    const res = await request(http()).get('/compare').query({ min_diff_pct: 50, limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const r of res.body.data as Row[]) expect(Math.abs(r.diff_pct)).toBeGreaterThanOrEqual(50);
  });

  it('cheaper_at=masonline → todos con cheaper: masonline', async () => {
    const res = await request(http()).get('/compare').query({ cheaper_at: 'masonline', limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const r of res.body.data as Row[]) expect(r.cheaper).toBe('masonline');
  });

  it('tolerancia de tie: |diff_pct| <= 1% → cheaper: tie (constante compartida)', async () => {
    const res = await request(http()).get('/compare').query({ cheaper_at: 'tie', limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const r of res.body.data as Row[]) {
      expect(r.cheaper).toBe('tie');
      expect(Math.abs(r.diff_pct)).toBeLessThanOrEqual(DIFF_TIE_TOLERANCE_PCT);
    }
  });
});

describe('GET /compare — precios de lista', () => {
  it('expone *_list_price de ambas cadenas, poblado y nunca por debajo del efectivo', async () => {
    const res = await request(http()).get('/compare').query({ limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const r of res.body.data as Row[]) {
      // El contrato los declara nullable (la columna lo admite), pero la captura
      // del scraper los puebla al 100%: un null acá es señal de bug, no de dato.
      expect(r.masonline_list_price).not.toBeNull();
      expect(r.carrefour_list_price).not.toBeNull();
      expect(typeof r.masonline_list_price).toBe('number');
      expect(typeof r.carrefour_list_price).toBe('number');
      // list < price no se observó nunca en 47.358 filas: sería un descuento negativo.
      expect(r.masonline_list_price!).toBeGreaterThanOrEqual(r.masonline_price);
      expect(r.carrefour_list_price!).toBeGreaterThanOrEqual(r.carrefour_price);
    }
  });

  it('diff_pct sigue calculándose sobre price, no sobre el precio de lista', async () => {
    const res = await request(http())
      .get('/compare')
      .query({ sort_by: 'diff_pct_abs', sort_dir: 'desc', limit: 30 });
    expect(res.status).toBe(200);
    for (const r of res.body.data as Row[]) {
      const fromEffective = ((r.carrefour_price - r.masonline_price) / r.masonline_price) * 100;
      expect(r.diff_pct).toBeCloseTo(fromEffective, 1);
    }
  });

  it('hay matches donde el precio de lista difiere del efectivo (canario del descuento)', async () => {
    // Si esto da 0, o el scraper dejó de capturar ListPrice o VTEX dejó de
    // descontar: en ambos casos queremos enterarnos por un test, no por un usuario.
    const res = await request(http()).get('/compare').query({ limit: 100 });
    expect(res.status).toBe(200);
    const withDiscount = (res.body.data as Row[]).filter(
      (r) =>
        (r.masonline_list_price ?? 0) > r.masonline_price ||
        (r.carrefour_list_price ?? 0) > r.carrefour_price,
    );
    expect(withDiscount.length).toBeGreaterThan(0);
  });
});
