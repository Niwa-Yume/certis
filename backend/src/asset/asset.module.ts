import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { PublicVerificationController } from './public-verification.controller';
import { CatalogController } from '../catalog/catalog.controller';

@Module({
  controllers: [
    AssetController,
    PublicVerificationController,
    CatalogController,
  ],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
