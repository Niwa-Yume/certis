import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { readEnv } from './config/env';

async function bootstrap() {
  const env = readEnv(); // Échoue avant tout démarrage si la config est invalide.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', env.trustProxyHops);
  // cross-origin : le front (autre origine) affiche les images servies sous /public.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: env.corsOrigins });
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/public/' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
