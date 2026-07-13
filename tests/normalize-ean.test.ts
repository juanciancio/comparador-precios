import { describe, it, expect } from 'vitest';
import { normalizeEan } from '../src/pipeline/transform.ts';

/** Helper: espera ok y devuelve el valor, o falla el test. */
function expectOk(raw: string): string {
  const r = normalizeEan(raw);
  if (!r.ok) throw new Error(`expected ok for "${raw}", got error ${JSON.stringify(r.error)}`);
  return r.value;
}

describe('normalizeEan', () => {
  it('strips a single leading zero (GTIN-14 padded -> EAN-13)', () => {
    expect(expectOk('07796962999850')).toBe('7796962999850');
  });

  it('leaves a clean EAN-13 untouched', () => {
    expect(expectOk('7796962999850')).toBe('7796962999850');
  });

  it('strips multiple leading zeros down to the canonical form', () => {
    expect(expectOk('00012345670')).toBe('12345670');
  });

  it('strips the two-zero pad of a UPC-A promoted to GTIN-14', () => {
    // UPC-A (12) -> GTIN-14 se pad-ea con "00"; canónico = los 12 dígitos.
    expect(expectOk('00123456789012')).toBe('123456789012');
  });

  it('preserves a genuine 14-significant-digit GTIN-14', () => {
    expect(expectOk('17796962999850')).toBe('17796962999850');
  });

  it('preserves an EAN-8', () => {
    expect(expectOk('96385074')).toBe('96385074');
  });

  it('trims surrounding whitespace before normalizing', () => {
    expect(expectOk('  07796962999850  ')).toBe('7796962999850');
  });

  it('rejects non-digit input', () => {
    const r = normalizeEan('abc123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('non_digit');
  });

  it('rejects empty string', () => {
    const r = normalizeEan('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('empty');
  });

  it('rejects whitespace-only string as empty', () => {
    const r = normalizeEan('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('empty');
  });

  it('rejects a value that is too short after stripping zeros', () => {
    // '0000001' -> '1' (1 dígito), fuera de [8, 14].
    const r = normalizeEan('0000001');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('out_of_range');
      if (r.error.kind === 'out_of_range') expect(r.error.normalized).toBe('1');
    }
  });

  it('rejects a value that is too long (>14 digits)', () => {
    const r = normalizeEan('123456789012345');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('out_of_range');
  });
});
