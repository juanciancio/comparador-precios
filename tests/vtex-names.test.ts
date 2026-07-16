import { describe, it, expect } from 'vitest';
import { vtexEntryName, joinVtexNames, computeHasPromo } from '../src/pipeline/transform.ts';
import { vtexCommercialOfferSchema } from '../src/schemas/vtex-product.ts';

/**
 * Fixtures REALES del dump de research/precios-descuento (EAN testigo 7896009419294,
 * Carrefour). Copiados textualmente: son la forma exacta que devuelve VTEX hoy y la
 * razón por la que promo_description quedó NULL en 47.358 filas.
 */
const REAL_TEASER_BACKING = {
  '<Name>k__BackingField': 'Tarjeta Carrefour 15%',
  '<GeneralValues>k__BackingField': {},
  '<Conditions>k__BackingField': {
    '<MinimumQuantity>k__BackingField': 0,
    '<Parameters>k__BackingField': [
      { '<Name>k__BackingField': 'RestrictionsBins', '<Value>k__BackingField': '507858,858110' },
    ],
  },
  '<Effects>k__BackingField': {
    '<Parameters>k__BackingField': [
      { '<Name>k__BackingField': 'PercentualDiscount', '<Value>k__BackingField': '15' },
    ],
  },
};

const REAL_PROMOTION_TEASER_CLEAN = {
  Name: 'Tarjeta Carrefour 15%',
  GeneralValues: {},
  Conditions: {
    MinimumQuantity: 0,
    Parameters: [{ Name: 'RestrictionsBins', Value: '507858,858110' }],
  },
  Effects: { Parameters: [{ Name: 'PercentualDiscount', Value: '15' }] },
};

const REAL_DISCOUNT_HIGHLIGHT = {
  '<Name>k__BackingField': 'PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7',
};

describe('vtexEntryName', () => {
  it('reads the C# backing field name (the format Carrefour actually sends)', () => {
    expect(vtexEntryName(REAL_TEASER_BACKING)).toBe('Tarjeta Carrefour 15%');
  });

  it('reads the clean Name (the format PromotionTeasers sends)', () => {
    expect(vtexEntryName(REAL_PROMOTION_TEASER_CLEAN)).toBe('Tarjeta Carrefour 15%');
  });

  it('prefers the documented Name over the backing field when both are present', () => {
    expect(vtexEntryName({ Name: 'clean', '<Name>k__BackingField': 'backing' })).toBe('clean');
  });

  it('falls back to the backing field when Name is present but empty', () => {
    expect(vtexEntryName({ Name: '  ', '<Name>k__BackingField': 'backing' })).toBe('backing');
  });

  it('returns null when neither key carries a name', () => {
    expect(vtexEntryName({})).toBeNull();
    expect(vtexEntryName({ Name: null })).toBeNull();
    expect(vtexEntryName({ Name: '   ' })).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(vtexEntryName({ Name: '  Promo  ' })).toBe('Promo');
  });
});

describe('joinVtexNames', () => {
  it('extracts the real discount highlight from its backing field', () => {
    expect(joinVtexNames([REAL_DISCOUNT_HIGHLIGHT])).toBe(
      'PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7',
    );
  });

  it('dedupes across sources: Teasers and PromotionTeasers are the same promo twice', () => {
    expect(joinVtexNames([REAL_TEASER_BACKING], [REAL_PROMOTION_TEASER_CLEAN])).toBe(
      'Tarjeta Carrefour 15%',
    );
  });

  it('is order-independent (deterministic) across teaser orderings', () => {
    const a = [{ Name: 'Promo B' }, { Name: 'Promo A' }, { Name: 'Promo C' }];
    const b = [{ Name: 'Promo A' }, { Name: 'Promo C' }, { Name: 'Promo B' }];
    expect(joinVtexNames(a)).toBe(joinVtexNames(b));
  });

  it('sorts names lexicographically', () => {
    expect(joinVtexNames([{ Name: 'Zzz' }, { Name: 'Aaa' }, { Name: 'Mmm' }])).toBe('Aaa; Mmm; Zzz');
  });

  it('mixes both formats across sources and still sorts as one set', () => {
    expect(joinVtexNames([{ '<Name>k__BackingField': 'Zzz' }], [{ Name: 'Aaa' }])).toBe('Aaa; Zzz');
  });

  it('returns null with no sources, empty sources, or nullish sources', () => {
    expect(joinVtexNames()).toBeNull();
    expect(joinVtexNames([])).toBeNull();
    expect(joinVtexNames(null, undefined)).toBeNull();
  });

  it('drops unnamed entries and returns null if none remain', () => {
    expect(joinVtexNames([{ Name: null }, {}])).toBeNull();
  });

  it('keeps only named entries', () => {
    expect(joinVtexNames([{ Name: 'Solo' }, { Name: null }])).toBe('Solo');
  });

  it('single name has no separator', () => {
    expect(joinVtexNames([{ Name: 'Descuento 20%' }])).toBe('Descuento 20%');
  });
});

