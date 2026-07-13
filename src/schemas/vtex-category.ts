import { z } from 'zod';

/**
 * Nodo del árbol de categorías VTEX (/api/catalog_system/pub/category/tree/{depth}).
 * Estructura recursiva: cada nodo tiene children[]. Los campos extra que manda
 * VTEX (Title, MetaTagDescription, etc.) se descartan (z.object hace strip).
 */
export interface VtexCategory {
  id: number;
  name: string;
  url: string;
  children: VtexCategory[];
}

export const vtexCategorySchema: z.ZodType<VtexCategory> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    url: z.string(),
    children: z.array(vtexCategorySchema),
  }),
);

export const vtexCategoryTreeSchema = z.array(vtexCategorySchema);
