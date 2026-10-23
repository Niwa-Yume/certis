import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { readEnv } from '../src/config/env';
import { CryptoService } from '../src/crypto/crypto.service';

// Comptes de démo (dev uniquement). Chaque montre a une image dans mobile/lib/watchImages.ts.
const users = [
  {
    id: 'certis-pro',
    email: 'certis@pro.com',
    password: '1234567',
    watches: [
      {
        name: 'Submariner Date',
        brand: 'Rolex',
        model: 'Submariner',
        reference: '126610LN',
      },
      {
        name: 'Royal Oak',
        brand: 'Audemars Piguet',
        model: 'Royal Oak',
        reference: '15510ST.OO.1320ST.06',
      },
      {
        name: 'Speedmaster Moonwatch',
        brand: 'Omega',
        model: 'Speedmaster',
        reference: '310.30.42.50.01.001',
      },
    ],
  },
  {
    id: 'julien-castro',
    email: 'julien.castro@certis.local',
    password: 'ChangeMe123!',
    watches: [
      {
        name: 'Nautilus',
        brand: 'Patek Philippe',
        model: 'Nautilus',
        reference: '5711/1A-010',
      },
      {
        name: 'Carrera Chronograph',
        brand: 'TAG Heuer',
        model: 'Carrera',
        reference: 'CBN2A1B.FC6492',
      },
    ],
  },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: readEnv().databaseUrl }),
});
const crypto = new CryptoService();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Seed refusé en production : il efface toutes les données.',
    );
  }
  // Idempotent : ne touche pas une base déjà remplie, sauf `--reset`.
  if (!process.argv.includes('--reset') && (await prisma.user.count()) > 0) {
    console.log(
      'Base déjà seedée, rien à faire (npm run db:reset pour repartir de zéro).',
    );
    return;
  }

  await prisma.$transaction([
    prisma.transfer.deleteMany(),
    prisma.authNonce.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  for (const { watches, password, ...user } of users) {
    await prisma.user.create({
      data: { ...user, passwordHash: await bcrypt.hash(password, 10) },
    });
    for (const watch of watches) {
      const integrityHash = crypto.sign({
        brand: watch.brand,
        model: watch.model,
        reference: watch.reference,
        ownerId: user.id,
      });
      await prisma.asset.create({
        data: { ...watch, ownerId: user.id, integrityHash },
      });
    }
    console.log(`${user.email} : ${watches.length} montres`);
  }
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
