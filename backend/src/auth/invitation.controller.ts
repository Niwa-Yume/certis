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
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AssetService } from '../asset/asset.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class AcceptInvitationDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignore tout au-delà de 72 octets
  password: string;
}

// Public : le client n'a pas encore de compte. La capacité, c'est le jeton, montré en boutique.
@Controller('invitations')
export class InvitationController {
  constructor(
    private readonly assets: AssetService,
    private readonly auth: AuthService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get(':token')
  async show(@Param('token') token: string) {
    return (await this.assets.invitation(token)).view;
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':token/accept')
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.auth.acceptInvitation(token, dto.password);
  }

  // Un compte existant, connecté, ajoute la pièce à sa collection en présentant le jeton (ADR-0019).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post(':token/link')
  link(
    @Param('token') token: string,
    @Req() request: { user: { id: string; email: string } },
  ) {
    return this.assets.bindInvitation(token, request.user);
  }
}
