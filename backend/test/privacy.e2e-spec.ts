import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  Issuer,
  User,
  auth,
  authenticate,
  claim,
  createIssuer,
  createApp,
  http,
  issueTransferNonce,
  issueVerifyNonce,
  mint,
  nonceValue,
  reportStolen,
  resetDatabase,
  registerUser,
} from './helpers';

// S-01 : lignes directrices 02/2025 de l'EDPB. Pas d'identité réelle dans un registre immuable,
// et l'effacement doit rester possible : supprimer le compte rend ses pseudonymes non rattachables.
describe('Privacy: erasure and the append-only journal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let issuer: Issuer;
  let owner: User;
  let buyer: User;
  let watch: { id: string };

  // Toutes les tables, telles qu'un administrateur les verrait.
  const everyRow = async () =>
    JSON.stringify(
      await Promise.all(
        ['User', 'Issuer', 'IssuerKey', 'Asset', 'AuthNonce', 'Event'].map(
          (table) => prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`),
        ),
      ),
    );

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    issuer = await createIssuer(app);
    owner = await registerUser(app);
    buyer = await registerUser(app);
    const res = await mint(app, issuer, { ownerEmail: owner.email }).expect(
      201,
    );
    watch = res.body as { id: string };
    const offer = await nonceValue(issueTransferNonce(app, owner, watch.id));
    await claim(app, buyer, watch.id, offer).expect(201);
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('S-01: the append-only journal holds no real identity', async () => {
    await reportStolen(app, buyer, watch.id).expect(201);
    const journal = JSON.stringify(
      await prisma.$queryRawUnsafe(`SELECT * FROM "Event"`),
    );

    for (const identity of [issuer, owner, buyer].flatMap((u) => [
      u.id,
      u.email,
    ])) {
      expect(journal).not.toContain(identity);
    }
  });

  it('S-01: an account can be erased, and nothing links the journal to it any more', async () => {
    await http(app).delete('/auth/me').set(auth(owner)).expect(204);

    await http(app)
      .post('/auth/login')
      .send({ email: owner.email, password: 'Password123!' })
      .expect(401);
    const rows = await everyRow();
    expect(rows).not.toContain(owner.id);
    expect(rows).not.toContain(owner.email);

    // La chaîne de la pièce, qui garde le pseudonyme de l'ancien propriétaire, vérifie toujours.
    const nonce = await nonceValue(issueVerifyNonce(app, buyer, watch.id));
    await authenticate(app, watch.id, nonce)
      .expect(200)
      .expect(({ body }) => expect(body.valid).toBe(true));
  });

  it('S-01: an owner must cede their pieces before erasing the account', async () => {
    await http(app)
      .delete('/auth/me')
      .set(auth(buyer))
      .expect(409)
      .expect(({ body }) => expect(body.message).toMatch(/céde/i));
  });
});
