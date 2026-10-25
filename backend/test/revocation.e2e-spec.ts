import { INestApplication } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { IssuerService } from '../src/issuer/issuer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  Issuer,
  Jwk,
  User,
  auth,
  authenticate,
  createIssuer,
  createApp,
  http,
  issueVerifyNonce,
  mint,
  nonceValue,
  registerUser,
  resetDatabase,
  verifyJws,
} from './helpers';

const VERIFIER = join(__dirname, '..', '..', 'tools', 'verify', 'verify.mjs');
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// S-02 : révocation datée d'une clé d'émetteur compromise, distincte du simple retrait.
describe('Issuer key revocation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let issuer: Issuer;
  let owner: User;
  let watch: { id: string };

  // Appelée par son nom : tant que la révocation n'existe pas, l'échec est explicite.
  // Le cast disparaît avec le correctif, qui type la méthode.
  const revoke = (kid: string, at?: Date) =>
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (
      app.get(IssuerService) as unknown as {
        revokeKey(kid: string, at?: Date): Promise<unknown>;
      }
    ).revokeKey(kid, at);
  const activeKid = async () =>
    (
      await prisma.issuerKey.findFirstOrThrow({
        where: { issuerId: issuer.issuerId, retiredAt: null },
      })
    ).kid;
  const jwks = async () =>
    (await http(app).get('/.well-known/certis-keys').expect(200)).body as {
      keys: (Jwk & { revokedAt?: string })[];
    };
  const history = async (id: string) =>
    (await http(app).get(`/assets/${id}/history`).set(auth(owner)).expect(200))
      .body as { passport: string };
  const verifyPublic = async () => {
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));
    return (await authenticate(app, watch.id, nonce).expect(200)).body as {
      valid: boolean;
      problem?: string;
    };
  };

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    issuer = await createIssuer(app);
    owner = await registerUser(app);
    const res = await mint(app, issuer, { ownerEmail: owner.email }).expect(
      201,
    );
    watch = res.body as { id: string };
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('S-02: revoking a key publishes its date and moves the issuer to a new key', async () => {
    const kid = await activeKid();
    await revoke(kid);

    const revoked = (await jwks()).keys.find((k) => k.kid === kid);
    expect(Date.parse(revoked?.revokedAt ?? '')).not.toBeNaN();
    const next = await mint(app, issuer, { ownerEmail: owner.email }).expect(
      201,
    );
    const { passport } = await history((next.body as { id: string }).id);
    expect(verifyJws(passport, (await jwks()).keys).header.kid).not.toBe(kid);
  });

  it('S-02: what the key signed before its revocation stays valid', async () => {
    await revoke(await activeKid());

    expect(await verifyPublic()).toMatchObject({ valid: true });
  });

  it('S-02: a passport signed at or after the revocation date is refused', async () => {
    // La compromission est découverte après coup : la révocation remonte avant l'inscription.
    await revoke(await activeKid(), new Date(Date.now() - 60_000));

    expect(await verifyPublic()).toMatchObject({
      valid: false,
      problem: 'passport',
    });
  });

  it('S-02: an event signed after the revocation date breaks the chain, for Certis and for the independent verifier', async () => {
    await pause(20);
    const compromisedSince = new Date();
    await pause(20);
    await http(app)
      .post(`/assets/${watch.id}/services`)
      .set(auth(issuer))
      .send({ note: 'Révision' })
      .expect(201);
    await revoke(await activeKid(), compromisedSince);

    expect(await verifyPublic()).toMatchObject({
      valid: false,
      problem: 'chain',
    });

    const dir = mkdtempSync(join(tmpdir(), 'certis-revoked-'));
    writeFileSync(join(dir, 'jwks.json'), JSON.stringify(await jwks()));
    writeFileSync(
      join(dir, 'export.json'),
      JSON.stringify(await history(watch.id)),
    );
    let result = { code: 0, out: '' };
    try {
      execFileSync(
        'node',
        [VERIFIER, join(dir, 'export.json'), join(dir, 'jwks.json')],
        {
          encoding: 'utf8',
          stdio: 'pipe',
        },
      );
    } catch (error) {
      const { status, stdout } = error as { status: number; stdout: string };
      result = { code: status, out: stdout };
    }
    expect(result).toMatchObject({
      code: 1,
      out: expect.stringMatching(/révoqu/),
    });
  });
});
