import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository.ts';
import type { Category } from './dto/categories.dto.ts';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  list(): Promise<Category[]> {
    return this.repo.list();
  }
}
