import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { booleanQuery, categoryTopQuery } from '../../products/dto/products.dto.ts';

/**
 * Scope idéntico al de /search y /products, menos el filtro de marca: los facets
 * cuentan sobre el universo previo a tildar marcas.
 *
 * A diferencia de /search y /products, NO acepta el `category` deprecado: es un
 * endpoint nuevo y no hay backwards-compat que sostener. `category_top` hace
 * match exacto contra el departamento; `category` hace substring sobre el path
 * completo y contamina (ej: category=Limpieza trae también /Automotor/Limpieza
 * automotor/). Ver docs/analysis/top-levels-2026-07-14.md.
 */
export const SearchFacetsQuerySchema = z.object({
  // Opcional, a diferencia de /search: sin q el endpoint facetea el listado de
  // productos en vez de los resultados de búsqueda. Si viene, mismo mínimo de 2
  // chars que /search — el scope tiene que ser el mismo, validación incluida.
  q: z
    .string()
    .trim()
    .min(2, 'q requiere al menos 2 caracteres')
    .optional()
    .describe(
      'Texto de búsqueda (≥2 chars), mismo comportamiento que GET /search. ' +
        'Ausente: facetea el listado de productos. Ej: leche',
    ),
  category_top: categoryTopQuery,
  only_matched: booleanQuery
    .optional()
    .default(false)
    .describe('Si true, solo productos comparables en ≥2 cadenas. Igual que /products y /search.'),
  brand_query: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Filtra los facets a marcas cuyo nombre contenga este texto. Insensible a ' +
        'mayúsculas Y a acentos/ñ: `serenisima` encuentra "La Serenísima", ' +
        '`tres ninas` encuentra "Las Tres Niñas". Alimenta el input "Buscar marca" ' +
        'del sidebar. Ausente: top por count. Ej: ser',
    ),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Cantidad de marcas a devolver (1–50). Ej: 10'),
});
export class SearchFacetsQueryDto extends createZodDto(SearchFacetsQuerySchema) {}

export const BrandFacetSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export const SearchFacetsResponseSchema = z.object({
  brands: z.array(BrandFacetSchema),
});
export class SearchFacetsResponseDto extends createZodDto(SearchFacetsResponseSchema) {}

export type BrandFacet = z.infer<typeof BrandFacetSchema>;
