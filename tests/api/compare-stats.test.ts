import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { diffBucketIndex } from '../../src/lib/diff-buckets.ts';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

// Orden de labels del histograma tal como los expone el endpoint (contrato).
const BUCKET_LABELS = ['<5%', '5-10%', '10-25%', '25-50%', '>=50%'];

describe('GET /compare/stats', () => {
  it('responde con las 4 secciones', async () => {
    const res = await request(http()).get('/compare/stats');
    expect(res.status).toBe(200);
    expect(typeof res.body.total_matched).toBe('number');
    expect(Array.isArray(res.body.diff_histogram)).toBe(true);
    expect(res.body.cheaper).toBeTypeOf('object');
    expect(res.body.exclusives).toBeTypeOf('object');
  });

  it('cheaper (masonline + carrefour + tie) suma total_matched', async () => {
    const res = await request(http()).get('/compare/stats');
    const { masonline, carrefour, tie } = res.body.cheaper;
    expect(masonline.count + carrefour.count + tie.count).toBe(res.body.total_matched);
  });

  it('los buckets del histograma suman total_matched', async () => {
    const res = await request(http()).get('/compare/stats');
    const sum = res.body.diff_histogram.reduce(
      (acc: number, b: { count: number }) => acc + b.count,
      0,
    );
    expect(sum).toBe(res.body.total_matched);
  });

  it('coherencia con diffBucketIndex: 5.00 y 4.99 caen en el bucket que reporta el endpoint', async () => {
    const res = await request(http()).get('/compare/stats');
    const histogram = res.body.diff_histogram as { bucket: string }[];
    // El orden del histograma matchea el índice del helper compartido.
    for (let i = 0; i < BUCKET_LABELS.length; i++) {
      expect(histogram[i]!.bucket).toBe(BUCKET_LABELS[i]);
    }
    // Left-inclusive: 5.00 cae en '5-10%' (índice 1), 4.99 en '<5%' (índice 0).
    expect(diffBucketIndex(5.0)).toBe(1);
    expect(histogram[diffBucketIndex(5.0)]!.bucket).toBe('5-10%');
    expect(diffBucketIndex(4.99)).toBe(0);
    expect(histogram[diffBucketIndex(4.99)]!.bucket).toBe('<5%');
  });
});
