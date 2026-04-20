import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {PrismaModule} from "./prisma/prisma.module";
import { AssetModule } from './asset/asset.module';
import { CryptoModule } from './crypto/crypto.module';

@Module({
    imports: [PrismaModule, CryptoModule, AssetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
