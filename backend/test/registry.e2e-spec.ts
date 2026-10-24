import { INestApplication } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  Issuer,
  Jwk,
  User,
  auth,
  authenticate,
  checkSerial,
  claim,
  createIssuer,
  createApp,
  http,
  issueTransferNonce,
  issueVerifyNonce,
  mint,
  nonceValue,
  registerUser,
  reportRecovered,
  reportStolen,
  resetDatabase,
  verifyJws,
} from './helpers';

const SERIAL = 'DEMO-0417';
const VERIFIER = join(__dirname, '..', '..', 'tools', 'verify', 'verify.mjs');

type Jwks = { keys: Jwk[] };
type ChainEvent = {
  seq: number;
  type: string;
  hash: string;
  prevHash: string | null;
};

// Critères d'acceptation de la Phase 3 (docs/BACKLOG.md, P3-01 à P3-08).
describe('Registry: issuer, passport and event chain (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  describe('without an issuer', () => {
    beforeEach(() => resetDatabase(app));

    it('N3: an owner cannot register a piece', async () => {
      const owner = await registerUser(app);

      // L'exemple de l'audit : n'importe quel compte obtenait une « Nautilus » signée.
      await http(app)
        .post('/assets')
        .set(auth(owner))
        .send({
          name: 'Nautilus',
          brand: 'Patek Philippe',
          model: 'Nautilus',
          reference: '5711/1A-010',
        })
        .expect(403);
    });

    it('N4: the signing keys are public, without their private part', async () => {
      const { body } = await http(app)
        .get('/.well-known/certis-keys')
        .expect(200);
      const { keys } = body as Jwks;

      expect(keys.find((k) => k.issuer === 'certis')).toMatchObject({
        kty: 'EC',
        crv: 'P-256',
        alg: 'ES256',
      });
      expect(keys.every((k) => !('d' in k))).toBe(true);
    });
  });

  describe('with an issuer', () => {
    let issuer: Issuer;
    let owner: User;
    let buyer: User;
    let watch: { id: string };

    const jwks = async () =>
      (await http(app).get('/.well-known/certis-keys').expect(200))
        .body as Jwks;
    const history = async (user: User, id = watch.id) =>
      (await http(app).get(`/assets/${id}/history`).set(auth(user)).expect(200))
        .body as {
        passport: string;
        events: ChainEvent[];
      };
    const sell = async () => {
      const offer = await nonceValue(issueTransferNonce(app, owner, watch.id));
      await claim(app, buyer, watch.id, offer).expect(201);
    };

    beforeEach(async () => {
      await resetDatabase(app);
      issuer = await createIssuer(app);
      owner = await registerUser(app);
      buyer = await registerUser(app);
      const res = await mint(app, issuer, {
        ownerEmail: owner.email,
        serial: SERIAL,
      }).expect(201);
      watch = res.body as { id: string };
    });

    it('N4: the passport verifies with the public keys alone', async () => {
      const { passport } = await history(owner);
      const { ok, payload, jwk } = verifyJws(passport, (await jwks()).keys);

      expect(ok).toBe(true);
      expect(jwk?.issuer).toBe(issuer.issuerId);
      expect(payload?.credentialSubject.id).toBe(watch.id);
      expect(payload?.issuer.id).toBe(issuer.issuerId);
    });

    it('P3-01: a key rotation keeps earlier passports verifiable', async () => {
      const before = (await history(owner)).passport;
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const { IssuerService } = require('../src/issuer/issuer.service');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      await app.get(IssuerService).rotateKey(issuer.issuerId);
      const second = (
        await mint(app, issuer, { ownerEmail: owner.email }).expect(201)
      ).body as { id: string };
      const after = (await history(owner, second.id)).passport;
      const { keys } = await jwks();

      expect(verifyJws(before, keys).ok).toBe(true);
      expect(verifyJws(after, keys).ok).toBe(true);
      expect(verifyJws(after, keys).header.kid).not.toBe(
        verifyJws(before, keys).header.kid,
      );
    });

    it('S10: the serial number is never stored or returned in clear', async () => {
      const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));
      const responses = [
        (await http(app).get(`/assets/${watch.id}`).set(auth(owner))).text,
        (await http(app).get(`/assets/${watch.id}/history`).set(auth(owner)))
          .text,
        (await authenticate(app, watch.id, nonce)).text,
      ];
      const rows = await Promise.all(
        ['Asset', 'Event', 'AuthNonce', 'User'].map((table) =>
          prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`),
        ),
      );

      for (const text of [...responses, JSON.stringify(rows)]) {
        expect(text.toUpperCase()).not.toContain(SERIAL);
      }
    });

    it('S10: a buyer can check the serial a few times, right after a verification', async () => {
      const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));
      await checkSerial(app, watch.id, nonce, SERIAL).expect(403); // pas encore vérifiée
      await authenticate(app, watch.id, nonce).expect(200);

      await checkSerial(app, watch.id, nonce, 'demo 04-17')
        .expect(200)
        .expect(({ body }) => expect(body).toEqual({ match: true }));
      await checkSerial(app, watch.id, nonce, 'DEMO-0418')
        .expect(200)
        .expect(({ body }) => expect(body).toEqual({ match: false }));
      for (let i = 0; i < 3; i++)
        await checkSerial(app, watch.id, nonce, 'X').expect(200);
      await checkSerial(app, watch.id, nonce, SERIAL).expect(429);
    });

    it('S9: every change of hands is chained in the registry', async () => {
      await sell();
      const { events } = await history(buyer);

      expect(events.map((e) => [e.seq, e.type])).toEqual([
        [0, 'MINT'],
        [1, 'TRANSFER'],
      ]);
      expect(events[0].prevHash).toBeNull();
      expect(events[1].prevHash).toBe(events[0].hash);
    });

    it('S9: the database refuses to rewrite or delete an event', async () => {
      await expect(
        prisma.$executeRawUnsafe(`UPDATE "Event" SET "type" = 'SERVICE'`),
      ).rejects.toThrow(/append-only/);
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM "Event"`),
      ).rejects.toThrow(/append-only/);
    });

    it('S9: concurrent changes never fork the chain', async () => {
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map(() => reportStolen(app, owner, watch.id)),
      );
      const { events } = await history(owner);

      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(events.map((e) => e.seq)).toEqual([0, 1]);
    });

    it('P3-06: a stolen piece cannot change hands until it is recovered', async () => {
      const offer = await nonceValue(issueTransferNonce(app, owner, watch.id));
      await reportStolen(app, owner, watch.id).expect(201);

      await claim(app, buyer, watch.id, offer)
        .expect(423)
        .expect(({ body }) => expect(body.message).toMatch(/volée/));
      await issueTransferNonce(app, owner, watch.id).expect(423);

      await reportRecovered(app, owner, watch.id).expect(201);
      await issueTransferNonce(app, owner, watch.id).expect(201);
    });

    it('P3-06: only the owner of record can report a theft', async () => {
      await reportStolen(app, buyer, watch.id).expect(404);
      await reportRecovered(app, owner, watch.id).expect(409); // pas déclarée volée
    });

    it('P3-07: public verification shows the passport, the status and a pseudonymous provenance', async () => {
      await sell();
      await reportStolen(app, buyer, watch.id).expect(201);
      const nonce = await nonceValue(issueVerifyNonce(app, buyer, watch.id));

      const { body } = await authenticate(app, watch.id, nonce).expect(200);

      expect(body).toMatchObject({
        valid: true,
        status: 'STOLEN',
        passport: {
          issuer: { id: issuer.issuerId, name: 'Atelier test' },
          credentialSubject: { id: watch.id },
        },
      });
      expect(
        (body as { provenance: { type: string }[] }).provenance.map(
          (e) => e.type,
        ),
      ).toEqual(['MINT', 'TRANSFER', 'STOLEN_REPORTED']);
      const json = JSON.stringify(body);
      for (const identity of [issuer, owner, buyer].flatMap((u) => [
        u.id,
        u.email,
      ])) {
        expect(json).not.toContain(identity);
      }
    });

    it('P3-07: a registry that disagrees with its chain fails verification', async () => {
      await prisma.asset.update({
        where: { id: watch.id },
        data: { ownerId: buyer.id },
      });
      const nonce = await nonceValue(issueVerifyNonce(app, buyer, watch.id));

      await authenticate(app, watch.id, nonce)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({ valid: false, problem: 'registry' }),
        );
    });

    it('an issuer records a service on its own pieces only', async () => {
      const other = await createIssuer(app, 'Autre atelier');

      await http(app)
        .post(`/assets/${watch.id}/services`)
        .set(auth(other))
        .send({ note: 'Révision' })
        .expect(403);
      await http(app)
        .post(`/assets/${watch.id}/services`)
        .set(auth(issuer))
        .send({ note: 'Révision complète' })
        .expect(201);
      expect((await history(owner)).events.map((e) => e.type)).toEqual([
        'MINT',
        'SERVICE',
      ]);
    });

    it('P3-08: the independent verifier accepts the chain, then flags the first altered link', async () => {
      await sell();
      const dir = mkdtempSync(join(tmpdir(), 'certis-verify-'));
      const jwksFile = join(dir, 'jwks.json');
      const exportFile = join(dir, 'export.json');
      writeFileSync(jwksFile, JSON.stringify(await jwks()));
      const verifyExport = async () => {
        writeFileSync(exportFile, JSON.stringify(await history(buyer)));
        try {
          return {
            code: 0,
            out: execFileSync('node', [VERIFIER, exportFile, jwksFile], {
              encoding: 'utf8',
              stdio: 'pipe',
            }),
          };
        } catch (error) {
          const { status, stdout } = error as {
            status: number;
            stdout: string;
          };
          return { code: status, out: stdout };
        }
      };

      expect(await verifyExport()).toMatchObject({
        code: 0,
        out: expect.stringMatching(/OK/),
      });

      // Un administrateur qui contourne le trigger pour réécrire l'histoire.
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Event" DISABLE TRIGGER USER',
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "Event" SET "at" = '2001-01-01' WHERE "seq" = 1`,
      );
      await prisma.$executeRawUnsafe('ALTER TABLE "Event" ENABLE TRIGGER USER');

      expect(await verifyExport()).toMatchObject({
        code: 1,
        out: expect.stringMatching(/seq 1/),
      });
    });
  });
});
