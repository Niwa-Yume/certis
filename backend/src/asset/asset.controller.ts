import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
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
    create(
        @Body() dto: CreateAssetDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.assetService.create(dto, request.user.id);
    }

    @Get()
    findAll(@Req() request: AuthenticatedRequest) {
        return this.assetService.findAll(request.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.assetService.findOne(id);
    }

    @Get(':id/verify')
    verify(@Param('id') id: string) {
        return this.assetService.verify(id);
    }

    @Get(':id/nonce')
    generateNonce(@Param('id') id: string) {
        return this.assetService.generateNonce(id);
    }

    @Get(':id/authenticate')
    authenticate(@Param('id') id: string, @Query('nonce') nonce: string) {
        return this.assetService.authenticate(id, nonce);
    }
}