import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';
import type { Category } from './dto/categories.dto.ts';

@Injectable()
export class CategoriesRepository {
  constructor(@InjectPg() private readonly sql: Db) {}

  async list(): Promise<Category[]> {
    const rows = await this.sql<{ path: string; product_count: number }[]>`
      SELECT category_path AS path, COUNT(*)::int AS product_count
      FROM products
      WHERE category_path IS NOT NULL
      GROUP BY category_path
      ORDER BY product_count DESC, category_path ASC
    `;
    return rows;
  }
}
