// Affiche des secrets neufs au format .env : à coller dans backend/.env (dev) ou dans le dashboard Render (prod).
// ECDSA P-256 : la plateforme signe, n'importe qui peut vérifier avec la clé publique (dérivée de la privée).
import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

console.log(`JWT_SECRET="${randomBytes(48).toString('base64url')}"`);
console.log(`ECDSA_PRIVATE_KEY="${pem.trim().replace(/\n/g, '\\n')}"`);
