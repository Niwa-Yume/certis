import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AssetService } from './asset.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: { id: string; email: string };
};

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  create(@Body() dto: CreateAssetDto, @Req() request: AuthenticatedRequest) {
    return this.assetService.create(dto, request.user.id);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.assetService.findAll(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.assetService.findOne(id, request.user.id);
  }

  @Get(':id/verify')
  verify(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.assetService.verify(id, request.user.id);
  }

  // Le propriétaire génère le QR de vérification à montrer à un acheteur.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/verifications')
  issueVerification(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.assetService.issueVerification(id, request.user.id);
  }
}
