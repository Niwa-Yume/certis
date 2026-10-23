import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type RegisteredUser = {
  id: string;
  accessToken: string;
};

describe('Security critical flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  it('rejects a nonce that is already used', async () => {
    const owner = await registerUser(app);
    const asset = await createAsset(app, owner.accessToken);

    const nonceRes = await request(app.getHttpServer())
      .get(`/assets/${asset.id}/nonce`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const nonceValue = nonceRes.body.nonce as string;

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}/authenticate`)
      .query({ nonce: nonceValue })
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ valid: true });
      });

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}/authenticate`)
      .query({ nonce: nonceValue })
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(410)
      .expect(({ body }) => {
        expect(body.message).toBe('Nonce déjà utilisé');
      });
  });

  it('rejects an expired nonce', async () => {
    const owner = await registerUser(app);
    const asset = await createAsset(app, owner.accessToken);

    const nonceRes = await request(app.getHttpServer())
      .get(`/assets/${asset.id}/nonce`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const nonceValue = nonceRes.body.nonce as string;

    await prisma.authNonce.update({
      where: { nonceValue },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}/authenticate`)
      .query({ nonce: nonceValue })
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(410)
      .expect(({ body }) => {
        expect(body.message).toBe('Nonce expiré');
      });
  });

  it('rolls back transfer history when owner update fails', async () => {
    const owner = await registerUser(app);
    const asset = await createAsset(app, owner.accessToken);
    const unknownOwnerId = randomUUID();

    await request(app.getHttpServer())
      .post(`/assets/${asset.id}/transfer`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ toOwnerId: unknownOwnerId })
      .expect(500);

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}/history`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.ownerId).toBe(owner.id);
      });
  });

  it('transfers an asset with valid signature and audit history', async () => {
    const owner = await registerUser(app);
    const recipient = await registerUser(app);
    const asset = await createAsset(app, owner.accessToken);

    await request(app.getHttpServer())
      .post(`/assets/${asset.id}/transfer`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ toOwnerId: recipient.id })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.ownerId).toBe(recipient.id);
      });

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}/verify`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ valid: true });
      });

    await request(app.getHttpServer())
      .get(`/assets/${asset.id}/history`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].fromOwnerId).toBe(owner.id);
        expect(body[0].toOwnerId).toBe(recipient.id);
      });
  });
});

async function registerUser(app: INestApplication): Promise<RegisteredUser> {
  const email = `user.${randomUUID()}@certis.test`;

  const registerRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'Password123!' })
    .expect(201);

  return {
    id: registerRes.body.user.id,
    accessToken: registerRes.body.accessToken,
  };
}

async function createAsset(app: INestApplication, accessToken: string) {
  const assetRes = await request(app.getHttpServer())
    .post('/assets')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Montre test',
      brand: 'Brand',
      model: 'Model',
      reference: `REF-${randomUUID()}`,
    })
    .expect(201);

  return assetRes.body as { id: string };
}

async function cleanDatabase(prisma: PrismaService) {
  await prisma.transfer.deleteMany();
  await prisma.authNonce.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();
}
