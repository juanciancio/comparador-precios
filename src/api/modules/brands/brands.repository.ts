import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import type { Brand } from './dto/brands.dto.ts';

export interface BrandFilters {
  limit: number;
  minProducts: number;
}

@Injectable()
export class BrandsRepository {
  constructor(@InjectPg() private readonly sql: Db) {}

  async list(f: BrandFilters): Promise<Brand[]> {
    // matched_eans: EANs con precio vigente y disponible en AMBAS cadenas (mismo
    // criterio que /compare). Se computa una vez (self-join sobre idx_ph_current)
    // y se LEFT JOIN-ea a products — mucho más barato que un doble EXISTS por
    // producto. Genérico se excluye del matched_count por definición.
    const rows = await this.sql<
      { name: string; product_count: number; matched_count: number }[]
    >`
      WITH matched_eans AS (
        SELECT m.ean
        FROM price_history m
        JOIN price_history c
          ON c.ean = m.ean
          AND c.retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour')
          AND c.valid_to IS NULL AND c.is_available
        WHERE m.retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline')
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
      WHERE p.brand IS NOT NULL
      GROUP BY p.brand
      HAVING COUNT(*) >= ${f.minProducts}
      ORDER BY product_count DESC, p.brand ASC
      LIMIT ${f.limit}
    `;
    return rows;
  }
}
