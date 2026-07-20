import { Injectable } from '@nestjs/common';
import { CompareRepository, type CompareFilters } from './compare.repository.ts';
import type {
  CompareQueryDto,
  CompareRow,
  CompareStatsResponse,
} from './dto/compare.dto.ts';
import { ACTIVE_REGION } from '../../config/region.ts';

export interface CompareResult {
  region: string;
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
      region: ACTIVE_REGION,
      data,
      pagination: { limit: query.limit, offset: query.offset, total },
    };
  }

  async stats(): Promise<CompareStatsResponse> {
    return { region: ACTIVE_REGION, ...(await this.repo.stats()) };
  }
}
