import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** 'true'/'false' string de query -> boolean. z.coerce.boolean trata '' como false y todo lo demás true, inservible acá. */
const booleanQuery = z.preprocess(
  (v) => (v === 'true' ? true : v === 'false' ? false : v),
  z.boolean(),
);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'formato de fecha inválido, se espera YYYY-MM-DD');

// ─── Query params ────────────────────────────────────────────────────────────

export const ListProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  brand: z.string().min(1).optional(),
  // Substring case-insensitive contra category_path (p. ej. "Bebidas").
  category: z.string().min(1).optional(),
  // true -> solo productos con precio vigente y disponible en >=2 cadenas.
  only_matched: booleanQuery.optional().default(false),
  sort_by: z.enum(['name', 'brand', 'first_seen', 'last_seen']).default('name'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});
export class ListProductsQueryDto extends createZodDto(ListProductsQuerySchema) {}

export const PriceHistoryQuerySchema = z.object({
  // Slug de retailer; se valida contra los seedeados en el service (400 si no existe).
  retailer: z.string().min(1).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export class PriceHistoryQueryDto extends createZodDto(PriceHistoryQuerySchema) {}

// ─── Response shapes ─────────────────────────────────────────────────────────

export const RetailerOfferSchema = z.object({
  retailer: z.string(),
  retailerName: z.string(),
  price: z.number(),
  listPrice: z.number().nullable(),
  hasPromo: z.boolean(),
  promoDescription: z.string().nullable(),
  isAvailable: z.boolean(),
  validFrom: z.string(),
  productUrl: z.string().nullable(),
  lastSeenAt: z.string(),
});

export const ProductSchema = z.object({
  ean: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  categoryPath: z.string().nullable(),
  imageUrl: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  matched: z.boolean(),
  retailers: z.array(RetailerOfferSchema),
});
export class ProductDto extends createZodDto(ProductSchema) {}

export const ListProductsResponseSchema = z.object({
  data: z.array(ProductSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});
export class ListProductsResponseDto extends createZodDto(ListProductsResponseSchema) {}

export const PriceHistoryEntrySchema = z.object({
  retailer: z.string(),
  retailerName: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  price: z.number(),
  listPrice: z.number().nullable(),
  hasPromo: z.boolean(),
  promoDescription: z.string().nullable(),
  isAvailable: z.boolean(),
});

export const PriceHistoryResponseSchema = z.object({
  ean: z.string(),
  history: z.array(PriceHistoryEntrySchema),
});
export class PriceHistoryResponseDto extends createZodDto(PriceHistoryResponseSchema) {}

export const RefreshResponseSchema = z.object({
  product: ProductSchema,
  // snake_case fijado por contrato (ver docs/NEXT_SESSION.md).
  was_refreshed: z.boolean(),
  updated_at: z.string(),
});
export class RefreshResponseDto extends createZodDto(RefreshResponseSchema) {}

export type RetailerOffer = z.infer<typeof RetailerOfferSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type PriceHistoryEntry = z.infer<typeof PriceHistoryEntrySchema>;
