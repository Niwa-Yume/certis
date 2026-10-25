import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';
import {
  User,
  auth,
  authenticate,
  claim,
  createApp,
  createIssuer,
  http,
  issueTransferNonce,
  issueVerifyNonce,
  mint,
  nonceValue,
  registerUser,
  resetDatabase,
} from './helpers';

type Piece = { id: string; brand: string; trial?: boolean };

// Phase 7 : essayer Certis sans rien préparer, et comprendre chaque refus (docs/BACKLOG.md).
describe('Trying Certis: trial piece, catalogue, explicit refusals (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const pieces = async (user: User) =>
    (await http(app).get('/assets').set(auth(user)).expect(200))
      .body as Piece[];

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => resetDatabase(app));

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('P7: a new account receives a trial piece, marked as such, that it can verify publicly', async () => {
    const owner = await registerUser(app);

    const [trial, ...others] = await pieces(owner);
    expect(others).toHaveLength(0);
    expect(trial).toMatchObject({ brand: 'Certis', trial: true });

    const nonce = await nonceValue(issueVerifyNonce(app, owner, trial.id));
    const { body } = await authenticate(app, trial.id, nonce).expect(200);
    expect(body).toMatchObject({ valid: true, trial: true });
  });

  it('P7: the trial piece can change hands like any other', async () => {
    const owner = await registerUser(app);
    const friend = await registerUser(app);
    const [trial] = await pieces(owner);

    const nonce = await nonceValue(
      issueTransferNonce(app, owner, trial.id, {
        recipientEmail: friend.email,
      }),
    );
    await claim(app, friend, trial.id, nonce).expect(201);

    expect(await pieces(owner)).toHaveLength(0);
    expect((await pieces(friend)).map((p) => p.id)).toContain(trial.id);
  });

  it('P7: an account that holds only its trial piece can be erased, and the piece returns to Certis', async () => {
    const owner = await registerUser(app);
    const [trial] = await pieces(owner);

    await http(app)
      .delete('/auth/me')
      .set(auth(owner))
      .send({ password: 'Password123!' })
      .expect(204);

    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: trial.id },
    });
    expect(asset.ownerId).not.toBe(owner.id);
    expect((await app.get(RegistryService).verify(asset)).problem).toBeNull();
  });

  it('P7: the catalogue gives issuers real references, Royal Oak variants included', async () => {
    const { body } = await http(app).get('/catalog').expect(200);
    const catalogue = body as {
      brand: string;
      model: string;
      name: string;
      reference: string;
    }[];

    for (const entry of catalogue) {
      expect(entry).toEqual(
        expect.objectContaining({
          brand: expect.any(String),
          model: expect.any(String),
          name: expect.any(String),
          reference: expect.any(String),
        }),
      );
    }
    const royalOaks = catalogue.filter(
      (e) => e.brand === 'Audemars Piguet' && e.model === 'Royal Oak',
    );
    expect(royalOaks.length).toBeGreaterThan(1);
  });

  it('P7: refusals say, in French, what went wrong and how to fix it', async () => {
    const owner = await registerUser(app);
    const stranger = await registerUser(app);
    const issuer = await createIssuer(app);
    const watch = (await mint(app, issuer, { ownerEmail: owner.email }))
      .body as { id: string };
    const other = (await mint(app, issuer, { ownerEmail: owner.email }))
      .body as { id: string };
    const wrongPieceNonce = await nonceValue(
      issueTransferNonce(app, owner, other.id),
    );

    const refusals = [
      // Champ mal rempli, puis champ inconnu : le formulaire doit savoir quoi corriger.
      [
        http(app)
          .post('/auth/register')
          .send({ email: 'pas-un-email', password: 'Password123!' }),
        400,
        /e-mail/i,
      ],
      [
        http(app)
          .post('/auth/register')
          .send({
            email: `x.${randomUUID()}@certis.test`,
            password: 'Password123!',
            role: 'ISSUER',
          }),
        400,
        /role/,
      ],
      [
        http(app)
          .post('/auth/login')
          .send({ email: owner.email, password: 'wrong-password' }),
        401,
        /mot de passe/i,
      ],
      [mint(app, owner), 403, /émetteur/],
      [http(app).get(`/assets/${watch.id}`).set(auth(stranger)), 404, /compte/],
      [claim(app, stranger, watch.id, wrongPieceNonce), 403, /nouveau/],
    ] as const;

    for (const [request, status, hint] of refusals) {
      const { body } = (await request.expect(status)) as {
        body: { message: unknown };
      };
      expect(typeof body.message).toBe('string');
      const message = body.message as string;
      expect(message).toMatch(hint);
      // Ni anglais de framework, ni jargon interne.
      expect(message).not.toMatch(/\b(must|should|Asset|Nonce|Unauthorized)\b/);
      // Ce qui s'est passé, puis comment corriger : au moins deux propositions.
      expect(message.split(/[.:;] /).length).toBeGreaterThan(1);
    }
  });
});
