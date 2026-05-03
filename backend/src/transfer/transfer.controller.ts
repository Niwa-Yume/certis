import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { TransferService } from './transfer.service';

@Controller('assets')
export class TransferController {
    constructor(private readonly transferService: TransferService) {}

    @Post(':id/transfer')
    transfer(
        @Param('id') id: string,
        @Body('toOwnerId') toOwnerId: string,
    ) {
        return this.transferService.transfer(id, toOwnerId);
    }

    @Get(':id/history')
    getHistory(@Param('id') id: string) {
        return this.transferService.getHistory(id);
    }
}