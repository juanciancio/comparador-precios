import { Injectable } from '@nestjs/common';
import { ProductsRepository, type ListFilters } from '../products/products.repository.ts';
import type { ListProductsResult } from '../products/products.service.ts';
import type { BrandFacet, SearchFacetsQueryDto } from './dto/facets.dto.ts';
import type { SearchQueryDto } from './dto/search.dto.ts';
import { ACTIVE_REGION } from '../../config/region.ts';

/**
 * Partir `q` en términos. Único lugar donde se hace: /search y /search/facets
 * tienen que derivar exactamente los mismos términos del mismo texto, o el
 * scope de los facets divergiría del de la grilla.
 */
function toTerms(q: string): string[] {
  return q.split(/\s+/).filter((t) => t.length > 0);
}

@Injectable()
export class SearchService {
  constructor(private readonly repo: ProductsRepository) {}

  async search(query: SearchQueryDto): Promise<ListProductsResult & { query: string }> {
    const terms = toTerms(query.q);
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
      region: ACTIVE_REGION,
      query: query.q,
      data,
      pagination: { limit: query.limit, offset: query.offset, total },
    };
  }

  /**
   * Facets de marca para el sidebar de filtros. El scope replica el de `search()`
   * arriba (mismos términos, mismo category_top, mismo only_matched) menos el
   * filtro de marca — los contadores describen el universo pre-filtro, así no se
   * mueven cuando el usuario tilda una marca.
   */
  async facets(query: SearchFacetsQueryDto): Promise<{ brands: BrandFacet[] }> {
    const brands = await this.repo.brandFacets({
      limit: query.limit,
      brandQuery: query.brand_query,
      categoryTop: query.category_top,
      onlyMatched: query.only_matched,
      terms: query.q ? toTerms(query.q) : undefined,
    });
    return { brands };
  }
}