describe('vtexCommercialOfferSchema', () => {
  /** El payload que producción realmente recibe, recortado a lo que parseamos. */
  const realOffer = {
    Price: 4725,
    ListPrice: 6300,
    PriceWithoutDiscount: 6300,
    AvailableQuantity: 100,
    IsAvailable: true,
    Teasers: [REAL_TEASER_BACKING],
    PromotionTeasers: [REAL_PROMOTION_TEASER_CLEAN],
    DiscountHighLight: [REAL_DISCOUNT_HIGHLIGHT],
  };

  it('parses the real Carrefour offer and keeps all three name sources', () => {
    const parsed = vtexCommercialOfferSchema.safeParse(realOffer);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(joinVtexNames(parsed.data.Teasers, parsed.data.PromotionTeasers)).toBe(
      'Tarjeta Carrefour 15%',
    );
    expect(joinVtexNames(parsed.data.DiscountHighLight)).toBe(
      'PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7',
    );
  });

  it('defaults the new arrays when absent (Masonline sends none of them)', () => {
    const parsed = vtexCommercialOfferSchema.safeParse({
      Price: 6309,
      ListPrice: 6309,
      AvailableQuantity: 10,
      IsAvailable: true,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.Teasers).toEqual([]);
    expect(parsed.data.PromotionTeasers).toEqual([]);
    expect(parsed.data.DiscountHighLight).toEqual([]);
    expect(joinVtexNames(parsed.data.DiscountHighLight)).toBeNull();
  });

  it('tolerates explicit nulls in the promo arrays', () => {
    const parsed = vtexCommercialOfferSchema.safeParse({
      Price: 100,
      ListPrice: 100,
      AvailableQuantity: 1,
      IsAvailable: true,
      PromotionTeasers: null,
      DiscountHighLight: null,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(joinVtexNames(parsed.data.PromotionTeasers, parsed.data.DiscountHighLight)).toBeNull();
  });
});

describe('computeHasPromo', () => {
  it('is true only when the list price is above the effective price', () => {
    expect(computeHasPromo(4725, 6300)).toBe(true);
  });

  it('is false when list equals price (no discount applied)', () => {
    expect(computeHasPromo(6309, 6309)).toBe(false);
  });

  it('is false when there is no list price', () => {
    expect(computeHasPromo(100, null)).toBe(false);
  });

  it('is false when list is below price (never observed, but not a promo)', () => {
    expect(computeHasPromo(100, 90)).toBe(false);
  });

  it('no longer keys off teasers: a teaser without a real discount is not a promo', () => {
    // El caso exacto de las 12.450 filas de Carrefour: "Tarjeta Carrefour 15%"
    // presente, pero el descuento NO está aplicado a Price.
    const parsed = vtexCommercialOfferSchema.parse({
      Price: 879000,
      ListPrice: 879000,
      AvailableQuantity: 5,
      IsAvailable: true,
      Teasers: [REAL_TEASER_BACKING],
    });
    expect(joinVtexNames(parsed.Teasers)).toBe('Tarjeta Carrefour 15%');
    expect(computeHasPromo(parsed.Price, parsed.ListPrice ?? null)).toBe(false);
  });
});
