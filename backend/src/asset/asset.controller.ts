import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AssetService } from './asset.service';
import { CreateAssetDto, ServiceDto } from './dto/create-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssuerGuard, type IssuerRequest } from '../issuer/issuer.guard';

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  // Seul un émetteur inscrit une pièce : il en atteste, avec sa clé (AUDIT N3, ADR-0003).
  @UseGuards(IssuerGuard)
  @Post()
  mint(@Body() dto: CreateAssetDto, @Req() request: IssuerRequest) {
    return this.assetService.mint(dto, request.user.id, request.user.issuerId!);
  }

  @Get()
  findAll(@Req() request: IssuerRequest) {
    return this.assetService.findAll(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.assetService.findOne(id, request.user.id);
  }

  // Passeport et chaîne complète, à donner au vérificateur indépendant (tools/verify).
  @Get(':id/history')
  history(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.assetService.history(id, request.user.id);
  }

  @Get(':id/verify')
  verify(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.assetService.verify(id, request.user.id);
  }

  // Le propriétaire génère le QR de vérification à montrer à un acheteur.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/verifications')
  issueVerification(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.assetService.issueVerification(id, request.user.id);
  }

  @Post(':id/stolen')
  reportStolen(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.assetService.report(id, request.user.id, 'STOLEN_REPORTED');
  }

  @Post(':id/recovered')
  reportRecovered(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.assetService.report(id, request.user.id, 'RECOVERED');
  }

  @UseGuards(IssuerGuard)
  @Post(':id/services')
  recordService(
    @Param('id') id: string,
    @Body() dto: ServiceDto,
    @Req() request: IssuerRequest,
  ) {
    return this.assetService.recordService(
      id,
      request.user.issuerId!,
      dto.note,
    );
  }
}
