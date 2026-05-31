import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AssetService } from './asset.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthenticatedRequest = Request & {
    user: { id: string; email: string };
};

const uploadStorage = diskStorage({
    destination: join(process.cwd(), 'public', 'uploads'),
    filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
});

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetController {
    constructor(private readonly assetService: AssetService) {}

    @Post()
    @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
    create(
        @Body() dto: CreateAssetDto,
        @Req() request: AuthenticatedRequest,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const imageUrl = file
            ? `${request.protocol}://${request.get('host')}/public/uploads/${file.filename}`
            : undefined;
        return this.assetService.create({ ...dto, imageUrl }, request.user.id);
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