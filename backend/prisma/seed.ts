import 'dotenv/config';
import { AssetStatus, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
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
        // https://watchbase.com/audemars-piguet/royal-oak/15202st-oo-1240st-01
        name: 'Royal Oak Extra-Plat',
        brand: 'Audemars Piguet',
        model: 'Royal Oak',
        reference: '15202ST.OO.1240ST.01',
      },
    ],
  },
  {
    id: 'julien-castro',
    email: 'julien.castro@certis.local',
    password: 'ChangeMe123!',
    watches: [
      {
        // https://watchbase.com/tag-heuer/carrera/cv7a12-ba0795
        name: 'Carrera Calibre S',
        brand: 'TAG Heuer',
        model: 'Carrera',
        reference: 'CV7A12.BA0795',
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
      const asset = {
        ...watch,
        id: randomUUID(),
        status: AssetStatus.ACTIVE,
        imageUrl: null,
        ownerId: user.id,
      };
      await prisma.asset.create({
        data: { ...asset, signature: crypto.signAsset(asset) },
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
