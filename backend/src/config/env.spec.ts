import { generateKeyPairSync } from 'crypto';
import { readEnv } from './env';

const pem = (namedCurve: string) =>
  generateKeyPairSync('ec', { namedCurve })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  ECDSA_PRIVATE_KEY: pem('P-256'),
};

describe('readEnv', () => {
  it('accepts a complete configuration, including a single-line PEM', () => {
    expect(readEnv(valid).signingKey.asymmetricKeyType).toBe('ec');
    expect(() =>
      readEnv({
        ...valid,
        ECDSA_PRIVATE_KEY: valid.ECDSA_PRIVATE_KEY.replace(/\n/g, '\\n'),
      }),
    ).not.toThrow();
  });

  it.each([
    ['missing JWT_SECRET', { JWT_SECRET: undefined }, /JWT_SECRET/],
    [
      'short JWT_SECRET (the old public fallback)',
      { JWT_SECRET: 'dev-jwt-secret-change-me' },
      /JWT_SECRET/,
    ],
    [
      'missing ECDSA_PRIVATE_KEY',
      { ECDSA_PRIVATE_KEY: undefined },
      /ECDSA_PRIVATE_KEY/,
    ],
    ['non P-256 key', { ECDSA_PRIVATE_KEY: pem('secp384r1') }, /P-256/],
    [
      'non postgres DATABASE_URL',
      { DATABASE_URL: 'mysql://x' },
      /DATABASE_URL/,
    ],
    ['negative TRUST_PROXY_HOPS', { TRUST_PROXY_HOPS: '-1' }, /TRUST_PROXY/],
  ])('rejects %s', (_label, override, message) => {
    expect(() => readEnv({ ...valid, ...override })).toThrow(message);
  });

  it('defaults to closed network settings: local origins only, no trusted proxy', () => {
    const env = readEnv(valid);
    expect(env.corsOrigins).toEqual([
      'http://localhost:8090',
      'http://localhost:8081',
    ]);
    expect(env.trustProxyHops).toBe(0);
    expect(
      readEnv({
        ...valid,
        CORS_ORIGINS: 'https://a.example, https://b.example',
      }).corsOrigins,
    ).toEqual(['https://a.example', 'https://b.example']);
  });
});
