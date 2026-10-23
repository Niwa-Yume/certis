import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AssetService } from './asset.service';
import { NonceDto } from '../nonce/dto/nonce.dto';

// Contrôleur séparé et sans garde : AssetController reste protégé par défaut.
@Controller('assets')
export class PublicVerificationController {
  constructor(private readonly assetService: AssetService) {}

  // Public : l'acheteur ou la maison de ventes vérifie sans compte Certis.
  // La capacité, c'est le nonce : émis par le propriétaire, lié à la montre, usage unique, 60 s.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/authenticate')
  @HttpCode(200)
  authenticate(@Param('id') id: string, @Body() dto: NonceDto) {
    return this.assetService.authenticate(id, dto.nonce);
  }
}
