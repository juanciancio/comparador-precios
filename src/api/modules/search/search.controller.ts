import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequest, ApiServerError } from '../../common/openapi/error-responses.ts';
import { SearchQueryDto, SearchResponseDto } from './dto/search.dto.ts';
import { SearchService } from './search.service.ts';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Búsqueda de productos por nombre',
    description:
      'Búsqueda full-text simple sobre el catálogo unificado. `q` se parte en ' +
      'términos por espacios y cada término debe matchear el nombre o la marca ' +
      '(ILIKE, case-insensitive, sin stemming ni sinónimos). Devuelve el mismo ' +
      'shape que GET /products. Requiere ≥2 caracteres. Filtrable por marca, ' +
      'categoría y solo-matcheados.',
  })
  @ApiOkResponse({ type: SearchResponseDto, description: 'Resultados + eco de `query` + paginación.' })
  @ApiBadRequest()
  @ApiServerError()
  find(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.search.search(query);
  }
}
