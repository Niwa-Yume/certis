import { Controller, Get } from '@nestjs/common';
import { CATALOG } from './catalog';

/** Public : des références de montres, aucune donnée de registre. */
@Controller('catalog')
export class CatalogController {
  @Get()
  list() {
    return CATALOG;
  }
}
