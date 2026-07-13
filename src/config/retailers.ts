/**
 * Config por retailer. La única constante hardcodeable es el hostname
 * (los category IDs se obtienen del árbol /category/tree/, nunca se hardcodean).
 */
export interface RetailerConfig {
  slug: string;
  host: string;
  baseUrl: string;
  treeDepth: number;
}

export const retailers = {
  masonline: {
    slug: 'masonline',
    host: 'www.masonline.com.ar',
    baseUrl: 'https://www.masonline.com.ar',
    treeDepth: 5,
  },
  carrefour: {
    slug: 'carrefour',
    host: 'www.carrefour.com.ar',
    baseUrl: 'https://www.carrefour.com.ar',
    treeDepth: 5,
  },
} as const satisfies Record<string, RetailerConfig>;

export type RetailerSlug = keyof typeof retailers;
