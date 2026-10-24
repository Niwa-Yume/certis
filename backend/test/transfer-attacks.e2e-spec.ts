import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  User,
  auth,
  authenticate,
  claim,
  createApp,
  createAsset,
  http,
  issueTransferNonce,
  issueVerifyNonce,
  nonceValue,
  ownerOf,
  registerUser,
  resetDatabase,
  swapPassports,
} from './helpers';

// Chaînes d'attaque de docs/AUDIT.md : chaque test décrit le comportement sûr attendu.
describe('Transfer attack chains (e2e)', () => {
  let app: INestApplication;
  let owner: User;
  let attacker: User;
  let watch: { id: string };

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    owner = await registerUser(app);
    attacker = await registerUser(app);
    watch = await createAsset(app, owner);
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('A (S2): only the owner can issue a transfer nonce', async () => {
    await issueTransferNonce(app, attacker, watch.id).expect(403);
  });

  it('B (S3): a nonce issued for another asset cannot claim this one', async () => {
    const own = await createAsset(app, attacker);
    const nonce = await nonceValue(issueTransferNonce(app, attacker, own.id));

    await claim(app, attacker, watch.id, nonce).expect(403);
    expect(await ownerOf(app, watch.id)).toBe(owner.id);
  });

  it('C (S4): a verification QR cannot be replayed as a transfer', async () => {
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));

    await claim(app, attacker, watch.id, nonce).expect(403);
    expect(await ownerOf(app, watch.id)).toBe(owner.id);
  });

  it('D (S5): concurrent claims with one nonce transfer the watch exactly once', async () => {
    const nonce = await nonceValue(issueTransferNonce(app, owner, watch.id));
    const claimants = await Promise.all(
      Array.from({ length: 20 }, () => registerUser(app)),
    );

    const results = await Promise.all(
      claimants.map((user) => claim(app, user, watch.id, nonce)),
    );

    expect(results.filter((res) => res.status === 201)).toHaveLength(1);
    const transfers = await app
      .get(PrismaService)
      .transfer.count({ where: { assetId: watch.id } });
    expect(transfers).toBe(1);
  });

  it('E (S6): a passport cannot be transplanted between identical watches', async () => {
    const twin = { brand: 'Rolex', model: 'Submariner', reference: '126610LN' };
    const a = await createAsset(app, owner, twin);
    const b = await createAsset(app, owner, twin);

    await swapPassports(app, a.id, b.id);

    await http(app)
      .get(`/assets/${a.id}/verify`)
      .set(auth(owner))
      .expect(200)
      .expect(({ body }) => expect(body.valid).toBe(false));
  });

  it.each(['', '/history', '/verify'])(
    'F (S8): another user cannot read /assets/:id%s',
    async (suffix) => {
      await http(app)
        .get(`/assets/${watch.id}${suffix}`)
        .set(auth(attacker))
        .expect(404);
    },
  );

  it('G (S8): the owner cannot claim their own watch', async () => {
    const nonce = await nonceValue(issueTransferNonce(app, owner, watch.id));

    await claim(app, owner, watch.id, nonce).expect(409);
  });

  it('H (N7): ownership cannot be pushed without the recipient consenting', async () => {
    await http(app)
      .post(`/assets/${watch.id}/transfer`)
      .set(auth(owner))
      .send({ toOwnerId: attacker.id })
      .expect(404);
    expect(await ownerOf(app, watch.id)).toBe(owner.id);
  });

  it('I (N8): clients cannot set server-controlled fields', async () => {
    await http(app)
      .post('/assets')
      .set(auth(owner))
      .send({
        id: 'chosen-id',
        status: 'TRANSFERRED',
        name: 'x',
        brand: 'x',
        model: 'x',
        reference: 'x',
      })
      .expect(400);
  });

  it('J (S8): a claim without nonce is a client error, not a 500', async () => {
    await claim(app, attacker, watch.id).expect(400);
  });

  it('K (S7): GET never consumes or creates a nonce', async () => {
    await http(app)
      .get(`/assets/${watch.id}/nonce`)
      .set(auth(owner))
      .expect(404);
    await http(app)
      .get(`/assets/${watch.id}/authenticate`)
      .query({ nonce: randomUUID() })
      .set(auth(owner))
      .expect(404);
  });

  it('L (S8): login is rate limited', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt++) {
      const res = await http(app)
        .post('/auth/login')
        .send({ email: owner.email, password: 'wrong-password' });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('M (N2): a buyer without an account can verify a watch', async () => {
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));

    await authenticate(app, watch.id, nonce)
      .expect(200)
      .expect(({ body }) => expect(body.valid).toBe(true));
  });

  it('N (S8): registration validates its input', async () => {
    await http(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });
});
