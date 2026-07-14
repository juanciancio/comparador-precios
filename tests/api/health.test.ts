import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestApp } from './helpers.ts';

const http = useTestApp();

describe('GET /health', () => {
  it('responde 200 con la DB reachable', async () => {
    const res = await request(http()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('reachable');
    expect(typeof res.body.uptime_seconds).toBe('number');
  });
});
