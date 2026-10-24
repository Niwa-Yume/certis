import { Controller, Get } from '@nestjs/common';
import { IssuerService } from './issuer.service';

// Public : n'importe qui vérifie passeports et événements sans compte ni appel à Certis (AUDIT N4).
@Controller('.well-known')
export class KeysController {
  constructor(private readonly issuers: IssuerService) {}

  @Get('certis-keys')
  keys() {
    return this.issuers.jwks();
  }
}
