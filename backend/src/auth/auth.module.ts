import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { readEnv } from '../config/env';
import { AssetModule } from '../asset/asset.module';

@Module({
  imports: [
    AssetModule,
    PassportModule,
    // registerAsync : le secret est lu à l'initialisation de l'app, pas à l'import du module.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: readEnv().jwtSecret,
        signOptions: { expiresIn: '1h', algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
