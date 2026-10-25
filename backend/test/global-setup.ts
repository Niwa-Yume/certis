import { execSync } from 'child_process';
import { generateKeyPairSync, randomBytes } from 'crypto';
import { Client } from 'pg';

// Les e2e vident la base : ils ne tournent que sur une base dont le nom finit par _test.
export default async function globalSetup() {
  const url = new URL(
    process.env.TEST_DATABASE_URL ??
      'postgresql://certis:certis_password@localhost:5432/certis_test',
  );
  const dbName = url.pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refus : les e2e exigent une base *_test (reçu "${dbName}")`,
    );
  }

  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  const { rowCount } = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  process.env.DATABASE_URL = url.href;
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });

  // Pas d'appel réseau : la suite d'ancrage sert sa propre autorité d'horodatage.
  process.env.TSA_URL = '';

  // Secrets jetables : l'app n'a plus de fallback, elle exige une config complète.
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.KEY_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  process.env.ECDSA_PRIVATE_KEY = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();
}
