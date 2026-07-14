import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BrandsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100).describe('Máximo de marcas a devolver (1–500).'),
  min_products: z.coerce
    .number()
    .int()
    .min(1)
    .default(5)
    .describe('Umbral mínimo de productos por marca. Ej: 100'),
});
export class BrandsQueryDto extends createZodDto(BrandsQuerySchema) {}

export const BrandSchema = z.object({
  name: z.string(),
  product_count: z.number(),
  // Productos con match cross-retailer (vigente y disponible en ambas cadenas).
  // Genérico -> 0 por definición (no comparable cross-retailer).
  matched_count: z.number(),
});
export class BrandDto extends createZodDto(BrandSchema) {}

export const BrandsResponseSchema = z.array(BrandSchema);
export class BrandsResponseDto extends createZodDto(BrandsResponseSchema) {}

export type Brand = z.infer<typeof BrandSchema>;
