import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BrandsQueryDto, BrandsResponseDto } from './dto/brands.dto.ts';
import { BrandsService } from './brands.service.ts';

const CACHE_TTL_MS = 5 * 60 * 1000;

@ApiTags('brands')
@Controller('brands')
@UseInterceptors(CacheInterceptor)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @CacheTTL(CACHE_TTL_MS)
  @ApiOperation({
    summary: 'Marcas con conteo de productos y de matches cross-retailer',
    description:
      'Ordenadas por cantidad de productos DESC. `matched_count` = productos ' +
      'con precio vigente y disponible en ambas cadenas (Genérico -> 0). ' +
      'Cacheada en memoria 5 min. La cache-key incluye los query params.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BrandsResponseDto })
  list(@Query() query: BrandsQueryDto): Promise<BrandsResponseDto> {
    return this.brands.list(query);
  }
}
