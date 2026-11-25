import { INestApplication } from '@nestjs/common';
import {
  Issuer,
  User,
  auth,
  claim,
  createApp,
  createIssuer,
  http,
  issueTransferNonce,
  mint,
  nonceValue,
  registerUser,
  resetDatabase,
} from './helpers';

type Invitation = { token: string };
type Piece = { id: string; pending?: boolean };

// Audit de sécurité, run 1 (ADR-0019) : les deux pistes serveur, rejouées avant correction.
describe('Audit run 1: invitation identity and service lifecycle (e2e)', () => {
  let app: INestApplication;

  const invite = (house: User, assetId: string, email: string) =>
    http(app)
      .post(`/assets/${assetId}/invitations`)
      .set(auth(house))
      .send({ email });
  const collection = async (user: User) =>
    (await http(app).get('/assets').set(auth(user)).expect(200))
      .body as Piece[];

  // Une maison, une pièce en stock, et l'e-mail du client qu'elle va inviter.
  async function stock() {
    const house: Issuer = await createIssuer(app);
    const { id } = (await mint(app, house)).body as { id: string };
    return { house, id };
  }

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(() => resetDatabase(app));

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  it('A1: an account that registered the invited e-mail without the token sees no awaiting piece', async () => {
    const { house, id } = await stock();
    const squatter = await registerUser(app);
    await invite(house, id, squatter.email).expect(201);

    expect(await collection(squatter)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );
    await http(app).get(`/assets/${id}`).set(auth(squatter)).expect(404);
  });

  it('A2: the handover cannot be reserved to an account that did not accept the invitation', async () => {
    const { house, id } = await stock();
    const squatter = await registerUser(app);
    await invite(house, id, squatter.email).expect(201);

    const refused = await issueTransferNonce(app, house, id, {
      recipientEmail: squatter.email,
    }).expect(409);
    expect(refused.body.message).toMatch(/invitation/);
  });

  it('A3: an existing account links the invitation with the token while signed in, and only the invited address can', async () => {
    const { house, id } = await stock();
    const client = await registerUser(app);
    const other = await registerUser(app);
    const { token } = (await invite(house, id, client.email).expect(201))
      .body as Invitation;

    await http(app)
      .post(`/invitations/${token}/link`)
      .set(auth(other))
      .expect(403);
    await http(app)
      .post(`/invitations/${token}/link`)
      .set(auth(client))
      .expect(201);
    expect(await collection(client)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id, pending: true })]),
    );

    // La remise est alors réservée à ce compte, et à lui seul.
    const nonce = await nonceValue(
      issueTransferNonce(app, house, id, { recipientEmail: client.email }),
    );
    await claim(app, client, id, nonce).expect(201);
  });

  it('A4: erasing an account that never accepted does not delete the house’s invitation', async () => {
    const { house, id } = await stock();
    const squatter = await registerUser(app);
    const { token } = (await invite(house, id, squatter.email).expect(201))
      .body as Invitation;

    await http(app)
      .delete('/auth/me')
      .set(auth(squatter))
      .send({ password: 'Password123!' })
      .expect(204);
    await http(app).get(`/invitations/${token}`).expect(200);
  });

  it('S1: after a change of ownership, the new owner can ask for a service and the previous request leaves the house queue', async () => {
    const house = await createIssuer(app);
    const seller = await registerUser(app);
    const buyer = await registerUser(app);
    const { id } = (await mint(app, house, { ownerEmail: seller.email }))
      .body as { id: string };
    await http(app)
      .post(`/assets/${id}/service-requests`)
      .set(auth(seller))
      .send({})
      .expect(201);
    const [stale] = (
      await http(app).get('/service-requests').set(auth(house)).expect(200)
    ).body as { id: string }[];

    const nonce = await nonceValue(issueTransferNonce(app, seller, id));
    await claim(app, buyer, id, nonce).expect(201);

    const queue = (
      await http(app).get('/service-requests').set(auth(house)).expect(200)
    ).body as { owner: string }[];
    expect(queue.map((r) => r.owner)).not.toContain(seller.email);
    await http(app)
      .post(`/service-requests/${stale.id}/receive`)
      .set(auth(house))
      .expect(404);
    await http(app)
      .post(`/assets/${id}/service-requests`)
      .set(auth(buyer))
      .send({})
      .expect(201);
  });
});
