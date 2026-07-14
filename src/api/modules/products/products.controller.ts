import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ListProductsQueryDto,
  ListProductsResponseDto,
  PriceHistoryQueryDto,
  PriceHistoryResponseDto,
  ProductDto,
  RefreshResponseDto,
} from './dto/products.dto.ts';
import { ProductsService } from './products.service.ts';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listado paginado de productos con sus precios vigentes por cadena',
    description:
      'Devuelve productos (llave EAN) con sus ofertas vigentes en cada retailer. ' +
      'Filtrable por marca, categoría y `only_matched` (comparables en >=2 cadenas). ' +
      'Ordenable por nombre, marca o fechas de avistaje.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ListProductsResponseDto })
  list(@Query() query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
    return this.products.list(query);
  }

  @Get(':ean')
  @ApiOperation({ summary: 'Detalle de un producto por EAN' })
  @ApiParam({ name: 'ean', description: 'EAN del producto (se normaliza: se strippean ceros a la izquierda)' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe producto con ese EAN.' })
  getOne(@Param('ean') ean: string): Promise<ProductDto> {
    return this.products.getOne(ean);
  }

  @Get(':ean/price-history')
  @ApiOperation({
    summary: 'Histórico de precios (vigencias) de un producto',
    description:
      'Una fila por vigencia (modelo SCD-2). `valid_to = null` es el precio actual. ' +
      'Filtrable por retailer y por rango sobre `valid_from`.',
  })
  @ApiParam({ name: 'ean', description: 'EAN del producto' })
  @ApiResponse({ status: HttpStatus.OK, type: PriceHistoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe producto con ese EAN.' })
  priceHistory(
    @Param('ean') ean: string,
    @Query() query: PriceHistoryQueryDto,
  ): Promise<PriceHistoryResponseDto> {
    return this.products.priceHistory(ean, query);
  }

  @Post(':ean/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh on-demand del precio (TTL comunitario 60s)',
    description:
      'Si la data del producto es más vieja que 60s, hace fetch en vivo contra cada ' +
      'cadena donde existe y reingesta por el pipeline. Si es más fresca, devuelve la ' +
      'data actual sin pegarle a VTEX (cache comunitario). `was_refreshed` indica si ' +
      'hubo fetch real.',
  })
  @ApiParam({ name: 'ean', description: 'EAN del producto' })
  @ApiResponse({ status: HttpStatus.OK, type: RefreshResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No existe producto con ese EAN.' })
  refresh(@Param('ean') ean: string): Promise<RefreshResponseDto> {
    return this.products.refresh(ean);
  }
}
