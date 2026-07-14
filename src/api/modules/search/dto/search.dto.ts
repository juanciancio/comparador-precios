import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProductSchema } from '../../products/dto/products.dto.ts';

const booleanQuery = z.preprocess(
  (v) => (v === 'true' ? true : v === 'false' ? false : v),
  z.boolean(),
);

export const SearchQuerySchema = z.object({
  // Texto libre; se parte en términos (whitespace) y cada uno debe matchear.
  q: z.string().trim().min(1, 'q es requerido'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  brand: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  only_matched: booleanQuery.optional().default(false),
});
export class SearchQueryDto extends createZodDto(SearchQuerySchema) {}

export const SearchResponseSchema = z.object({
  query: z.string(),
  data: z.array(ProductSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});
export class SearchResponseDto extends createZodDto(SearchResponseSchema) {}
