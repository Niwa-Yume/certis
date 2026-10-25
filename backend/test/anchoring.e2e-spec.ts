import { INestApplication } from '@nestjs/common';
import { execFile, execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { Server, createServer } from 'http';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { IssuerService } from '../src/issuer/issuer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  Issuer,
  User,
  auth,
  authenticate,
  createApp,
  createIssuer,
  http,
  issueVerifyNonce,
  mint,
  nonceValue,
  registerUser,
  resetDatabase,
} from './helpers';

const run = promisify(execFile);
const BACKEND = join(__dirname, '..');
const VERIFIER = join(BACKEND, '..', 'tools', 'verify', 'verify.mjs');

type Anchor = {
  seq: number;
  hash: string;
  root: string;
  path: unknown[];
  token: string;
};
type Proof = {
  passport: string;
  events: { seq: number; hash: string }[];
  anchors?: Anchor[];
};

/**
 * Autorité d'horodatage RFC 3161 locale, signée par une racine de test : `openssl ts -reply`
 * derrière un serveur HTTP. `untrustedCa` est une autre racine, que le vérificateur doit refuser.
 */
function startFakeTsa() {
  const dir = mkdtempSync(join(tmpdir(), 'certis-tsa-'));
  const ssl = (...args: string[]) =>
    execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
  const root = (name: string) =>
    ssl(
      'req',
      '-x509',
      '-newkey',
      'ec',
      '-pkeyopt',
      'ec_paramgen_curve:P-256',
      '-nodes',
      '-keyout',
      `${name}.key`,
      '-out',
      `${name}.pem`,
      '-days',
      '2',
      '-subj',
      `/CN=${name}`,
      '-addext',
      'basicConstraints=critical,CA:TRUE',
      '-addext',
      'keyUsage=critical,keyCertSign',
    );
  root('ca');
  root('other-ca');
  writeFileSync(
    join(dir, 'tsa.ext'),
    'extendedKeyUsage=critical,timeStamping\n',
  );
  ssl(
    'req',
    '-newkey',
    'ec',
    '-pkeyopt',
    'ec_paramgen_curve:P-256',
    '-nodes',
    '-keyout',
    'tsa.key',
    '-out',
    'tsa.csr',
    '-subj',
    '/CN=Certis test TSA',
  );
  ssl(
    'x509',
    '-req',
    '-in',
    'tsa.csr',
    '-CA',
    'ca.pem',
    '-CAkey',
    'ca.key',
    '-CAcreateserial',
    '-days',
    '2',
    '-extfile',
    'tsa.ext',
    '-out',
    'tsa.crt',
  );
  writeFileSync(
    join(dir, 'ts.cnf'),
    [
      '[ tsa ]',
      'default_tsa = test',
      '[ test ]',
      `serial = ${join(dir, 'serial')}`,
      `signer_cert = ${join(dir, 'tsa.crt')}`,
      `signer_key = ${join(dir, 'tsa.key')}`,
      'signer_digest = sha256',
      'default_policy = 1.2.3.4.1',
      'digests = sha256',
      'ess_cert_id_chain = no',
      'ess_cert_id_alg = sha256',
      '',
    ].join('\n'),
  );
  writeFileSync(join(dir, 'serial'), '01\n');

  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      writeFileSync(join(dir, 'query.tsq'), Buffer.concat(chunks));
      ssl(
        'ts',
        '-reply',
        '-config',
        'ts.cnf',
        '-queryfile',
        'query.tsq',
        '-out',
        'reply.tsr',
      );
      res.setHeader('Content-Type', 'application/timestamp-reply');
      res.end(readFileSync(join(dir, 'reply.tsr')));
    });
  });
  return new Promise<{ server: Server; dir: string; url: string }>((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        server,
        dir,
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/tsr`,
      }),
    ),
  );
}

// S-04 : ancrage de la tête de chaîne chez une autorité d'horodatage tierce (RFC 3161, ADR-0007).
describe('Anchoring the chain heads with a timestamp authority (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tsa: { server: Server; dir: string; url: string };
  let issuer: Issuer;
  let owner: User;
  let watch: { id: string };

  // La commande d'exploitation, asynchrone : elle appelle la TSA servie par ce même processus.
  const anchorNow = () =>
    run(
      'node',
      ['-r', 'ts-node/register/transpile-only', 'scripts/anchor.ts'],
      {
        cwd: BACKEND,
        env: { ...process.env, TSA_URL: tsa.url },
      },
    );
  const service = (note: string) =>
    http(app)
      .post(`/assets/${watch.id}/services`)
      .set(auth(issuer))
      .send({ note })
      .expect(201);
  const history = async () =>
    (
      await http(app)
        .get(`/assets/${watch.id}/history`)
        .set(auth(owner))
        .expect(200)
    ).body as Proof;
  const verifyPublic = async () => {
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));
    return (await authenticate(app, watch.id, nonce).expect(200)).body as {
      valid: boolean;
      proof?: Proof;
    };
  };
  const activeKid = async () =>
    (
      await prisma.issuerKey.findFirstOrThrow({
        where: { issuerId: issuer.issuerId, retiredAt: null },
      })
    ).kid;

  /** Le vérificateur indépendant, avec la racine de la TSA de test, et d'éventuelles preuves antérieures. */
  const verifyOffline = async (
    proof: Proof,
    { ca = 'ca.pem', earlier = [] as Proof[] } = {},
  ) => {
    const dir = mkdtempSync(join(tmpdir(), 'certis-anchor-'));
    const file = (name: string, content: unknown) => {
      writeFileSync(join(dir, name), JSON.stringify(content));
      return join(dir, name);
    };
    const jwks = (await http(app).get('/.well-known/certis-keys').expect(200))
      .body as unknown;
    const args = [
      VERIFIER,
      file('preuve.json', proof),
      file('jwks.json', jwks),
      ...earlier.map((p, i) => file(`ancienne-${i}.json`, p)),
    ];
    try {
      const { stdout } = await run('node', args, {
        env: { ...process.env, CERTIS_TSA_CA: join(tsa.dir, ca) },
      });
      return { code: 0, out: stdout };
    } catch (error) {
      const { code, stdout } = error as { code: number; stdout: string };
      return { code, out: stdout };
    }
  };

  beforeAll(async () => {
    tsa = await startFakeTsa();
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    issuer = await createIssuer(app);
    owner = await registerUser(app);
    watch = (await mint(app, issuer, { ownerEmail: owner.email }).expect(201))
      .body as { id: string };
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
    tsa.server.close();
  });

  it('S-04: the chain head is timestamped once, and the receipt verifies with openssl ts -verify', async () => {
    await anchorNow();
    await anchorNow(); // rien de nouveau : pas de second ancrage

    const { events, anchors } = await history();
    expect(anchors).toHaveLength(1);
    const [anchor] = anchors ?? [];
    expect(anchor).toMatchObject({ seq: 0, hash: events[0].hash });
    expect((await verifyPublic()).proof?.anchors).toEqual(anchors);

    const token = join(tsa.dir, 'token.der');
    writeFileSync(token, Buffer.from(anchor.token, 'base64'));
    const out = execFileSync(
      'openssl',
      [
        'ts',
        '-verify',
        '-token_in',
        '-in',
        token,
        '-digest',
        Buffer.from(anchor.root, 'base64url').toString('hex'),
        '-CAfile',
        join(tsa.dir, 'ca.pem'),
      ],
      { encoding: 'utf8', stdio: 'pipe' },
    );
    expect(out).toMatch(/Verification: OK/);
  });

  it('S-04: the independent verifier checks the anchor, and refuses a timestamp authority it does not trust', async () => {
    await anchorNow();
    const proof = await history();

    expect(await verifyOffline(proof)).toMatchObject({
      code: 0,
      out: expect.stringMatching(/ancr/i),
    });
    expect(await verifyOffline(proof, { ca: 'other-ca.pem' })).toMatchObject({
      code: 1,
      out: expect.stringMatching(/horodatage/),
    });
  });

  it('S-04: a chain rewritten and re-signed after anchoring passes on its own, but not against an earlier proof', async () => {
    await service('Révision complète');
    await anchorNow();
    const earlier = await history();

    // Un administrateur réécrit l'histoire avec des signatures valides, et efface les ancrages.
    await prisma.$executeRawUnsafe('ALTER TABLE "Event" DISABLE TRIGGER USER');
    await prisma.$executeRawUnsafe(
      'DELETE FROM "Event" WHERE "assetId" = $1 AND "seq" = 1',
      watch.id,
    );
    await prisma.$executeRawUnsafe('ALTER TABLE "Event" ENABLE TRIGGER USER');
    await prisma.$executeRawUnsafe('TRUNCATE "AnchorLeaf", "Anchor"');
    await service('Aucune intervention');
    const rewritten = await history();

    expect(await verifyOffline(rewritten)).toMatchObject({ code: 0 });
    expect(
      await verifyOffline(rewritten, { earlier: [earlier] }),
    ).toMatchObject({
      code: 1,
      out: expect.stringMatching(/seq 1/),
    });
  });

  it('S-04: offline, a revoked key still vouches for what was anchored before its revocation', async () => {
    await service('Révision');
    await anchorNow();
    await app.get(IssuerService).revokeKey(await activeKid());

    expect(await verifyOffline(await history())).toMatchObject({ code: 0 });
  });

  it('S-04: offline, a revoked key does not vouch for what was not anchored before its revocation', async () => {
    await anchorNow();
    await service('Révision signée après le dernier ancrage');
    await app.get(IssuerService).revokeKey(await activeKid());

    // Le registre date lui-même ses maillons : il accepte la révision antérieure à la révocation.
    expect(await verifyPublic()).toMatchObject({ valid: true });
    // Hors du registre, la date est déclarée par le signataire : sans ancrage antérieur, elle ne prouve rien.
    expect(await verifyOffline(await history())).toMatchObject({
      code: 1,
      out: expect.stringMatching(/CLÉ RÉVOQUÉE.*seq 1/),
    });
  });
});
