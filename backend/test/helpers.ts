import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JsonWebKey, createPublicKey, randomUUID, verify } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { IssuerService } from '../src/issuer/issuer.service';
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

// TRUNCATE plutôt que DELETE : le journal est append-only, et TRUNCATE ne déclenche pas le trigger (ADR-0006).
export async function resetDatabase(app: INestApplication) {
  await app
    .get(PrismaService)
    .$executeRawUnsafe(
      'TRUNCATE "AnchorLeaf", "Anchor", "Event", "AuthNonce", "Asset", "IssuerKey", "User", "Issuer" CASCADE',
    );
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

/** Une pièce inscrite par un émetteur de test au nom de `owner`. */
export async function createAsset(
  app: INestApplication,
  owner: User,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const issuer = await createIssuer(app);
  const res = await mint(app, issuer, {
    ownerEmail: owner.email,
    ...overrides,
  }).expect(201);
  return res.body as { id: string };
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
  const req = http(app).post(`/assets/${assetId}/authenticate`).send({ nonce });
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

/** Échange les passeports de deux pièces : une transplantation que la vérification doit refuser. */
export async function swapPassports(
  app: INestApplication,
  a: string,
  b: string,
) {
  await app.get(PrismaService).$executeRawUnsafe(
    `UPDATE "Asset" AS x SET "passport" = y."passport"
       FROM "Asset" AS y
      WHERE (x."id", y."id") IN (($1, $2), ($2, $1))`,
    a,
    b,
  );
}

// ── Registre (Phase 3) ──────────────────────────────────────────────────

export type Issuer = User & { issuerId: string };

/** Compte émetteur : un utilisateur rattaché à une maison qui a sa propre clé. */
export async function createIssuer(
  app: INestApplication,
  name = 'Atelier test',
): Promise<Issuer> {
  const user = await registerUser(app);
  const issuers = app.get(IssuerService);
  const issuer = await issuers.create(name);
  await issuers.grant(user.id, issuer.id);
  return { ...user, issuerId: issuer.id };
}

export const mint = (
  app: INestApplication,
  issuer: User,
  body: Record<string, unknown> = {},
) =>
  http(app)
    .post('/assets')
    .set(auth(issuer))
    .send({
      name: 'Montre test',
      brand: 'Brand',
      model: 'Model',
      reference: `REF-${randomUUID()}`,
      serial: `SN-${randomUUID().slice(0, 8)}`,
      ...body,
    });

export const reportStolen = (app: INestApplication, user: User, id: string) =>
  http(app).post(`/assets/${id}/stolen`).set(auth(user));

export const reportRecovered = (
  app: INestApplication,
  user: User,
  id: string,
) => http(app).post(`/assets/${id}/recovered`).set(auth(user));

export const checkSerial = (
  app: INestApplication,
  id: string,
  nonce: string,
  serial: string,
) => http(app).post(`/assets/${id}/serial-check`).send({ nonce, serial });

export type Jwk = JsonWebKey & { kid: string; issuer: string };

/** Vérifie une JWS ES256 avec la seule JWKS publique, sans passer par Certis. */
export function verifyJws(jws: string, keys: Jwk[]) {
  const [h, p, s] = jws.split('.');
  const header = JSON.parse(Buffer.from(h, 'base64url').toString()) as {
    alg: string;
    kid: string;
  };
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== 'ES256') return { ok: false, header };
  const ok = verify(
    'sha256',
    Buffer.from(`${h}.${p}`),
    {
      key: createPublicKey({ key: jwk, format: 'jwk' }),
      dsaEncoding: 'ieee-p1363',
    },
    Buffer.from(s, 'base64url'),
  );
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString()) as {
    issuer: { id: string; name: string };
    credentialSubject: { id: string; serialHash: string };
  };
  return { ok, header, payload, jwk };
}
