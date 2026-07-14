import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.ts';
import { ProductsRepository } from './products.repository.ts';
import { ProductsService } from './products.service.ts';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
