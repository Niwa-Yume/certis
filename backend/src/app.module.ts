import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {PrismaModule} from "./prisma/prisma.module";
import { AssetModule } from './asset/asset.module';
import { CryptoModule } from './crypto/crypto.module';
import { NonceModule } from './nonce/nonce.module';
import { TransferModule } from './transfer/transfer.module';

@Module({
    imports: [PrismaModule, CryptoModule, AssetModule, NonceModule, NonceModule, TransferModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
