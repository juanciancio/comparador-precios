import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesResponseDto } from './dto/categories.dto.ts';
import { CategoriesService } from './categories.service.ts';

const CACHE_TTL_MS = 5 * 60 * 1000;

@ApiTags('categories')
@Controller('categories')
@UseInterceptors(CacheInterceptor)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @CacheTTL(CACHE_TTL_MS)
  @ApiOperation({
    summary: 'Categorías (category_path) con su conteo de productos',
    description:
      'Lista de paths de categoría ordenada por cantidad de productos DESC. ' +
      'Cacheada en memoria 5 min (cambia una vez al día, post-scrape).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: CategoriesResponseDto })
  list(): Promise<CategoriesResponseDto> {
    return this.categories.list();
  }
}
