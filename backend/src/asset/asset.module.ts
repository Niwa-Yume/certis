import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import {
  CardController,
  PublicVerificationController,
} from './public-verification.controller';
import { CatalogController } from '../catalog/catalog.controller';

@Module({
  controllers: [
    AssetController,
    PublicVerificationController,
    CardController,
    CatalogController,
  ],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
