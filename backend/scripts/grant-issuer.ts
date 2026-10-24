import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IssuerService } from '../src/issuer/issuer.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Fait d'un compte existant l'émetteur d'une maison, avec sa propre clé (ADR-0003).
// Non destructif, donc utilisable sur une base de production : c'est l'accueil d'une maison.
// Usage : npm run issuer:grant -- <e-mail du compte> "<nom de l'émetteur>"
async function main() {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) {
    console.error(
      'Usage : npm run issuer:grant -- <e-mail> "<nom de l\'émetteur>"',
    );
    process.exitCode = 2;
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const prisma = app.get(PrismaService);
    const issuers = app.get(IssuerService);
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new Error(`Aucun compte ${email} : créez-le d'abord dans l'app.`);
    }
    const issuer =
      (await prisma.issuer.findFirst({ where: { name } })) ??
      (await issuers.create(name));
    await issuers.grant(user.id, issuer.id);
    console.log(
      `${user.email} inscrit désormais au nom de « ${issuer.name} ».`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
