import { describe, it, expect } from 'vitest';
import { normalizeBrand } from '../src/pipeline/transform.ts';

describe('normalizeBrand', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeBrand('Arcor ')).toBe('Arcor');
  });

  it('collapses internal multiple spaces to one', () => {
    expect(normalizeBrand('La  Serenísima')).toBe('La Serenísima');
  });

  it('strips trailing punctuation', () => {
    expect(normalizeBrand('Nivea.')).toBe('Nivea');
  });

  it('does NOT strip accents (Genérico stays Genérico)', () => {
    expect(normalizeBrand('Genérico')).toBe('Genérico');
  });

  it('does NOT normalize accents away (Generico stays Generico)', () => {
    // Prueba explícita de que NO fusionamos con/ sin acento: quedan distintos.
    expect(normalizeBrand('Generico')).toBe('Generico');
    expect(normalizeBrand('Generico')).not.toBe(normalizeBrand('Genérico'));
  });

  it('does NOT lowercase (iPhone stays iPhone)', () => {
    expect(normalizeBrand('iPhone')).toBe('iPhone');
  });

  it('handles combined whitespace + trailing punctuation', () => {
    expect(normalizeBrand('  La  Virginia .  ')).toBe('La Virginia');
  });
});
