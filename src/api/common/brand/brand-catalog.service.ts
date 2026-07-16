import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { buildBrandGroups, groupKeyFor } from '../../../lib/brand/groups.ts';
import { InjectPg } from '../database/database.tokens.ts';

/** Mapas derivados del catálogo completo de marcas, para display canónico. */
export interface BrandGroupMaps {
  /** Forma cruda del catálogo → display canónico. Cubre TODA marca de products. */
  displayByRaw: Map<string, string>;
  /** groupKey (ver groups.ts) → display canónico. Para facets y /brands. */
  displayByKey: Map<string, string>;
  /** groupKey → formas crudas del grupo. Para expandir el filtro `?brand=`. */
  rawFormsByKey: Map<string, string[]>;
}

/** TTL del mapa global de marcas. El set de marcas del catálogo cambia lento. */
const TTL_MS = 5 * 60 * 1000;

/**
 * Fuente única del display canónico de marcas. Construye una vez (y cachea) el
 * mapa `marca cruda → display` sobre TODO el catálogo, para que el campo `brand`
 * de /products y /search, y los `name` de /search/facets y /brands, resuelvan
 * SIEMPRE al mismo string. La consistencia entre esos endpoints es lo que sostiene
 * la invariante "suma de counts del sidebar == total de la grilla".
 *
 * La normalización es capa de presentación: nada de esto se persiste (ver
 * CLAUDE.md / HALLAZGOS.md). El display se computa desde la frecuencia GLOBAL, no
 * la del scope, para que no dependa de qué se esté listando.
 */
@Injectable()
export class BrandCatalogService {
  private cache: { maps: BrandGroupMaps; builtAt: number } | undefined;
  private inflight: Promise<BrandGroupMaps> | undefined;

  constructor(@InjectPg() private readonly sql: Db) {}

  async maps(): Promise<BrandGroupMaps> {
    const now = Date.now();
    if (this.cache && now - this.cache.builtAt < TTL_MS) return this.cache.maps;
    // Coalesce corridas concurrentes: un solo GROUP BY aunque lleguen N requests.
    if (!this.inflight) {
      this.inflight = this.build().finally(() => {
        this.inflight = undefined;
      });
    }
    return this.inflight;
  }

  /** Resolver sincrónico marca cruda → display, para usar dentro de `.map()`. */
  async resolver(): Promise<(raw: string | null) => string | null> {
    const { displayByRaw } = await this.maps();
    return (raw) => (raw === null ? null : (displayByRaw.get(raw) ?? raw));
  }

  /**
   * Expande los valores tildados en el sidebar (displays canónicos) a las formas
   * crudas del catálogo de cada grupo, para el filtro `?brand=`. Usar
   * `p.brand = ANY(<estas formas>)` mantiene el filtro INDEXABLE
   * (idx_products_brand) en vez de aplicar la normalización por fila, que sería
   * un seq scan ~3x más lento. Las exclusiones de merge ya vienen resueltas por
   * `groupKeyFor` (Boss y BOSS son grupos distintos → formas distintas). Un input
   * de marca inexistente no aporta formas (se ignora, no rompe).
   */
  async expandBrandFilter(inputs: string[]): Promise<string[]> {
    const { rawFormsByKey } = await this.maps();
    const out = new Set<string>();
    for (const input of inputs) {
      const forms = rawFormsByKey.get(groupKeyFor(input));
      if (forms) for (const f of forms) out.add(f);
    }
    return [...out];
  }

  private async build(): Promise<BrandGroupMaps> {
    const rows = await this.sql<{ brand: string; count: number }[]>`
      SELECT brand, COUNT(*)::int AS count
      FROM products
      WHERE brand IS NOT NULL
      GROUP BY brand
    `;
    const groups = buildBrandGroups(rows);
    const displayByRaw = new Map<string, string>();
    const displayByKey = new Map<string, string>();
    const rawFormsByKey = new Map<string, string[]>();
    for (const g of groups) {
      displayByKey.set(g.groupKey, g.display);
      rawFormsByKey.set(g.groupKey, g.rawForms);
      for (const raw of g.rawForms) displayByRaw.set(raw, g.display);
    }
    const maps: BrandGroupMaps = { displayByRaw, displayByKey, rawFormsByKey };
    this.cache = { maps, builtAt: Date.now() };
    return maps;
  }
}
