import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AssetService } from './asset.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Controller('assets')
export class AssetController {
    constructor(private readonly assetService: AssetService) {}

    @Post()
    create(@Body() dto: CreateAssetDto) {
        return this.assetService.create(dto);
    }

    @Get()
    findAll() {
        return this.assetService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.assetService.findOne(id);
    }
}