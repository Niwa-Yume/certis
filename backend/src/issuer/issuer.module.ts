import { Global, Module } from '@nestjs/common';
import { IssuerGuard } from './issuer.guard';
import { IssuerService } from './issuer.service';
import { KeysController } from './keys.controller';

@Global()
@Module({
  controllers: [KeysController],
  providers: [IssuerService, IssuerGuard],
  exports: [IssuerService, IssuerGuard],
})
export class IssuerModule {}
