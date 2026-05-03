import { Global, Module } from '@nestjs/common';
import { NonceService } from './nonce.service';

@Global()
@Module({
    providers: [NonceService],
    exports: [NonceService],
})
export class NonceModule {}