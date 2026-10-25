import { Global, Module } from '@nestjs/common';
import { AnchorService } from './anchor.service';
import { RegistryService } from './registry.service';

@Global()
@Module({
  providers: [RegistryService, AnchorService],
  exports: [RegistryService, AnchorService],
})
export class RegistryModule {}
