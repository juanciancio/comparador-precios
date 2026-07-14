import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequest, ApiServerError } from '../../common/openapi/error-responses.ts';
import { BrandsQueryDto, BrandsResponseDto } from './dto/brands.dto.ts';
import { BrandsService } from './brands.service.ts';

const CACHE_TTL_MS = 5 * 60 * 1000;

@ApiTags('Brands')
@Controller('brands')
@UseInterceptors(CacheInterceptor)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @CacheTTL(CACHE_TTL_MS)
  @ApiOperation({
    summary: 'Marcas con conteo de productos y de matches cross-retailer',
    description:
      'Marcas ordenadas por cantidad de productos DESC. `matched_count` = productos ' +
      'de esa marca con precio vigente y disponible en AMBAS cadenas. La marca ' +
      '"Genérico" siempre reporta `matched_count: 0` (catchall no comparable, ver ' +
      'GET /compare). Filtrable por `min_products` y `limit`. Cacheado en memoria ' +
      '5 min; la cache-key incluye los query params (header `x-cache`).',
  })
  @ApiOkResponse({
    type: BrandsResponseDto,
    description: 'Marcas ordenadas por product_count DESC.',
    example: [
      { name: 'La Serenísima', product_count: 143, matched_count: 75 },
      { name: 'Genérico', product_count: 2153, matched_count: 0 },
    ],
  })
  @ApiBadRequest()
  @ApiServerError()
  list(@Query() query: BrandsQueryDto): Promise<BrandsResponseDto> {
    return this.brands.list(query);
  }
}
