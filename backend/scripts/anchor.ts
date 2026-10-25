import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AnchorService } from '../src/registry/anchor.service';

// Ancre tout de suite les têtes de chaîne nouvelles (S-04, ADR-0007) ; l'API le fait seule toutes les 10 min.
// Usage : npm run registry:anchor
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const anchor = await app.get(AnchorService).anchor();
    console.log(
      anchor
        ? `${anchor.leaves.length} tête(s) de chaîne ancrée(s), horodatée(s) au ${anchor.at.toISOString()}.`
        : 'Rien de nouveau à ancrer.',
    );
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(`Ancrage impossible : ${error.message}`);
  process.exitCode = 1;
});
