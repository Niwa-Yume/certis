import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AssetModule } from './asset/asset.module';
import { CryptoModule } from './crypto/crypto.module';
import { NonceModule } from './nonce/nonce.module';
import { TransferModule } from './transfer/transfer.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { IssuerModule } from './issuer/issuer.module';
import { RegistryModule } from './registry/registry.module';
import { validationError } from './common/validation';

@Module({
  imports: [
    // Plafond par IP pour toute l'API ; les routes sensibles ont leur propre limite (@Throttle).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      errorMessage:
        'Trop de demandes en peu de temps : patientez une minute, puis réessayez.',
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    CryptoModule,
    IssuerModule,
    RegistryModule,
    AssetModule,
    NonceModule,
    TransferModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Déclarés ici plutôt que dans main.ts : les tests e2e les exécutent aussi.
    {
      provide: APP_PIPE,
      // whitelist + forbidNonWhitelisted : un champ inconnu est refusé (AUDIT N8).
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationError,
      }),
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
