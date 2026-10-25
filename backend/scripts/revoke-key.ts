import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { decodeJws } from '../src/crypto/crypto.service';
import { IssuerService } from '../src/issuer/issuer.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Révoque une clé d'émetteur compromise, à une date qui peut être passée (S-02, ADR-0011).
// Usage : npm run issuer:revoke -- <kid> [date ISO de la compromission, maintenant par défaut]
// Les kid sont publiés sur /.well-known/certis-keys, avec l'émetteur de chaque clé.
async function main() {
  const [kid, date] = process.argv.slice(2);
  const at = date ? new Date(date) : new Date();
  if (!kid || Number.isNaN(at.getTime())) {
    console.error('Usage : npm run issuer:revoke -- <kid> [date ISO]');
    process.exitCode = 2;
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const prisma = app.get(PrismaService);
    const key = await prisma.issuerKey.findUnique({
      where: { kid },
      include: { issuer: true },
    });
    if (!key) throw new Error(`Aucune clé d'émetteur ${kid}.`);
    await app.get(IssuerService).revokeKey(kid, at);

    // Ce que la révocation rend invalide : à réémettre par la maison.
    const passports = (
      await prisma.asset.findMany({ where: { issuerId: key.issuerId } })
    ).filter((a) => {
      const jws = decodeJws<{ validFrom: string }>(a.passport);
      return (
        jws?.header.kid === kid &&
        !(Date.parse(jws.payload.validFrom) < at.getTime())
      );
    }).length;
    const events = await prisma.event.count({
      where: { kid, at: { gte: at } },
    });
    console.log(
      `Clé ${kid} de « ${key.issuer.name} » révoquée au ${at.toISOString()}.`,
    );
    console.log(
      `${passports} passeport(s) et ${events} maillon(s) signés depuis cette date sont désormais refusés.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
