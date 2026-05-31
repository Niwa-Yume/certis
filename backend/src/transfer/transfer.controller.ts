import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

    @Post(':id/transfer')
    transfer(
        @Param('id') id: string,
        @Body('toOwnerId') toOwnerId: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.transferService.transfer(id, toOwnerId, request.user.id);
    }

    @Get(':id/history')
    getHistory(@Param('id') id: string) {
        return this.transferService.getHistory(id);
    }

    // Le receveur appelle cet endpoint après avoir scanné le QR de transfert du propriétaire.
    @Post(':id/claim')
    claim(
        @Param('id') id: string,
        @Body('nonce') nonce: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.transferService.claim(id, nonce, request.user.id);
    }
}