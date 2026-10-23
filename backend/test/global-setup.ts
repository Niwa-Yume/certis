import { generateKeyPairSync, randomBytes } from 'crypto';

// Secrets jetables pour les e2e : l'app n'a plus de fallback, elle exige une config complète.
export default function globalSetup() {
  process.env.DATABASE_URL ??=
    'postgresql://certis:certis_password@localhost:5432/certis_db';
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.ECDSA_PRIVATE_KEY = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();
}
