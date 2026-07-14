import { Injectable } from '@nestjs/common';
import { BrandsRepository } from './brands.repository.ts';
import type { Brand } from './dto/brands.dto.ts';
import type { BrandsQueryDto } from './dto/brands.dto.ts';

@Injectable()
export class BrandsService {
  constructor(private readonly repo: BrandsRepository) {}

  list(query: BrandsQueryDto): Promise<Brand[]> {
    return this.repo.list({ limit: query.limit, minProducts: query.min_products });
  }
}
