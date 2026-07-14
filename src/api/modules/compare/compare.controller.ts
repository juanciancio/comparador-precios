import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequest, ApiServerError } from '../../common/openapi/error-responses.ts';
import {
  CompareQueryDto,
  CompareResponseDto,
  CompareStatsDto,
} from './dto/compare.dto.ts';
import { CompareService } from './compare.service.ts';

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
      'categoría, `min_diff_pct` y `cheaper_at`; ordenable por diferencia o nombre.',
  })
  @ApiOkResponse({ type: CompareResponseDto, description: 'Página de comparaciones + paginación.' })
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
