import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import type { Category } from './dto/categories.dto.ts';
import { hasActiveOffer } from '../../common/database/active-offer.ts';

@Injectable()
export class CategoriesRepository {
  constructor(@InjectPg() private readonly sql: Db) {}

  async list(): Promise<Category[]> {
    const rows = await this.sql<{ path: string; product_count: number }[]>`
      SELECT p.category_path AS path, COUNT(*)::int AS product_count
      FROM products p
      WHERE p.category_path IS NOT NULL AND ${hasActiveOffer(this.sql)}
      GROUP BY p.category_path
      ORDER BY product_count DESC, p.category_path ASC
    `;
    return rows;
  }
}
