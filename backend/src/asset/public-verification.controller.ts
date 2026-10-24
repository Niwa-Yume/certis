import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AssetService } from './asset.service';
import { NonceDto } from '../nonce/dto/nonce.dto';
import { SerialCheckDto } from './dto/create-asset.dto';

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

  // Après une vérification réussie, avec le même QR : 5 essais en 10 minutes (ADR-0005).
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/serial-check')
  @HttpCode(200)
  checkSerial(@Param('id') id: string, @Body() dto: SerialCheckDto) {
    return this.assetService.checkSerial(id, dto.nonce, dto.serial);
  }
}
