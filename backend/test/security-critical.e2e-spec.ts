import { INestApplication } from '@nestjs/common';
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
  swapSignatures,
} from './helpers';

describe('Verification and transfer flows (e2e)', () => {
  let app: INestApplication;
  let owner: User;
  let recipient: User;
  let watch: { id: string };

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    owner = await registerUser(app);
    recipient = await registerUser(app);
    watch = await createAsset(app, owner);
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('rejects a verification nonce that is already used', async () => {
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));

    await authenticate(app, watch.id, nonce, owner)
      .expect(200)
      .expect(({ body }) => expect(body.valid).toBe(true));
    await authenticate(app, watch.id, nonce, owner)
      .expect(410)
      .expect(({ body }) => expect(body.message).toBe('Nonce déjà utilisé'));
  });

  it('rejects an expired nonce', async () => {
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));
    await app.get(PrismaService).authNonce.update({
      where: { nonceValue: nonce },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await authenticate(app, watch.id, nonce, owner)
      .expect(410)
      .expect(({ body }) => expect(body.message).toBe('Nonce expiré'));
  });

  it('transfers a watch when the recipient claims the offer', async () => {
    const nonce = await nonceValue(issueTransferNonce(app, owner, watch.id));

    await claim(app, recipient, watch.id, nonce).expect(201);

    expect(await ownerOf(app, watch.id)).toBe(recipient.id);
    await http(app)
      .get(`/assets/${watch.id}/verify`)
      .set(auth(recipient))
      .expect(200)
      .expect(({ body }) => expect(body).toEqual({ valid: true }));
    await http(app)
      .get(`/assets/${watch.id}/history`)
      .set(auth(recipient))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          fromOwnerId: owner.id,
          toOwnerId: recipient.id,
        });
      });
  });

  it('reserves an offer to its designated recipient', async () => {
    const other = await registerUser(app);
    const nonce = await nonceValue(
      issueTransferNonce(app, owner, watch.id, {
        recipientEmail: recipient.email,
      }),
    );

    await claim(app, other, watch.id, nonce).expect(403);
    await claim(app, recipient, watch.id, nonce).expect(201);
  });

  it('refuses an offer to an unknown recipient', async () => {
    await issueTransferNonce(app, owner, watch.id, {
      recipientEmail: 'nobody@certis.test',
    }).expect(404);
  });

  it('shows the buyer the verified piece and its dated provenance, never an identity', async () => {
    const offer = await nonceValue(issueTransferNonce(app, owner, watch.id));
    await claim(app, recipient, watch.id, offer).expect(201);
    const nonce = await nonceValue(issueVerifyNonce(app, recipient, watch.id));

    const { body } = await authenticate(app, watch.id, nonce).expect(200);

    expect(body).toMatchObject({
      valid: true,
      asset: {
        id: watch.id,
        name: 'Montre test',
        brand: 'Brand',
        model: 'Model',
      },
      provenance: [{ event: 'REGISTERED' }, { event: 'TRANSFERRED' }],
      proof: {
        algorithm: 'ECDSA P-256 / SHA-256',
        format: 'JCS (RFC 8785) v1',
      },
    });
    expect(Date.parse(body.verifiedAt)).not.toBeNaN();
    const json = JSON.stringify(body);
    for (const identity of [
      owner.id,
      owner.email,
      recipient.id,
      recipient.email,
    ]) {
      expect(json).not.toContain(identity);
    }
  });

  it('says nothing about a piece whose signature does not match', async () => {
    const twin = await createAsset(app, owner);
    await swapSignatures(app, watch.id, twin.id);
    const nonce = await nonceValue(issueVerifyNonce(app, owner, watch.id));

    await authenticate(app, watch.id, nonce)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ valid: false, verifiedAt: expect.any(String) }),
      );
  });
});
