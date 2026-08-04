import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { generateKeyPairSync } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    ensureCryptoEnv();
    process.env.DATABASE_URL ??= 'postgresql://certis:certis_password@localhost:5432/certis_db';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});

function ensureCryptoEnv() {
  if (process.env.ECDSA_PRIVATE_KEY && process.env.ECDSA_PUBLIC_KEY) {
    return;
  }

  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  process.env.ECDSA_PRIVATE_KEY = privateKey;
  process.env.ECDSA_PUBLIC_KEY = publicKey;
}

