import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.ts';
import { SearchController } from './search.controller.ts';
import { SearchService } from './search.service.ts';

@Module({
  imports: [ProductsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
