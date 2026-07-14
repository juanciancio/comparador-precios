import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchQueryDto, SearchResponseDto } from './dto/search.dto.ts';
import { SearchService } from './search.service.ts';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Búsqueda de productos por nombre',
    description:
      'Parte `q` en términos (por espacios); cada término debe matchear el nombre ' +
      'o la marca (ILIKE). Devuelve el mismo shape que GET /products. Filtrable por ' +
      'brand, category y only_matched.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: SearchResponseDto })
  find(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.search.search(query);
  }
}
