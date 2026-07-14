import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CompareQueryDto,
  CompareResponseDto,
  CompareStatsDto,
} from './dto/compare.dto.ts';
import { CompareService } from './compare.service.ts';

@ApiTags('compare')
@Controller('compare')
export class CompareController {
  constructor(private readonly compare: CompareService) {}

  @Get()
  @ApiOperation({
    summary: 'Comparación cross-retailer por EAN (Masonline vs Carrefour)',
    description:
      'Productos con precio vigente y disponible en ambas cadenas. Excluye marca ' +
      '"Genérico" (catchall no comparable). Filtrable por brand, category y ' +
      '`min_diff_pct`; ordenable por diferencia o nombre. `diff_pct` = ' +
      '(carrefour - masonline) / masonline * 100. `cheaper` usa tolerancia de 1%.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: CompareResponseDto })
  list(@Query() query: CompareQueryDto): Promise<CompareResponseDto> {
    return this.compare.compare(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas globales del match cross-retailer',
    description:
      'Total de productos matcheados, histograma de |diff %|, quién es más barato ' +
      'y exclusivos por cadena. Sin filtros: es un overview del dataset completo.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: CompareStatsDto })
  stats(): Promise<CompareStatsDto> {
    return this.compare.stats();
  }
}
