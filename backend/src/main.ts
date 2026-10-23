import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { readEnv } from './config/env';

async function bootstrap() {
  readEnv(); // Échoue avant tout démarrage si la config est invalide.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/public/' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
