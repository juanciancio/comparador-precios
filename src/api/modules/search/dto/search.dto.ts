import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { brandQuery, ProductSchema } from '../../products/dto/products.dto.ts';

const booleanQuery = z.preprocess(
  (v) => (v === 'true' ? true : v === 'false' ? false : v),
  z.boolean(),
);

export const SearchQuerySchema = z.object({
  // Texto libre; se parte en términos (whitespace) y cada uno debe matchear.
  // Mínimo 2 caracteres (spec Fase 3.A): 1 char es demasiado ruidoso.
  q: z
    .string()
    .trim()
    .min(2, 'q requiere al menos 2 caracteres')
    .describe("Texto de búsqueda (≥2 chars). Multi-término: cada palabra debe matchear. Ej: 'coca 2 litros'"),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Tamaño de página (1–100).'),
  offset: z.coerce.number().int().min(0).default(0).describe('Desplazamiento para paginar.'),
  brand: brandQuery,
  category: z.string().min(1).optional().describe("Substring case-insensitive de categoría. Ej: 'Bebidas'"),
  only_matched: booleanQuery
    .optional()
    .default(false)
    .describe('Si true, solo productos comparables en ≥2 cadenas.'),
  // Mismos valores que /products: /search reusa su repositorio (listProducts),
  // así que el orden se resuelve con el mismo ORDER BY. No hay 'relevance':
  // sin FTS no existe ranking que ordenar.
  sort_by: z
    .enum(['name', 'brand', 'first_seen', 'last_seen'])
    .default('name')
    .describe('Campo de ordenamiento.'),
  sort_dir: z.enum(['asc', 'desc']).default('asc').describe('Dirección del ordenamiento.'),
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
