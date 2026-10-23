import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransferOfferDto } from './dto/transfer-offer.dto';
import { NonceDto } from '../nonce/dto/nonce.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  // Le propriétaire génère le QR de transfert. Il n'existe plus de transfert sans accord du destinataire.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/transfer-offers')
  createOffer(
    @Param('id') id: string,
    @Body() dto: TransferOfferDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.transferService.createOffer(
      id,
      request.user.id,
      dto.recipientEmail,
    );
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.transferService.getHistory(id, request.user.id);
  }

  // Le receveur appelle cet endpoint après avoir scanné le QR de transfert du propriétaire.
  @Post(':id/claim')
  claim(
    @Param('id') id: string,
    @Body() dto: NonceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.transferService.claim(id, dto.nonce, request.user.id);
  }
}
