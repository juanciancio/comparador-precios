import { Injectable } from '@nestjs/common';
import { ProductsRepository, type ListFilters } from '../products/products.repository.ts';
import type { ListProductsResult } from '../products/products.service.ts';
import type { SearchQueryDto } from './dto/search.dto.ts';

@Injectable()
export class SearchService {
  constructor(private readonly repo: ProductsRepository) {}

  async search(query: SearchQueryDto): Promise<ListProductsResult & { query: string }> {
    const terms = query.q.split(/\s+/).filter((t) => t.length > 0);
    const filters: ListFilters = {
      limit: query.limit,
      offset: query.offset,
      brand: query.brand,
      categoryTop: query.category_top,
      category: query.category,
      onlyMatched: query.only_matched,
      // Sin FTS no hay ranking real, así que no hay orden por relevancia: el
      // default sigue siendo nombre asc (lo fija el DTO).
      sortBy: query.sort_by,
      sortDir: query.sort_dir,
      terms,
    };
    const { data, total } = await this.repo.listProducts(filters);
    return {
      query: query.q,
      data,
      pagination: { limit: query.limit, offset: query.offset, total },
    };
  }
}
