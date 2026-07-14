import { Injectable } from '@nestjs/common';
import { CompareRepository, type CompareFilters } from './compare.repository.ts';
import type { CompareQueryDto, CompareRow, CompareStats } from './dto/compare.dto.ts';

export interface CompareResult {
  data: CompareRow[];
  pagination: { limit: number; offset: number; total: number };
}

@Injectable()
export class CompareService {
  constructor(private readonly repo: CompareRepository) {}

  async compare(query: CompareQueryDto): Promise<CompareResult> {
    const filters: CompareFilters = {
      limit: query.limit,
      offset: query.offset,
      brand: query.brand,
      category: query.category,
      minDiffPct: query.min_diff_pct,
      cheaperAt: query.cheaper_at,
      sortBy: query.sort_by,
      sortDir: query.sort_dir,
    };
    const { data, total } = await this.repo.compare(filters);
    return {
      data,
      pagination: { limit: query.limit, offset: query.offset, total },
    };
  }

  stats(): Promise<CompareStats> {
    return this.repo.stats();
  }
}
