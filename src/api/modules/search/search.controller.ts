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
      'categoría y solo-matcheados.\n\n' +
      'Ordenable con `sort_by`/`sort_dir`, que aceptan los mismos valores que ' +
      'GET /products (`name`, `brand`, `first_seen`, `last_seen`): este endpoint ' +
      'reusa su repositorio. **No hay orden por relevancia**: sin FTS no existe ' +
      'un ranking que ordenar, así que el default es `name` asc igual que en ' +
      '/products.\n\n' +
      'Sin sort (default `name` asc):\n' +
      '`GET /search?q=aceite`\n\n' +
      'Con sort, los más vistos recientemente primero:\n' +
      '`GET /search?q=aceite&sort_by=last_seen&sort_dir=desc`',
  })
  @ApiOkResponse({ type: SearchResponseDto, description: 'Resultados + eco de `query` + paginación.' })
  @ApiBadRequest()
  @ApiServerError()
  find(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.search.search(query);
  }
}
