import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** 'true'/'false' string de query -> boolean. z.coerce.boolean trata '' como false y todo lo demás true, inservible acá. */
export const booleanQuery = z.preprocess(
  (v) => (v === 'true' ? true : v === 'false' ? false : v),
  z.boolean(),
);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'formato de fecha inválido, se espera YYYY-MM-DD');

/**
 * Marca exacta, repetible: `?brand=Natura` o `?brand=Natura&brand=Cocinero`.
 * Express entrega string cuando el param viene una vez y string[] cuando viene
 * repetido; se normaliza a array siempre para que el repo tenga una sola forma.
 * Compartido por /products y /search, que resuelven el filtro con el mismo
 * ListFilters.
 */
export const brandQuery = z
  .union([z.string().min(1), z.array(z.string().min(1)).nonempty()])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .optional()
  .describe("Marca exacta a filtrar. Repetible. Ej: 'La Serenísima', o brand=Natura&brand=Cocinero");

/**
 * Departamento top-level exacto, repetible. Mismo patrón que `brandQuery`.
 * Matchea contra `split_part(category_path, '/', 2)`, no por substring: hay 13
 * top-levels contenidos dentro de otro (`Limpieza` ⊂ `Accesorios De Limpieza`,
 * `Limpieza Automotor`, …), así que el substring de `category` trae falsos
 * positivos. Ver `docs/analysis/top-levels-2026-07-14.md`.
 */
export const categoryTopQuery = z
  .union([z.string().min(1), z.array(z.string().min(1)).nonempty()])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .optional()
  .describe(
    'Departamento top-level exacto (primer segmento de category_path). Repetible: ' +
      'múltiples valores son OR entre sí. Case-sensitive — es la etiqueta cruda del ' +
      'retailer, ver GET /categories para los valores válidos. ' +
      'Ej: category_top=Limpieza, o category_top=Limpieza&category_top=Accesorios De Limpieza',
  );

export const CATEGORY_DEPRECATION =
  'DEPRECATED: usar category_top que hace match exacto contra el departamento ' +
  'top-level. category hace substring match sobre el path completo, lo cual genera ' +
  'falsos positivos (ver docs/analysis/top-levels-* para contexto).';

// ─── Query params ────────────────────────────────────────────────────────────

export const ListProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Tamaño de página (1–100). Ej: 20'),
  offset: z.coerce.number().int().min(0).default(0).describe('Desplazamiento para paginar. Ej: 40'),
  brand: brandQuery,
  category_top: categoryTopQuery,
  category: z.string().min(1).optional().describe(CATEGORY_DEPRECATION),
  only_matched: booleanQuery
    .optional()
    .default(false)
    .describe('Si true, solo productos con precio vigente y disponible en ≥2 cadenas.'),
  sort_by: z
    .enum(['name', 'brand', 'first_seen', 'last_seen'])
    .default('name')
    .describe('Campo de ordenamiento.'),
  sort_dir: z.enum(['asc', 'desc']).default('asc').describe('Dirección del ordenamiento.'),
});
export class ListProductsQueryDto extends createZodDto(ListProductsQuerySchema) {}

export const RecentChangesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(8).describe('Cantidad de productos (1–30). Ej: 8'),
  hours: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(48)
    .describe('Ventana temporal hacia atrás, en horas (1–168). Ej: 24'),
  min_diff_pct: z.coerce
    .number()
    .min(0)
    .optional()
    .describe(
      'Diferencia cross-retailer mínima (en %, absoluta) para incluir el producto. ' +
        'Al usarlo, los productos presentes en una sola cadena quedan excluidos ' +
        '(no tienen diferencia que medir). Ej: 10',
    ),
});
export class RecentChangesQueryDto extends createZodDto(RecentChangesQuerySchema) {}

export const PriceHistoryQuerySchema = z.object({
  retailer: z
    .string()
    .min(1)
    .optional()
    .describe("Slug de retailer para filtrar. Ej: 'masonline' o 'carrefour'."),
  from: isoDate.optional().describe('Desde (inclusive), sobre valid_from. YYYY-MM-DD. Ej: 2026-07-01'),
  to: isoDate.optional().describe('Hasta (inclusive), sobre valid_from. YYYY-MM-DD. Ej: 2026-07-14'),
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
