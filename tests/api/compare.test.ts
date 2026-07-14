import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { DIFF_TIE_TOLERANCE_PCT } from '../../src/lib/diff-buckets.ts';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

interface Row {
  ean: string;
  brand: string | null;
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
