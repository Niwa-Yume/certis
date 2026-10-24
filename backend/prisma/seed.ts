import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { AssetService } from '../src/asset/asset.service';
import { IssuerService } from '../src/issuer/issuer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';

// Comptes de démo (dev uniquement). Les pièces passent par les vrais services : passeport signé
// par l'émetteur, chaîne d'événements, empreinte du numéro de série. Rien n'est écrit « à la main ».
const ISSUER = {
  // Fictif, et affiché comme tel : aucune maison réelle n'est présentée comme signataire (ADR-0003).
  name: 'Atelier de démonstration',
  email: 'atelier@certis.demo',
  password: 'Atelier2026!',
};

const owners = [
  { email: 'certis@pro.com', password: '1234567' },
  { email: 'julien.castro@certis.local', password: 'ChangeMe123!' },
];

// Caractéristiques relevées sur WatchBase le 2026-10-24 (URL en regard de chaque pièce).
// Numéros de série et dates : fictifs, pour la démo.
const watches = [
  {
    // https://watchbase.com/rolex/submariner/126610ln-0001
    dto: {
      name: 'Submariner Date',
      brand: 'Rolex',
      model: 'Submariner',
      reference: '126610LN',
      serial: 'DEMO-SUB-3235',
      movement: 'Rolex 3235',
      case: 'Acier, 41 mm, lunette tournante 0-60',
      dial: 'Noir',
      bracelet: 'Acier',
    },
    photo: { imageUrl: '/public/watches/submariner.webp', imageCutout: false },
    story: [{ type: 'MINT', at: '2023-11-20', owner: 'certis@pro.com' }],
  },
  {
    // https://watchbase.com/audemars-piguet/royal-oak/15202st-oo-1240st-01
    dto: {
      name: 'Royal Oak Extra-Plat',
      brand: 'Audemars Piguet',
      model: 'Royal Oak',
      reference: '15202ST.OO.1240ST.01',
      serial: 'DEMO-RO-1972',
      movement: 'Audemars Piguet 2121',
      case: 'Acier, 39 mm, 9,8 mm d’épaisseur',
      dial: 'Bleu, « Petite Tapisserie »',
      bracelet: 'Acier',
    },
    photo: { imageUrl: '/public/watches/royal-oak.webp', imageCutout: true },
    story: [
      { type: 'MINT', at: '2024-05-14' },
      { type: 'TRANSFER', at: '2024-06-02', owner: 'certis@pro.com' },
      {
        type: 'SERVICE',
        at: '2026-04-09',
        note: 'Révision complète, étanchéité contrôlée',
      },
    ],
  },
  {
    // https://watchbase.com/tag-heuer/carrera/cv7a12-ba0795
    dto: {
      name: 'Carrera Calibre S',
      brand: 'TAG Heuer',
      model: 'Carrera',
      reference: 'CV7A12.BA0795',
      serial: 'DEMO-CS-0417',
      movement: 'TAG Heuer Calibre S',
      case: 'Acier, 43 mm, lunette tachymètre',
      dial: 'Noir',
      bracelet: 'Acier',
    },
    photo: { imageUrl: '/public/watches/carrera.webp', imageCutout: true },
    story: [
      { type: 'MINT', at: '2024-03-12', owner: 'certis@pro.com' },
      {
        type: 'SERVICE',
        at: '2025-11-18',
        note: 'Remplacement de la pile du Calibre S',
      },
      {
        type: 'TRANSFER',
        at: '2026-09-03',
        owner: 'julien.castro@certis.local',
      },
    ],
  },
] as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Seed refusé en production : il efface toutes les données.',
    );
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const issuers = app.get(IssuerService);
  const assets = app.get(AssetService);
  const registry = app.get(RegistryService);

  try {
    // Idempotent : ne touche pas une base qui a déjà son émetteur, sauf `--reset`.
    // Une base sans émetteur (venue d'avant la Phase 3) est reprise de zéro.
    if (
      !process.argv.includes('--reset') &&
      (await prisma.issuer.count()) > 0
    ) {
      console.log(
        'Base déjà seedée, rien à faire (npm run db:reset pour repartir de zéro).',
      );
      return;
    }
    // TRUNCATE : le journal est append-only et refuse DELETE (ADR-0006).
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Event", "AuthNonce", "Asset", "IssuerKey", "User", "Issuer" CASCADE',
    );

    const users = new Map<string, string>();
    for (const { email, password } of [...owners, ISSUER]) {
      const user = await prisma.user.create({
        data: { email, passwordHash: await bcrypt.hash(password, 10) },
      });
      users.set(email, user.id);
    }
    const issuerUserId = users.get(ISSUER.email)!;
    const issuer = await issuers.create(ISSUER.name);
    await issuers.grant(issuerUserId, issuer.id);

    for (const { dto, photo, story } of watches) {
      const [mint, ...events] = story;
      const firstOwner = 'owner' in mint ? mint.owner : undefined;
      const { id } = await assets.mint(
        { ...dto, ownerEmail: firstOwner },
        issuerUserId,
        issuer.id,
        { ...photo, at: new Date(mint.at) },
      );
      let ownerId = firstOwner ? users.get(firstOwner)! : issuerUserId;
      for (const event of events) {
        await prisma.$transaction(async (tx) => {
          const asset = { id, issuerId: issuer.id };
          const at = new Date(event.at);
          if (event.type === 'SERVICE') {
            await registry.append(
              tx,
              asset,
              'SERVICE',
              { issuer: issuer.id, note: event.note },
              at,
            );
            return;
          }
          const to = users.get(event.owner)!;
          await registry.append(
            tx,
            asset,
            'TRANSFER',
            {
              from: registry.actorRef(id, ownerId),
              to: registry.actorRef(id, to),
            },
            at,
          );
          await tx.asset.update({ where: { id }, data: { ownerId: to } });
          ownerId = to;
        });
      }
    }

    for (const { email } of [...owners, ISSUER]) {
      const count = await prisma.asset.count({
        where: { ownerId: users.get(email) },
      });
      console.log(`${email} : ${count} montre(s)`);
    }
    console.log(`Émetteur « ${ISSUER.name} » : ${ISSUER.email}`);
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
