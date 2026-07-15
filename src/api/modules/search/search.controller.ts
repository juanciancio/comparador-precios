import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequest, ApiServerError } from '../../common/openapi/error-responses.ts';
import { SearchFacetsQueryDto, SearchFacetsResponseDto } from './dto/facets.dto.ts';
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

  @Get('facets')
  @ApiOperation({
    summary: 'Facets de marca para el sidebar de filtros',
    description:
      'Marcas con su cantidad de productos dentro de un scope, para el sidebar de ' +
      'las vistas de búsqueda y categoría. Acepta los mismos filtros de scope que ' +
      'GET /search y GET /products (`q`, `category_top`, `only_matched`), y los ' +
      'resuelve con el mismo código.\n\n' +
      '**Los counts se calculan sobre el scope SIN filtro de marca**, a propósito: ' +
      'son los mismos productos que devuelve GET /search o GET /products con esos ' +
      'params antes de filtrar por `brand`. Eso permite mostrar "otras marcas ' +
      'disponibles en este scope" y hace que los números no se muevan cuando el ' +
      'usuario tilda una marca en el sidebar. La suma de los counts de todas las ' +
      'marcas de un scope iguala el `total` de ese scope.\n\n' +
      'Sin `brand_query` el orden es por count DESC, desempate alfabético. Con ' +
      '`brand_query`, primero los que matchean por prefijo y después por substring, ' +
      'dentro de cada grupo por count DESC.\n\n' +
      'Top 10 marcas de una búsqueda:\n' +
      '`GET /search/facets?q=leche`\n\n' +
      'Top 10 marcas de un departamento (repetible, OR entre valores):\n' +
      '`GET /search/facets?category_top=Limpieza&category_top=Accesorios De Limpieza`\n\n' +
      'Autocompletado del input "Buscar marca" dentro del scope:\n' +
      '`GET /search/facets?q=leche&brand_query=ser`',
  })
  @ApiOkResponse({
    type: SearchFacetsResponseDto,
    description: 'Marcas del scope con su conteo de productos.',
    example: {
      brands: [
        { name: 'La Serenísima', count: 76 },
        { name: 'Sedal', count: 63 },
      ],
    },
  })
  @ApiBadRequest()
  @ApiServerError()
  facets(@Query() query: SearchFacetsQueryDto): Promise<SearchFacetsResponseDto> {
    return this.search.facets(query);
  }
}
