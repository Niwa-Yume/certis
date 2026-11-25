import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssuerGuard, type IssuerRequest } from '../issuer/issuer.guard';
import { ServiceDto } from './dto/create-asset.dto';
import { RelationService } from './relation.service';

class ShareDto {
  // Trois durées, pas une de plus : une heure, un jour, une semaine.
  @IsIn([1, 24, 168])
  hours: number;

  @IsBoolean()
  history: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class RelationController {
  constructor(private readonly relation: RelationService) {}

  @Post('assets/:id/service-requests')
  requestService(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.relation.requestService(id, request.user.id);
  }

  @UseGuards(IssuerGuard)
  @Get('service-requests')
  queue(@Req() request: IssuerRequest) {
    return this.relation.queue(request.user.issuerId!);
  }

  @UseGuards(IssuerGuard)
  @Post('service-requests/:id/receive')
  receive(@Param('id') id: string, @Req() request: IssuerRequest) {
    return this.relation.receive(id, request.user.issuerId!);
  }

  @UseGuards(IssuerGuard)
  @Post('service-requests/:id/return')
  giveBack(
    @Param('id') id: string,
    @Body() dto: ServiceDto,
    @Req() request: IssuerRequest,
  ) {
    return this.relation.giveBack(id, request.user.issuerId!, dto.note);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('assets/:id/shares')
  share(
    @Param('id') id: string,
    @Body() dto: ShareDto,
    @Req() request: IssuerRequest,
  ) {
    return this.relation.share(id, request.user.id, dto.hours, dto.history);
  }

  @Delete('assets/:id/shares/:shareId')
  stop(
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Req() request: IssuerRequest,
  ) {
    return this.relation.stopSharing(id, request.user.id, shareId);
  }
}

// Public : celui qui a reçu le lien du propriétaire, sans compte.
@Controller('shares')
export class ShareController {
  constructor(private readonly relation: RelationService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':token')
  open(@Param('token') token: string) {
    return this.relation.open(token);
  }
}
