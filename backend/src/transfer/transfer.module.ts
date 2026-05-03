import {Global, Module} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';

@Global()
@Module({
    controllers: [TransferController],
    providers: [TransferService],
    exports: [TransferService],
})
export class TransferModule {}