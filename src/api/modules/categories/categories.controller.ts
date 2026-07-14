import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiServerError } from '../../common/openapi/error-responses.ts';
import { CategoriesResponseDto } from './dto/categories.dto.ts';
import { CategoriesService } from './categories.service.ts';

const CACHE_TTL_MS = 5 * 60 * 1000;

@ApiTags('Categories')
@Controller('categories')
@UseInterceptors(CacheInterceptor)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @CacheTTL(CACHE_TTL_MS)
  @ApiOperation({
    summary: 'Categorías con su conteo de productos',
    description:
      'Todos los `category_path` del catálogo con su cantidad de productos, ' +
      'ordenados DESC. Útil para poblar navegación/filtros en el frontend. ' +
      'Cacheado en memoria 5 min (el catálogo cambia una vez al día, post-scrape); ' +
      'la respuesta trae el header `x-cache: HIT|MISS`.',
  })
  @ApiOkResponse({
    type: CategoriesResponseDto,
    description: 'Categorías ordenadas por product_count DESC.',
    example: [
      { path: '/Hogar/Ferretería y construcción/Herramientas y escaleras/', product_count: 756 },
      { path: '/Bebidas/Vinos/Vinos tintos/', product_count: 523 },
    ],
  })
  @ApiServerError()
  list(): Promise<CategoriesResponseDto> {
    return this.categories.list();
  }
}
