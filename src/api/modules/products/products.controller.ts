import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiBadRequest, ApiNotFound, ApiServerError } from '../../common/openapi/error-responses.ts';
import {
  ListProductsQueryDto,
  ListProductsResponseDto,
  PriceHistoryQueryDto,
  PriceHistoryResponseDto,
  ProductDto,
  RefreshResponseDto,
} from './dto/products.dto.ts';
import { ProductsService } from './products.service.ts';

const EAN_EXAMPLE = '7790894902018';

const PRODUCT_EXAMPLE = {
  ean: EAN_EXAMPLE,
  name: 'Celular Motorola Moto G67 256gb Arctic Seal',
  brand: 'Motorola',
  categoryPath: '/Electro y tecnología/Celulares/Celulares libres/',
  imageUrl: 'https://carrefourar.vteximg.com.br/arquivos/ids/896316/image.jpg',
  firstSeenAt: '2026-07-13T19:25:58.437Z',
  lastSeenAt: '2026-07-14T10:04:00.755Z',
  matched: true,
  retailers: [
    {
      retailer: 'carrefour',
      retailerName: 'Carrefour Argentina',
      price: 916799,
      listPrice: 916799,
      hasPromo: false,
      promoDescription: null,
      isAvailable: true,
      validFrom: '2026-07-13',
      productUrl: 'https://www.carrefour.com.ar/celular-motorola-moto-g67/p',
      lastSeenAt: '2026-07-14T10:04:00.755923+00:00',
    },
    {
      retailer: 'masonline',
      retailerName: 'Masonline',
      price: 599999,
      listPrice: 599999,
      hasPromo: false,
      promoDescription: null,
      isAvailable: true,
      validFrom: '2026-07-14',
      productUrl: 'https://www.masonline.com.ar/celular-motorola-moto-g67/p',
      lastSeenAt: '2026-07-14T09:19:32.100440+00:00',
    },
  ],
};

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listado paginado de productos del catálogo unificado',
    description:
      'Lista paginada de productos del catálogo unificado (Masonline + Carrefour), ' +
      'con la llave universal EAN. Cada producto incluye sus precios vigentes por ' +
      'cadena (array `retailers`) y `matched` (true si es comparable en ≥2 cadenas). ' +
      'Filtros por marca (exacta), categoría (substring) y solo-matcheados; ' +
      'ordenable por nombre, marca o fechas de avistaje.',
  })
  @ApiOkResponse({ type: ListProductsResponseDto, description: 'Página de productos + metadata de paginación.' })
  @ApiBadRequest()
  @ApiServerError()
  list(@Query() query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
    return this.products.list(query);
  }

  @Get(':ean')
  @ApiOperation({
    summary: 'Detalle de un producto por EAN',
    description:
      'Devuelve un producto y sus ofertas vigentes en cada cadena. El EAN se ' +
      'normaliza a forma canónica (se strippean los ceros a la izquierda), así ' +
      '`07790894902018` y `7790894902018` resuelven al mismo producto.',
  })
  @ApiParam({ name: 'ean', description: 'EAN del producto (se normaliza).', example: EAN_EXAMPLE })
  @ApiOkResponse({ type: ProductDto, description: 'Producto con sus ofertas vigentes.', example: PRODUCT_EXAMPLE })
  @ApiBadRequest()
  @ApiNotFound('No existe producto con ese EAN.')
  @ApiServerError()
  getOne(@Param('ean') ean: string): Promise<ProductDto> {
    return this.products.getOne(ean);
  }

  @Get(':ean/price-history')
  @ApiOperation({
    summary: 'Histórico de precios (vigencias) de un producto',
    description:
      'Serie de vigencias por cadena bajo el modelo SCD-2: una fila por cambio de ' +
      'precio/estado. La fila con `validTo: null` es el precio actual. Filtrable por ' +
      'retailer y por rango de fechas sobre `validFrom`.',
  })
  @ApiParam({ name: 'ean', description: 'EAN del producto.', example: EAN_EXAMPLE })
  @ApiOkResponse({ type: PriceHistoryResponseDto, description: 'Vigencias del producto, más recientes primero.' })
  @ApiBadRequest()
  @ApiNotFound('No existe producto con ese EAN.')
  @ApiServerError()
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
      'Fuerza refresh en vivo del producto contra los retailers de origen. Cache ' +
      'comunitario de 60 segundos: si el producto se refrescó recientemente por ' +
      'cualquier cliente, esta llamada devuelve el resultado cacheado ' +
      '(`was_refreshed: false`) sin generar carga sobre los retailers. Si expiró, ' +
      'hace fetch en vivo, reingesta por el pipeline (idempotente) y responde ' +
      '`was_refreshed: true`. Reusa la infraestructura del scraper.',
  })
  @ApiParam({ name: 'ean', description: 'EAN del producto a refrescar.', example: EAN_EXAMPLE })
  @ApiOkResponse({ type: RefreshResponseDto, description: 'Producto actualizado + was_refreshed + updated_at.' })
  @ApiBadRequest()
  @ApiNotFound('No existe producto con ese EAN (no dispara el pipeline).')
  @ApiServerError()
  refresh(@Param('ean') ean: string): Promise<RefreshResponseDto> {
    return this.products.refresh(ean);
  }
}
