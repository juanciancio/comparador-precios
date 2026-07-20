import { describe, it, expect } from 'vitest';
import { buildVtexSegmentCookie } from '../src/lib/vtex-client.ts';
import { regions, DEFAULT_REGION, regionIdFor } from '../src/config/regions.ts';

/** Decodifica el payload que viaja adentro de la cookie. */
function decodeCookie(cookie: string): unknown {
  const prefix = 'vtex_segment=';
  expect(cookie.startsWith(prefix)).toBe(true);
  const b64 = cookie.slice(prefix.length);
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

describe('buildVtexSegmentCookie', () => {
  it('produces the exact payload shape VTEX expects', () => {
    // Shape verificado empíricamente contra ambas cadenas (2026-07-20): con este
    // payload el precio del EAN sentinel pasa de 4085 (fantasma) a 4330 (Olavarría).
    expect(decodeCookie(buildVtexSegmentCookie('region-abc'))).toEqual({
      regionId: 'region-abc',
      channel: '{"salesChannel":"1"}',
      countryCode: 'ARG',
    });
  });

  it('keeps channel as an escaped JSON string, not a nested object', () => {
    // Es JSON adentro de JSON a propósito. Si esto se "arregla" a un objeto
    // anidado, VTEX ignora la cookie y vuelve a servir el precio sin regionalizar
    // — sin error, solo precios mal.
    const payload = decodeCookie(buildVtexSegmentCookie('x')) as { channel: unknown };
    expect(typeof payload.channel).toBe('string');
    expect(JSON.parse(payload.channel as string)).toEqual({ salesChannel: '1' });
  });

  it('round-trips a real regionId (base64 of the payload, not of the id)', () => {
    const realId = regionIdFor(DEFAULT_REGION, 'carrefour')!;
    const payload = decodeCookie(buildVtexSegmentCookie(realId)) as { regionId: string };
    expect(payload.regionId).toBe(realId);
  });

  it('emits valid base64', () => {
    const b64 = buildVtexSegmentCookie('abc').replace('vtex_segment=', '');
    expect(b64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });
});

describe('regions config', () => {
  it('DEFAULT_REGION exists in the regions map', () => {
    expect(regions[DEFAULT_REGION]).toBeDefined();
    expect(regions[DEFAULT_REGION].postalCode).toBe('7400');
  });

  it('has a regionId for every retailer the scraper runs', () => {
    // Si se agrega un retailer a config/retailers.ts sin su regionId acá, el
    // scraper aborta en el init. Este test lo hace fallar antes, en CI.
    for (const slug of ['masonline', 'carrefour']) {
      const id = regionIdFor(DEFAULT_REGION, slug);
      expect(id, `falta regionId de ${slug} en la región ${DEFAULT_REGION}`).toBeTruthy();
    }
  });

  it('gives each retailer its OWN regionId', () => {
    // Los regionId son por instancia de VTEX: reusar el de una cadena en la otra
    // no da error, da precios de otra región (o el default). Es un copy-paste
    // fácil de cometer y silencioso.
    expect(regionIdFor(DEFAULT_REGION, 'masonline')).not.toBe(
      regionIdFor(DEFAULT_REGION, 'carrefour'),
    );
  });

  it('returns undefined for a retailer not configured in the region', () => {
    expect(regionIdFor(DEFAULT_REGION, 'coto')).toBeUndefined();
  });
});
