import { INestApplication } from '@nestjs/common';
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
  mint,
  nonceValue,
  registerUser,
  reportStolen,
  resetDatabase,
} from './helpers';

type Request = {
  id: string;
  status: string;
  owner: string;
  piece: { id: string };
};

// Lot 5 : la relation continue (révision en trois étapes) et le partage choisi (ADR-0018).
describe('Service request and owner-chosen sharing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const requestService = (owner: User, id: string) =>
    http(app).post(`/assets/${id}/service-requests`).set(auth(owner)).send({});
  const queue = async (house: User) =>
    (await http(app).get('/service-requests').set(auth(house)).expect(200))
      .body as Request[];
  const share = (owner: User, id: string, body: object) =>
    http(app).post(`/assets/${id}/shares`).set(auth(owner)).send(body);
  const open = (token: string) => http(app).get(`/shares/${token}`);

  async function owned() {
    const house = await createIssuer(app);
    const owner = await registerUser(app);
    const { id } = (await mint(app, house, { ownerEmail: owner.email }))
      .body as { id: string };
    return { house, owner, id };
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

  it('S1: the owner asks for a service once at a time; the life record shows where it stands', async () => {
    const { owner, id } = await owned();
    const stranger = await registerUser(app);

    await requestService(stranger, id).expect(404);
    await requestService(owner, id).expect(201);
    await requestService(owner, id).expect(409);

    const { body } = await http(app)
      .get(`/assets/${id}`)
      .set(auth(owner))
      .expect(200);
    expect(body.service).toEqual(
      expect.objectContaining({
        status: 'REQUESTED',
        requestedAt: expect.any(String),
      }),
    );
  });

  it('S2: only the house that issued the piece sees the request, with the owner’s e-mail', async () => {
    const { house, owner, id } = await owned();
    const otherHouse: Issuer = await createIssuer(app);
    await requestService(owner, id).expect(201);

    const [request] = await queue(house);
    expect(request).toEqual(
      expect.objectContaining({
        status: 'REQUESTED',
        owner: owner.email,
        piece: expect.objectContaining({ id }),
      }),
    );
    expect(await queue(otherHouse)).toEqual([]);
    await http(app)
      .post(`/service-requests/${request.id}/receive`)
      .set(auth(otherHouse))
      .expect(404);
    await http(app)
      .post(`/service-requests/${request.id}/receive`)
      .set(auth(owner))
      .expect(403);
  });

  it('S3: the house receives the piece, then returns it; the service enters the signed story', async () => {
    const { house, owner, id } = await owned();
    await requestService(owner, id).expect(201);
    const [request] = await queue(house);

    await http(app)
      .post(`/service-requests/${request.id}/return`)
      .set(auth(house))
      .send({ note: 'Trop tôt' })
      .expect(409);
    await http(app)
      .post(`/service-requests/${request.id}/receive`)
      .set(auth(house))
      .expect(201);
    const note = 'Révision complète, étanchéité contrôlée';
    await http(app)
      .post(`/service-requests/${request.id}/return`)
      .set(auth(house))
      .send({ note })
      .expect(201);
    await http(app)
      .post(`/service-requests/${request.id}/return`)
      .set(auth(house))
      .send({ note })
      .expect(409);

    const { body } = await http(app)
      .get(`/assets/${id}`)
      .set(auth(owner))
      .expect(200);
    expect(body.service.status).toBe('RETURNED');
    expect(body.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'SERVICE', note }),
      ]),
    );
    const asset = await prisma.asset.findUniqueOrThrow({ where: { id } });
    expect((await app.get(RegistryService).verify(asset)).problem).toBeNull();
    // Une nouvelle demande redevient possible.
    await requestService(owner, id).expect(201);
  });

  it('S4: a piece reported stolen cannot be sent for service', async () => {
    const { owner, id } = await owned();
    await reportStolen(app, owner, id).expect(201);
    await requestService(owner, id).expect(423);
  });

  it('P1: the owner chooses the duration and whether the story is shown', async () => {
    const { owner, id } = await owned();

    const plain = (
      await share(owner, id, { hours: 24, history: false }).expect(201)
    ).body as { token: string };
    expect(plain.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const discreet = (await open(plain.token).expect(200)).body;
    expect(discreet).toEqual(
      expect.objectContaining({ valid: true, status: 'ACTIVE' }),
    );
    expect(discreet.provenance).toBeUndefined();
    expect(discreet.proof).toBeUndefined();

    const full = (
      await share(owner, id, { hours: 1, history: true }).expect(201)
    ).body as { token: string };
    const story = (await open(full.token).expect(200)).body;
    expect(story.provenance).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'MINT' })]),
    );
    // Ni l'e-mail ni l'identifiant du propriétaire, avec ou sans histoire.
    expect(JSON.stringify(story)).not.toContain(owner.email);
    expect(JSON.stringify(story)).not.toContain(owner.id);

    await share(owner, id, { hours: 5, history: false }).expect(400);
  });

  it('P2: nothing is shared without the owner, and unknown links say nothing', async () => {
    const { id } = await owned();
    const stranger = await registerUser(app);
    await share(stranger, id, { hours: 24, history: true }).expect(404);
    await open('x'.repeat(43)).expect(404);
  });

  it('P3: a share ends when the owner stops it, when it expires, or when the piece changes hands', async () => {
    const { owner, id } = await owned();
    const create = async () =>
      (await share(owner, id, { hours: 24, history: true }).expect(201))
        .body as { token: string; id: string };

    const stopped = await create();
    await http(app)
      .delete(`/assets/${id}/shares/${stopped.id}`)
      .set(auth(owner))
      .expect(200);
    await open(stopped.token).expect(410);

    const late = await create();
    await prisma.share.update({
      where: { id: late.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await open(late.token).expect(410);

    const sold = await create();
    const buyer = await registerUser(app);
    const nonce = await nonceValue(issueTransferNonce(app, owner, id));
    await claim(app, buyer, id, nonce).expect(201);
    await open(sold.token).expect(410);
  });
});
