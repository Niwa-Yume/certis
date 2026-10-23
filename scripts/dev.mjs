// `npm run dev` : base Docker → dépendances → backend/.env → migrations → seed → API (3001) + web (8090).
// Idempotent : relancer ne réinstalle rien et ne réécrit pas les données.
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });

run('docker compose up -d --wait');
for (const dir of ['backend', 'mobile']) {
  if (!existsSync(`${dir}/node_modules`)) run('npm ci', dir);
}

const envCreated = !existsSync('backend/.env');
if (envCreated) {
  const defaults = readFileSync('backend/.env.example', 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .join('\n');
  const secrets = execSync('node scripts/generate-secrets.mjs', { cwd: 'backend' });
  writeFileSync('backend/.env', `${defaults}\n${secrets}`);
  console.log('backend/.env créé avec des secrets neufs.');
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
