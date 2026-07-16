import { z } from 'zod';

/**
 * Forma de la respuesta de VTEX products/search (lo relevante según CLAUDE.md).
 * Campos que dependemos: required. El resto: tolerante (optional/nullable) para
 * no romper el pipeline por variaciones de VTEX. Un producto que falla el parse
 * se skipea con warning en `extract`, no cae el pipeline.
 */

/**
 * Entry de VTEX con nombre (teaser, promotion teaser, discount highlight).
 *
 * VTEX serializa parte del `commertialOffer` con los backing fields de C#
 * (`<Name>k__BackingField`) en vez de `Name`. Verificado en Carrefour: `Teasers`
 * y `DiscountHighLight` vienen SIEMPRE con backing fields; `PromotionTeasers`
 * viene con claves limpias. No hay contrato que garantice cuál usa cada campo,
 * así que se aceptan ambas formas en todos: si VTEX cambia de vuelta, el parseo
 * sigue funcionando en lugar de devolver null en silencio (que es exactamente
 * cómo este bug vivió 47.358 filas sin que nadie lo notara).
 *
 * El nombre se resuelve con `vtexEntryName` en transform.ts.
 */
export const vtexNamedEntrySchema = z.object({
  Name: z.string().nullable().optional(),
  '<Name>k__BackingField': z.string().nullable().optional(),
});

export const vtexCommercialOfferSchema = z.object({
  Price: z.number(),
  ListPrice: z.number().nullable().optional(),
  PriceWithoutDiscount: z.number().nullable().optional(),
  AvailableQuantity: z.number(),
  IsAvailable: z.boolean(),
  // Mismo contenido, distinta serialización: Teasers usa backing fields,
  // PromotionTeasers claves limpias. Se leen las dos y se unen (ver extract).
  Teasers: z.array(vtexNamedEntrySchema).default([]),
  PromotionTeasers: z.array(vtexNamedEntrySchema).nullable().default([]),
  // Nombra el descuento YA aplicado a Price (a diferencia de los teasers, que
  // ofrecen descuentos de checkout NO aplicados). Ver migración 007.
  DiscountHighLight: z.array(vtexNamedEntrySchema).nullable().default([]),
});

export const vtexSellerSchema = z.object({
  sellerId: z.string(),
  sellerDefault: z.boolean(),
  commertialOffer: vtexCommercialOfferSchema,
});

export const vtexImageSchema = z.object({
  imageUrl: z.string(),
  imageText: z.string().nullable().optional(),
});

export const vtexItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  ean: z.string().nullable().optional(),
  measurementUnit: z.string().nullable().optional(),
  unitMultiplier: z.number().nullable().optional(),
  images: z.array(vtexImageSchema).default([]),
  sellers: z.array(vtexSellerSchema).default([]),
});

export const vtexProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  brand: z.string().nullable().optional(),
  brandId: z.number().nullable().optional(),
  linkText: z.string(),
  categories: z.array(z.string()).default([]),
  categoryId: z.string().nullable().optional(),
  items: z.array(vtexItemSchema).default([]),
});

export type VtexProduct = z.infer<typeof vtexProductSchema>;
export type VtexItem = z.infer<typeof vtexItemSchema>;
export type VtexSeller = z.infer<typeof vtexSellerSchema>;
export type VtexCommercialOffer = z.infer<typeof vtexCommercialOfferSchema>;
export type VtexNamedEntry = z.infer<typeof vtexNamedEntrySchema>;
