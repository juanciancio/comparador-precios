import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller.ts';
import { CompareRepository } from './compare.repository.ts';
import { CompareService } from './compare.service.ts';

@Module({
  controllers: [CompareController],
  providers: [CompareService, CompareRepository],
})
export class CompareModule {}
