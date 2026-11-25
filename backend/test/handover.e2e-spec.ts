import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';
import {
  Issuer,
  User,
  auth,
  claim,
  createApp,
  createIssuer,
  http,
  issueTransferNonce,
  issueVerifyNonce,
  mint,
  nonceValue,
  registerUser,
  reportStolen,
  resetDatabase,
} from './helpers';

type Invitation = { token: string; expiresAt: string; cardId: string };
type Piece = { id: string; pending?: boolean; trial?: boolean };

// Lot 4 : la maison invite son client, la pièce l'attend, puis la remise l'active (ADR-0017).
describe('Invitation, pending piece and handover (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const invite = (house: User, assetId: string, email: string) =>
    http(app)
      .post(`/assets/${assetId}/invitations`)
      .set(auth(house))
      .send({ email });
  const accept = (token: string, password = 'Password123!') =>
    http(app).post(`/invitations/${token}/accept`).send({ password });
  const collection = async (user: User) =>
    (await http(app).get('/assets').set(auth(user)).expect(200))
      .body as Piece[];
  const stock = async (house: Issuer) =>
    (await mint(app, house)).body as { id: string };

  // Une maison avec une pièce en stock, et l'invitation d'un client qui n'a pas encore de compte.
  async function invited() {
    const house = await createIssuer(app);
    const piece = await stock(house);
    const email = `client.${randomUUID()}@certis.test`;
    const { body } = (await invite(house, piece.id, email).expect(201)) as {
      body: Invitation;
    };
    return { house, piece, email, invitation: body };
  }

  async function signedUp() {
    const ctx = await invited();
    const { body } = (await accept(ctx.invitation.token).expect(201)) as {
      body: { accessToken: string; user: { id: string } };
    };
    const client: User = {
      id: body.user.id,
      email: ctx.email,
      token: body.accessToken,
    };
    return { ...ctx, client };
  }

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => resetDatabase(app));

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('H1: the invitation shows the piece, the house and a masked e-mail, nothing to type but a password', async () => {
    const { invitation, email } = await invited();
    expect(invitation.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { body } = await http(app)
      .get(`/invitations/${invitation.token}`)
      .expect(200);
    expect(body.house).toBe('Atelier test');
    expect(body.piece).toEqual(
      expect.objectContaining({ name: expect.any(String) }),
    );
    expect(body.email).not.toBe(email);
    expect(body.email).toMatch(/^c.*•.*@certis\.test$/);
    // Ni numéro de série, ni passeport, ni identifiant de compte.
    expect(JSON.stringify(body)).not.toMatch(/serial|passport|ownerId/i);
  });

  it('H2: accepting creates the account, without a trial piece; the piece waits, still the house’s', async () => {
    const { client, piece, house } = await signedUp();

    const pieces = await collection(client);
    expect(pieces).toEqual([
      expect.objectContaining({ id: piece.id, pending: true }),
    ]);
    expect(pieces.some((p) => p.trial)).toBe(false);
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: piece.id },
    });
    expect(asset.ownerId).toBe(house.id);

    // Lisible, mais pas encore à lui : ni QR de vérification, ni cession.
    await http(app).get(`/assets/${piece.id}`).set(auth(client)).expect(200);
    await issueVerifyNonce(app, client, piece.id).expect(403);
    await issueTransferNonce(app, client, piece.id).expect(403);
  });

  it('H3: the handover is a reserved change of ownership; the piece becomes the client’s, the chain verifies', async () => {
    const { client, piece, house } = await signedUp();
    const nonce = await nonceValue(
      issueTransferNonce(app, house, piece.id, {
        recipientEmail: client.email,
      }),
    );

    const { body } = await claim(app, client, piece.id, nonce).expect(201);
    expect(body).toEqual(
      expect.objectContaining({ transferred: true, handover: true }),
    );
    expect(await collection(client)).toEqual([
      expect.objectContaining({ id: piece.id, pending: false }),
    ]);
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: piece.id },
    });
    expect(asset.ownerId).toBe(client.id);
    expect((await app.get(RegistryService).verify(asset)).problem).toBeNull();
    // L'e-mail invité ne sert plus : il n'est pas gardé.
    expect(
      await prisma.invitation.count({ where: { assetId: piece.id } }),
    ).toBe(0);
  });

  it('H4: only the house holding the piece can invite', async () => {
    const house = await createIssuer(app);
    const piece = await stock(house);
    const otherHouse = await createIssuer(app);
    const stranger = await registerUser(app);
    const email = `client.${randomUUID()}@certis.test`;

    await invite(stranger, piece.id, email).expect(403);
    await invite(otherHouse, piece.id, email).expect(404);

    // Une pièce déjà remise n'appartient plus au stock : plus d'invitation.
    const owner = await registerUser(app);
    const sold = (await mint(app, house, { ownerEmail: owner.email })).body as {
      id: string;
    };
    await invite(house, sold.id, email).expect(404);
  });

  it('H5: a token is good once, for seven days, and unknown tokens say nothing', async () => {
    const { invitation } = await invited();
    await accept(invitation.token).expect(201);
    await accept(invitation.token).expect(409);

    await http(app)
      .get(`/invitations/${'x'.repeat(43)}`)
      .expect(404);
    await accept('x'.repeat(43)).expect(404);

    const late = await invited();
    await prisma.invitation.updateMany({
      where: { email: late.email },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await http(app).get(`/invitations/${late.invitation.token}`).expect(410);
    await accept(late.invitation.token).expect(410);
  });

  it('H6: an e-mail that already has an account signs in, then links the invitation with its token', async () => {
    const house = await createIssuer(app);
    const piece = await stock(house);
    const existing = await registerUser(app);
    const { body } = (await invite(house, piece.id, existing.email).expect(
      201,
    )) as {
      body: Invitation;
    };

    const refusal = await accept(body.token).expect(409);
    expect(refusal.body.message).toMatch(/connectez-vous/);
    // Sans le jeton, l'e-mail seul ne donne rien (audit run 1, ADR-0019).
    expect(await collection(existing)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: piece.id })]),
    );
    await http(app)
      .post(`/invitations/${body.token}/link`)
      .set(auth(existing))
      .expect(201);
    expect(await collection(existing)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: piece.id, pending: true }),
      ]),
    );
  });

  it('H7: the card tells the public only whether the passport is verified', async () => {
    const { client, piece, house, invitation } = await signedUp();
    const card = () => http(app).get(`/cards/${invitation.cardId}`).expect(200);

    expect((await card()).body).toEqual(
      expect.objectContaining({ state: 'pending', house: 'Atelier test' }),
    );
    const nonce = await nonceValue(
      issueTransferNonce(app, house, piece.id, {
        recipientEmail: client.email,
      }),
    );
    await claim(app, client, piece.id, nonce).expect(201);
    expect((await card()).body.state).toBe('verified');

    await reportStolen(app, client, piece.id).expect(201);
    const stolen = (await card()).body;
    expect(stolen.state).toBe('stolen');
    expect(stolen.stolenAt).toEqual(expect.any(String));
    // Rien sur le propriétaire ni sur l'histoire : le reste se partage, par le propriétaire.
    expect(JSON.stringify(stolen)).not.toMatch(
      /owner|provenance|email|serial/i,
    );

    await http(app)
      .get(`/cards/${'x'.repeat(22)}`)
      .expect(404);
  });
});
