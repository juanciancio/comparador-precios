import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.ts';
import { CategoriesRepository } from './categories.repository.ts';
import { CategoriesService } from './categories.service.ts';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
