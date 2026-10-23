import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export type User = { id: string; email: string; token: string };

export async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  // Serveur à l'écoute une fois pour toutes : supertest ne l'ouvre ni ne le ferme
  // à chaque requête, ce qui rend les requêtes concurrentes fiables.
  await app.listen(0);
  return app;
}

export async function resetDatabase(app: INestApplication) {
  const prisma = app.get(PrismaService);
  await prisma.transfer.deleteMany();
  await prisma.authNonce.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();
}

export const http = (app: INestApplication) => request(app.getHttpServer());
export const auth = (user: User) => ({ Authorization: `Bearer ${user.token}` });

export async function registerUser(app: INestApplication): Promise<User> {
  const email = `user.${randomUUID()}@certis.test`;
  const res = await http(app)
    .post('/auth/register')
    .send({ email, password: 'Password123!' })
    .expect(201);
  return { id: res.body.user.id, email, token: res.body.accessToken };
}

export async function createAsset(
  app: INestApplication,
  user: User,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const res = await http(app)
    .post('/assets')
    .set(auth(user))
    .send({
      name: 'Montre test',
      brand: 'Brand',
      model: 'Model',
      reference: `REF-${randomUUID()}`,
      ...overrides,
    })
    .expect(201);
  return res.body;
}

export const ownerOf = async (app: INestApplication, assetId: string) =>
  (
    await app
      .get(PrismaService)
      .asset.findUniqueOrThrow({ where: { id: assetId } })
  ).ownerId;

// ── Plomberie du flux nonce ─────────────────────────────────────────────
// Seules ces fonctions suivent l'API ; les assertions des tests ne changent pas
// entre l'API vulnérable et l'API corrigée.

export const issueVerifyNonce = (
  app: INestApplication,
  user: User,
  assetId: string,
) => http(app).post(`/assets/${assetId}/verifications`).set(auth(user));

export const issueTransferNonce = (
  app: INestApplication,
  user: User,
  assetId: string,
  body: { recipientEmail?: string } = {},
) =>
  http(app)
    .post(`/assets/${assetId}/transfer-offers`)
    .set(auth(user))
    .send(body);

export const authenticate = (
  app: INestApplication,
  assetId: string,
  nonce: string,
  user?: User,
) => {
  const req = http(app).get(`/assets/${assetId}/authenticate`).query({ nonce });
  return user ? req.set(auth(user)) : req;
};

export const claim = (
  app: INestApplication,
  user: User,
  assetId: string,
  nonce?: string,
) =>
  http(app)
    .post(`/assets/${assetId}/claim`)
    .set(auth(user))
    .send(nonce === undefined ? {} : { nonce });

/** Nonce émis avec succès (2xx), quel que soit le code exact de la route. */
export async function nonceValue(
  pending: ReturnType<typeof issueTransferNonce>,
): Promise<string> {
  const res = await pending;
  expect(res.status).toBeLessThan(300);
  return res.body.nonce;
}

export async function swapSignatures(
  app: INestApplication,
  a: string,
  b: string,
) {
  const prisma = app.get(PrismaService);
  const [assetA, assetB] = await Promise.all([
    prisma.asset.findUniqueOrThrow({ where: { id: a } }),
    prisma.asset.findUniqueOrThrow({ where: { id: b } }),
  ]);
  await prisma.asset.update({
    where: { id: a },
    data: { integrityHash: assetB.integrityHash },
  });
  await prisma.asset.update({
    where: { id: b },
    data: { integrityHash: assetA.integrityHash },
  });
}
