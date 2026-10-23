import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { PublicVerificationController } from './public-verification.controller';

@Module({
  controllers: [AssetController, PublicVerificationController],
  providers: [AssetService],
})
export class AssetModule {}
