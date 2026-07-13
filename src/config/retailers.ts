/**
 * Config por retailer. La única constante hardcodeable es el hostname
 * (los category IDs se obtienen del árbol /category/tree/, nunca se hardcodean).
 */
export interface RetailerConfig {
  slug: string;
  host: string;
  baseUrl: string;
  treeDepth: number;
  /**
   * Departamentos top-level a saltear (basura/placeholders). Por retailer:
   * cada cadena tiene los suyos con otros nombres.
   */
  skipDepartmentPatterns: readonly RegExp[];
}

export const retailers = {
  masonline: {
    slug: 'masonline',
    host: 'www.masonline.com.ar',
    baseUrl: 'https://www.masonline.com.ar',
    treeDepth: 5,
    skipDepartmentPatterns: [/\(old\)/i, /^categoria mercadolibre$/i, /mercadolibre/i],
  },
  carrefour: {
    slug: 'carrefour',
    host: 'www.carrefour.com.ar',
    baseUrl: 'https://www.carrefour.com.ar',
    treeDepth: 5,
    // "Test Category" es un depto placeholder (devuelve 1 producto trucho).
    // "Gift Cards" son productos financieros, no bienes físicos comparables por
    // precio → fuera del comparador. Ambos verificados en el smoke de 2.0.
    skipDepartmentPatterns: [/\(old\)/i, /^Test Category$/i, /Gift Cards?/i],
  },
} as const satisfies Record<string, RetailerConfig>;

export type RetailerSlug = keyof typeof retailers;
