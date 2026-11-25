import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { AssetService } from '../src/asset/asset.service';
import {
  CATALOG,
  DEMO_ADVISOR,
  DEMO_HOUSE,
  DEMO_WATCHES,
  type DemoWatch,
} from '../src/catalog/catalog';
import { IssuerService } from '../src/issuer/issuer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';

// Comptes de démo. Les pièces passent par les vrais services : passeport signé par l'émetteur,
// chaîne d'événements, empreinte du numéro de série. Rien n'est écrit « à la main ».
// En production, seule la maison de démonstration est créée, avec DEMO_ISSUER_PASSWORD (ADR-0012).
// Une base distante compte comme la production, même sans NODE_ENV : on ne crée pas de comptes
// à mot de passe public sur une base qu'on ne voit pas.
const databaseHost = new URL(
  process.env.DATABASE_URL ?? 'postgresql://localhost',
).hostname;
const production =
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(databaseHost);
const ISSUER = {
  // Fictive par défaut, et présentée comme telle (ADR-0003, ADR-0015) ; DEMO_HOUSE_FILE la remplace.
  name: DEMO_HOUSE,
  email: 'atelier@certis.demo',
  password: process.env.DEMO_ISSUER_PASSWORD ?? 'Atelier2026!',
};

const owners = [
  { email: 'certis@pro.com', password: '1234567' },
  { email: 'julien.castro@certis.local', password: 'ChangeMe123!' },
];

// Les pièces des clients de la maison, tirées de son catalogue. Numéros de série et dates :
// fictifs. Une seule histoire est suivie par la démo : remise, révisée, puis cédée (DEMO.md).
const ORVENE_WATCHES: DemoWatch[] = [
  {
    reference: 'OR-1201',
    serial: 'DEMO-OR-1201-0417',
    story: [
      { type: 'MINT', at: '2024-03-12', owner: 'certis@pro.com' },
      {
        type: 'SERVICE',
        at: '2025-11-18',
        note: 'Contrôle de marche et d’étanchéité',
      },
      {
        type: 'TRANSFER',
        at: '2026-09-03',
        owner: 'julien.castro@certis.local',
      },
    ],
  },
  {
    reference: 'OR-3101',
    serial: 'DEMO-OR-3101-0088',
    story: [
      { type: 'MINT', at: '2023-11-20', owner: 'certis@pro.com' },
      {
        type: 'SERVICE',
        at: '2026-04-09',
        note: 'Révision complète, étanchéité contrôlée',
      },
    ],
  },
];
const watches = (DEMO_WATCHES ?? ORVENE_WATCHES).map(
  ({ reference, serial, story }) => {
    // `source` part avec : mint() ne retient que les champs de la pièce.
    const { photo, ...entry } = CATALOG.find((e) => e.reference === reference)!;
    return { dto: { ...entry, serial }, photo: photo ?? {}, story };
  },
);

async function main() {
  const reset = process.argv.includes('--reset');
  if (production && reset) {
    throw new Error(
      'Remise à zéro refusée en production : elle efface toutes les données.',
    );
  }
  if (production && !process.env.DEMO_ISSUER_PASSWORD) {
    throw new Error(
      'En production, la maison de démonstration exige DEMO_ISSUER_PASSWORD : le mot de passe par défaut est public.',
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
    // Idempotent : ne touche pas une base qui a déjà sa maison de démonstration, sauf `--reset`.
    if (
      !reset &&
      (await prisma.user.findUnique({ where: { email: ISSUER.email } }))
    ) {
      console.log(
        'Base déjà seedée, rien à faire (npm run db:reset pour repartir de zéro).',
      );
      return;
    }
    // Seulement sur demande explicite. TRUNCATE : le journal refuse DELETE (ADR-0006).
    if (reset) {
      await prisma.$executeRawUnsafe(
        'TRUNCATE "AnchorLeaf", "Anchor", "Event", "AuthNonce", "Asset", "IssuerKey", "User", "Issuer" CASCADE',
      );
    }

    const users = new Map<string, string>();
    for (const { email, password } of production
      ? [ISSUER]
      : [...owners, ISSUER]) {
      const user = await prisma.user.create({
        data: { email, passwordHash: await bcrypt.hash(password, 10) },
      });
      users.set(email, user.id);
    }
    const issuerUserId = users.get(ISSUER.email)!;
    // Le visage que voit le client sur chaque pièce inscrite par ce compte.
    await prisma.user.update({
      where: { id: issuerUserId },
      data: {
        displayName: DEMO_ADVISOR.name,
        title: DEMO_ADVISOR.title,
        photoUrl: DEMO_ADVISOR.photoUrl ?? null,
      },
    });
    const issuer = await issuers.create(ISSUER.name);
    await issuers.grant(issuerUserId, issuer.id);

    // Le stock de la maison : une pièce par référence du catalogue, prête à être cédée à un client.
    // `source` part avec : mint() ne retient que les champs de la pièce.
    for (const [i, { photo, ...entry }] of CATALOG.entries()) {
      await assets.mint(
        { ...entry, serial: `DEMO-STOCK-${String(i + 1).padStart(2, '0')}` },
        issuerUserId,
        issuer.id,
        photo,
      );
    }

    for (const { dto, photo, story } of production ? [] : watches) {
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
        if (event.type === 'MINT') continue; // une seule inscription, en tête
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

    for (const { email } of production ? [ISSUER] : [...owners, ISSUER]) {
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
