import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import {
  CardController,
  PublicVerificationController,
} from './public-verification.controller';
import { CatalogController } from '../catalog/catalog.controller';
import { RelationController, ShareController } from './relation.controller';
import { RelationService } from './relation.service';

@Module({
  controllers: [
    AssetController,
    PublicVerificationController,
    CardController,
    RelationController,
    ShareController,
    CatalogController,
  ],
  providers: [AssetService, RelationService],
  exports: [AssetService],
})
export class AssetModule {}
