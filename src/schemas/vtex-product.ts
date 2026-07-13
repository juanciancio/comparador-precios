import { z } from 'zod';

/**
 * Forma de la respuesta de VTEX products/search (lo relevante según CLAUDE.md).
 * Campos que dependemos: required. El resto: tolerante (optional/nullable) para
 * no romper el pipeline por variaciones de VTEX. Un producto que falla el parse
 * se skipea con warning en `extract`, no cae el pipeline.
 */

export const vtexTeaserSchema = z.object({
  Name: z.string().optional(),
});

export const vtexCommercialOfferSchema = z.object({
  Price: z.number(),
  ListPrice: z.number().nullable().optional(),
  PriceWithoutDiscount: z.number().nullable().optional(),
  AvailableQuantity: z.number(),
  IsAvailable: z.boolean(),
  Teasers: z.array(vtexTeaserSchema).default([]),
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
