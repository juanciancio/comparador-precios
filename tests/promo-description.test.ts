import { describe, it, expect } from 'vitest';
import { buildPromoDescription } from '../src/pipeline/transform.ts';

describe('buildPromoDescription', () => {
  it('is order-independent (deterministic) across teaser orderings', () => {
    const teasersA = [{ Name: 'Promo B' }, { Name: 'Promo A' }, { Name: 'Promo C' }];
    const teasersB = [{ Name: 'Promo A' }, { Name: 'Promo C' }, { Name: 'Promo B' }];
    expect(buildPromoDescription(teasersA)).toBe(buildPromoDescription(teasersB));
  });

  it('sorts names lexicographically', () => {
    const teasers = [{ Name: 'Zzz' }, { Name: 'Aaa' }, { Name: 'Mmm' }];
    expect(buildPromoDescription(teasers)).toBe('Aaa; Mmm; Zzz');
  });

  it('returns null when there are no teasers', () => {
    expect(buildPromoDescription([])).toBeNull();
  });

  it('drops teasers without a Name and returns null if none remain', () => {
    expect(buildPromoDescription([{ Name: null }, {}])).toBeNull();
  });

  it('keeps only named teasers', () => {
    expect(buildPromoDescription([{ Name: 'Solo' }, { Name: null }])).toBe('Solo');
  });

  it('single teaser has no separator', () => {
    expect(buildPromoDescription([{ Name: 'Descuento 20%' }])).toBe('Descuento 20%');
  });
});
