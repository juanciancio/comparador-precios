import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller.ts';
import { BrandsRepository } from './brands.repository.ts';
import { BrandsService } from './brands.service.ts';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository],
})
export class BrandsModule {}
