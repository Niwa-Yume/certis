// `npm run dev` : base Docker → dépendances → backend/.env → migrations → seed → API (3001) + web (8090).
// Idempotent : relancer ne réinstalle rien et ne réécrit pas les données.
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });

run('docker compose up -d --wait');
for (const dir of ['backend', 'mobile']) {
  if (!existsSync(`${dir}/node_modules`)) run('npm ci', dir);
}

const secrets = execSync('node scripts/generate-secrets.mjs', { cwd: 'backend' }).toString().trim().split('\n');
const envCreated = !existsSync('backend/.env');
if (envCreated) {
  const defaults = readFileSync('backend/.env.example', 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .join('\n');
  writeFileSync('backend/.env', `${defaults}\n${secrets.join('\n')}\n`);
  console.log('backend/.env créé avec des secrets neufs.');
} else {
  // Un secret ajouté par une phase ultérieure (ex. KEY_ENCRYPTION_KEY) : complété sans toucher aux autres.
  const env = readFileSync('backend/.env', 'utf8');
  const missing = secrets.filter((line) => !new RegExp(`^${line.split('=')[0]}=`, 'm').test(env));
  if (missing.length) {
    writeFileSync('backend/.env', `${env.trimEnd()}\n${missing.join('\n')}\n`);
    console.log(`backend/.env complété : ${missing.map((line) => line.split('=')[0]).join(', ')}.`);
  }
}

run('npx prisma generate', 'backend');
run('npx prisma migrate deploy', 'backend');
// Nouvelle clé de signature : les anciennes signatures ne vérifieraient plus, on repart de zéro.
run(envCreated ? 'npm run db:reset' : 'npx prisma db seed', 'backend');

const children = [
  // PORT forcé : le mobile appelle l'API sur 3001 (mobile/lib/api.ts), même si le shell exporte un autre PORT.
  spawn('npm', ['run', 'start:dev'], {
    cwd: 'backend',
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, PORT: '3001' },
  }),
  spawn('npx', ['expo', 'start', '--web', '--port', '8090'], { cwd: 'mobile', stdio: 'inherit' }),
];
const stopAll = () => children.forEach((child) => child.kill());
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
children.forEach((child) => child.on('exit', stopAll));
