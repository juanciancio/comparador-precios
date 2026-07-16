import { Global, Module } from '@nestjs/common';
import { BrandCatalogService } from './brand-catalog.service.ts';

/**
 * Expone el BrandCatalogService (display canónico de marcas) a toda la app.
 * Global para que ProductsRepository, BrandsRepository y search (vía products)
 * lo inyecten sin re-importar el módulo. Comparte el pool pg vía DatabaseModule.
 */
@Global()
@Module({
  providers: [BrandCatalogService],
  exports: [BrandCatalogService],
})
export class BrandCatalogModule {}
