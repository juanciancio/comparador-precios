import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { groupKeyFor } from '../../../lib/brand/groups.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import { BrandCatalogService } from '../../common/brand/brand-catalog.service.ts';
import type { Brand } from './dto/brands.dto.ts';
import { ACTIVE_REGION } from '../../config/region.ts';
import { hasActiveOffer } from '../../common/database/active-offer.ts';

export interface BrandFilters {
  limit: number;
  minProducts: number;
}

@Injectable()
export class BrandsRepository {
  constructor(
    @InjectPg() private readonly sql: Db,
    private readonly brandCatalog: BrandCatalogService,
  ) {}

  async list(f: BrandFilters): Promise<Brand[]> {
    // matched_eans: EANs con precio vigente y disponible en AMBAS cadenas (mismo
    // criterio que /compare). Se computa una vez (self-join sobre idx_ph_current)
    // y se LEFT JOIN-ea a products — mucho más barato que un doble EXISTS por
    // producto. Genérico se excluye del matched_count por definición.
    //
    // Se traen TODAS las marcas crudas (sin HAVING ni LIMIT): la fusión por marca
    // canónica y el umbral min_products se aplican en TS sobre el count agrupado,
    // no sobre las formas crudas sueltas.
    const rows = await this.sql<
      { name: string; product_count: number; matched_count: number }[]
    >`
      WITH matched_eans AS (
        SELECT m.ean
        FROM price_history m
        JOIN price_history c
          ON c.ean = m.ean
          AND c.retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
          AND c.region_id = ${ACTIVE_REGION}
          AND c.valid_to IS NULL AND c.is_available
        WHERE m.retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
          AND m.region_id = ${ACTIVE_REGION}
          AND m.valid_to IS NULL AND m.is_available
      )
      SELECT
        p.brand AS name,
        COUNT(*)::int AS product_count,
        COUNT(*) FILTER (
          WHERE me.ean IS NOT NULL
            AND p.brand NOT IN ('Genérico', 'Generico')
        )::int AS matched_count
      FROM products p
      LEFT JOIN matched_eans me ON me.ean = p.ean
      WHERE p.brand IS NOT NULL AND ${hasActiveOffer(this.sql)}
      GROUP BY p.brand
    `;

    const { displayByKey } = await this.brandCatalog.maps();

    // Fusión por clave canónica: product_count y matched_count se suman entre las
    // formas del grupo. El display sale del mapa global (consistente con /products).
    const groups = new Map<string, Brand>();
    for (const r of rows) {
      const key = groupKeyFor(r.name);
      const g = groups.get(key) ?? {
        name: displayByKey.get(key) ?? r.name,
        product_count: 0,
        matched_count: 0,
      };
      g.product_count += r.product_count;
      g.matched_count += r.matched_count;
      groups.set(key, g);
    }

    return [...groups.values()]
      .filter((g) => g.product_count >= f.minProducts)
      .sort((a, b) =>
        a.product_count !== b.product_count
          ? b.product_count - a.product_count
          : a.name.localeCompare(b.name, 'es'),
      )
      .slice(0, f.limit);
  }
}
