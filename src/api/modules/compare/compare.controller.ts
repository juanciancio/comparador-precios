import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequest, ApiServerError } from '../../common/openapi/error-responses.ts';
import {
  CompareQueryDto,
  CompareResponseDto,
  CompareStatsDto,
} from './dto/compare.dto.ts';
import { CompareService } from './compare.service.ts';

// Valores reales del EAN testigo de research/precios-descuento (15/07/2026).
// Ilustra el caso que motiva exponer *_list_price: Carrefour aparece 25% más
// barato, pero ese precio efectivo viene de un descuento de fidelidad "Mi Crf"
// que VTEX ya aplicó. Contra precios de lista, las dos cadenas casi empatan.
const COMPARE_EXAMPLE = {
  data: [
    {
      ean: '7896009419294',
      name: 'Crema Dental Sensodyne Multiproteccion X 90g',
      brand: 'Sensodyne',
      masonline_price: 6309,
      masonline_list_price: 6309,
      masonline_price_without_discount: 6309,
      masonline_has_mi_crf_discount: false,
      carrefour_price: 4725,
      carrefour_list_price: 6300,
      carrefour_price_without_discount: 6300,
      carrefour_has_mi_crf_discount: true,
      diff_pct: -25.11,
      cheaper: 'carrefour',
    },
  ],
  pagination: { limit: 20, offset: 0, total: 3421 },
};

@ApiTags('Compare')
@Controller('compare')
export class CompareController {
  constructor(private readonly compare: CompareService) {}

  @Get()
  @ApiOperation({
    summary: 'Comparación cross-retailer por EAN (Masonline vs Carrefour)',
    description:
      'Productos con precio vigente y disponible en AMBAS cadenas, matcheados por ' +
      'EAN. `diff_pct = (carrefour - masonline) / masonline * 100`; `cheaper` usa ' +
      'una tolerancia de empate de 1% (|diff| ≤ 1% → "tie"). ' +
      '**La marca "Genérico" se excluye por convención**: es una marca-catchall ' +
      'que cada cadena usa distinto (un mismo EAN puede referir productos físicos ' +
      'diferentes), así que no es comparable cross-retailer. Filtros por marca, ' +
      'categoría, `min_diff_pct` y `cheaper_at`; ordenable por diferencia o nombre.\n\n' +
      '**`*_price` vs `*_list_price`:** `*_price` es el precio efectivo, con los ' +
      'descuentos que VTEX ya aplicó; `*_list_price` es el de lista (tachado). ' +
      'Cuando difieren, el efectivo puede depender de una condición que el usuario ' +
      'no cumple (ej. la tarjeta "Mi Crf" de Carrefour). La brecha es sistémica: ' +
      '`list > price` en 44,7% del catálogo vigente de Carrefour y 20,1% del de ' +
      'Masonline. **`diff_pct` y `cheaper` se calculan sobre `price`**, no sobre el ' +
      'precio de lista.\n\n' +
      '**`*_price_without_discount`:** precio base sin el descuento que VTEX ya aplicó ' +
      'a `*_price`. En Carrefour es el precio no-socio (quien no tiene la tarjeta Mi ' +
      'Crf); `*_price` es el de socio. Es lo que el frontend usa para comparar sobre ' +
      'el precio físico. `null` solo si VTEX no expuso el campo; cuando no hay ' +
      'descuento, iguala a `*_price`.\n\n' +
      '**`*_has_mi_crf_discount`:** boolean derivado en el backend — `true` cuando el ' +
      'precio efectivo viene del descuento de fidelidad Mi Crf de Carrefour. Es el ' +
      'trigger del tratamiento visual "precio físico vs con Mi Crf"; el frontend no ' +
      'parsea strings de descuento. `masonline_has_mi_crf_discount` es siempre `false`.',
  })
  @ApiOkResponse({
    type: CompareResponseDto,
    description: 'Página de comparaciones + paginación.',
    example: COMPARE_EXAMPLE,
  })
  @ApiBadRequest()
  @ApiServerError()
  list(@Query() query: CompareQueryDto): Promise<CompareResponseDto> {
    return this.compare.compare(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas globales del match cross-retailer',
    description:
      'Overview del dataset comparado completo (sin filtros): total matcheado, ' +
      'histograma de |diff %|, quién es más barato y exclusivos por cadena. ' +
      '**Los buckets del histograma son left-inclusive / right-exclusive** ' +
      '([0,5), [5,10), [10,25), [25,50), [50,∞)) según convención estándar ' +
      'numpy/pandas, sobre |diff_pct| redondeado a 2 decimales. Los cortes viven ' +
      'en la constante compartida `DIFF_BUCKET_EDGES` (src/lib/diff-buckets.ts) por ' +
      'si un consumidor quiere replicar el bucketing client-side.',
  })
  @ApiOkResponse({ type: CompareStatsDto, description: 'Estadísticas agregadas del match cross-retailer.' })
  @ApiServerError()
  stats(): Promise<CompareStatsDto> {
    return this.compare.stats();
  }
}
