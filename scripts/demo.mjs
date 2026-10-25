// Cycle de vie d'une pièce, de l'atelier au vol, joué contre l'API (P5-01).
//
//   npm run demo          toutes les étapes, l'une après l'autre
//   npm run demo -- 6     les étapes 1 à 5 en silence sur une pièce neuve, puis la 6 en détail
//   npm run demo -- next  l'étape suivante, sur la même pièce que l'appel précédent (démo en direct)
//   npm run demo -- next 4  jusqu'à l'étape 4 sur cette même pièce, par exemple si la 3 s'est faite dans l'interface
//
// Chaque étape est donc rejouable seule : c'est le plan B de la démonstration si l'interface,
// le réseau ou un téléphone font défaut (docs/DEMO_SCRIPT.md). Aucune dépendance, Node 20 ou plus.
// Autre instance : API_URL=https://… WEB_URL=https://… DEMO_ISSUER_EMAIL=… DEMO_ISSUER_PASSWORD=… npm run demo
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:3001';
// Par l'IP du réseau local : les liens imprimés s'ouvrent aussi sur le téléphone de l'acheteur.
const LAN = Object.values(networkInterfaces()).flat().find((net) => net?.family === 'IPv4' && !net.internal)?.address;
const WEB = process.env.WEB_URL ?? `http://${LAN ?? 'localhost'}:8090`;
const PASSWORD = 'Demo2026!piece'; // comptes de démonstration uniquement
const ISSUER = {
  email: process.env.DEMO_ISSUER_EMAIL ?? 'atelier@certis.demo',
  password: process.env.DEMO_ISSUER_PASSWORD ?? 'Atelier2026!', // backend/prisma/seed.ts
};
const PEOPLE = {
  revendeur: 'revendeur@certis.demo',
  collectionA: 'collection-a@certis.demo',
  collectionB: 'collection-b@certis.demo',
  tiers: 'tiers@certis.demo',
};

// ── Affichage ─────────────────────────────────────────────────────────────
let quiet = false;
const say = (text = '') => !quiet && console.log(text);
const fact = (label, value) => say(`   ${label.padEnd(26)} ${value}`);
const short = (value) => `${String(value).slice(0, 14)}…`;

// ── API ───────────────────────────────────────────────────────────────────
async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function must(method, path, options) {
  const { status, data } = await call(method, path, options);
  if (status >= 300) throw new Error(`${method} ${path} → ${status} ${data.message ?? ''}`);
  return data;
}

// Jetons gardés une heure hors du dépôt : la connexion est limitée à 10 par minute,
// et les répétitions enchaînent les étapes.
const CACHE = join(tmpdir(), 'certis-demo-tokens.json');
// La pièce en cours et ce qu'il faut pour continuer son histoire (`next`).
const STATE = join(tmpdir(), 'certis-demo-state.json');
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

async function account(email, password = PASSWORD) {
  const key = `${API} ${email}`;
  const cached = cache[key];
  // Un jeton gardé peut avoir été invalidé (base remise à zéro, autre secret) : on le teste.
  const fresh = cached && JSON.parse(Buffer.from(cached.split('.')[1], 'base64url')).exp * 1000 > Date.now() + 60_000;
  if (fresh && (await call('GET', '/auth/me', { token: cached })).status === 200) {
    return { email, token: cached };
  }
  let res = await call('POST', '/auth/login', { body: { email, password } });
  if (res.status === 401 && password === PASSWORD) {
    res = await call('POST', '/auth/register', { body: { email, password } });
  }
  if (!res.data.accessToken) throw new Error(`Connexion impossible pour ${email} (${res.status} ${res.data.message ?? ''})`);
  cache[key] = res.data.accessToken;
  writeFileSync(CACHE, JSON.stringify(cache));
  return { email, token: res.data.accessToken };
}

const offer = (from, id, to) =>
  must('POST', `/assets/${id}/transfer-offers`, { token: from.token, body: to ? { recipientEmail: to.email } : {} });
const verifyNonce = (owner, id) => must('POST', `/assets/${id}/verifications`, { token: owner.token });

// ── Les étapes ────────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Émission',
    pitch: 'L’atelier examine la pièce, l’inscrit au registre et signe son passeport avec sa propre clé.',
    async run(s) {
      s.serial = `DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
      const piece = await must('POST', '/assets', {
        token: s.issuer.token,
        body: {
          name: 'Carrera Calibre S', brand: 'TAG Heuer', model: 'Carrera', reference: 'CV7A12.BA0795',
          serial: s.serial, movement: 'TAG Heuer Calibre S', case: 'Acier, 43 mm, lunette tachymètre',
          dial: 'Noir', bracelet: 'Acier', ownerEmail: s.revendeur.email,
          imageUrl: '/public/watches/carrera.webp', imageCutout: true,
        },
      });
      s.id = piece.id;
      const { passport } = await must('GET', `/assets/${s.id}/history`, { token: s.revendeur.token });
      const header = JSON.parse(Buffer.from(passport.split('.')[0], 'base64url'));
      fact('Pièce', `${piece.brand} ${piece.name} · ${piece.reference}`);
      fact('Remise à', s.revendeur.email);
      fact('Passeport', `JWS ES256, clé de l’émetteur ${short(header.kid)}`);
      fact('Numéro de série', `${s.serial} (seule son empreinte est conservée)`);
    },
  },
  {
    title: 'Vente',
    pitch: 'Le revendeur cède la pièce à la collection A : l’offre est réservée à son e-mail, personne d’autre ne peut l’accepter.',
    async run(s) {
      const { nonce } = await offer(s.revendeur, s.id, s.collectionA);
      const intrus = await call('POST', `/assets/${s.id}/claim`, { token: s.tiers.token, body: { nonce } });
      await must('POST', `/assets/${s.id}/claim`, { token: s.collectionA.token, body: { nonce } });
      fact('Un tiers tente', `${intrus.status} · ${intrus.data.message}`);
      fact('La collection A accepte', `propriétaire : ${s.collectionA.email}`);
    },
  },
  {
    title: 'Vérification en maison de ventes',
    pitch: 'La maison de ventes scanne le QR que présente la collection A, sans compte, puis compare le numéro gravé.',
    async run(s) {
      const { nonce } = await verifyNonce(s.collectionA, s.id);
      const report = await must('POST', `/assets/${s.id}/authenticate`, { body: { nonce } });
      const match = await must('POST', `/assets/${s.id}/serial-check`, { body: { nonce, serial: s.serial } });
      const wrong = await must('POST', `/assets/${s.id}/serial-check`, { body: { nonce, serial: 'DEMO-0000' } });
      const replay = await call('POST', `/assets/${s.id}/authenticate`, { body: { nonce } });
      fact('Résultat', report.valid ? `AUTHENTIQUE, émise par ${report.passport.issuer.name}` : `refusé (${report.problem})`);
      fact('Provenance', report.provenance.map((e) => e.type).join(' → '));
      fact('Numéro gravé', `${s.serial} : ${match.match ? 'correspond' : 'ne correspond pas'} · DEMO-0000 : ${wrong.match ? 'correspond' : 'ne correspond pas'}`);
      fact('Même QR rejoué', `${replay.status} · ${replay.data.message}`);
      const fresh = await verifyNonce(s.collectionA, s.id);
      fact('Rapport à ouvrir', `${WEB}/verify?id=${s.id}&nonce=${fresh.nonce} (60 s)`);
    },
  },
  {
    title: 'Révision',
    pitch: 'La pièce revient à l’atelier : la révision s’inscrit dans la chaîne, signée par l’émetteur.',
    async run(s) {
      await must('POST', `/assets/${s.id}/services`, { token: s.issuer.token, body: { note: 'Révision complète, étanchéité contrôlée' } });
      const { events } = await must('GET', `/assets/${s.id}/history`, { token: s.collectionA.token });
      const last = events.at(-1);
      fact('Maillon ajouté', `seq ${last.seq} · ${last.type} · ${last.data.note}`);
      fact('Chaîné à', short(last.prevHash));
    },
  },
  {
    title: 'Revente',
    pitch: 'La collection A revend la pièce à la collection B : le passeport ne change pas, la cession devient un maillon signé par Certis.',
    async run(s) {
      const { nonce } = await offer(s.collectionA, s.id, s.collectionB);
      await must('POST', `/assets/${s.id}/claim`, { token: s.collectionB.token, body: { nonce } });
      const piece = await must('GET', `/assets/${s.id}`, { token: s.collectionB.token });
      fact('Nouveau propriétaire', s.collectionB.email);
      fact('Sa provenance', piece.provenance.map((e) => (e.you ? `${e.type} (vous)` : e.type)).join(' → '));
      const old = await call('GET', `/assets/${s.id}`, { token: s.collectionA.token });
      fact('La collection A', `${old.status} : elle ne voit plus la pièce`);
    },
  },
  {
    title: 'Vol',
    pitch: 'La pièce est volée. La collection B le déclare : plus aucune cession possible, et tout acheteur qui la vérifie est alerté.',
    async run(s) {
      // Un QR de cession affiché avant le vol, et photographié par un tiers (étape 7).
      s.photographed = (await offer(s.collectionB, s.id)).nonce;
      await must('POST', `/assets/${s.id}/stolen`, { token: s.collectionB.token });
      const { nonce } = await verifyNonce(s.collectionB, s.id);
      const report = await must('POST', `/assets/${s.id}/authenticate`, { body: { nonce } });
      fact('Déclarée volée par', s.collectionB.email);
      fact('Vérification publique', `${report.valid ? 'certificat authentique' : 'certificat refusé'}, statut ${report.status}`);
      const fresh = await verifyNonce(s.collectionB, s.id);
      fact('Alerte à ouvrir', `${WEB}/verify?id=${s.id}&nonce=${fresh.nonce} (60 s)`);
    },
  },
  {
    title: 'Fraude',
    pitch: 'Un tiers tente de s’approprier la pièce par trois chemins. Les trois sont refusés, avec la raison.',
    async run(s) {
      const photo = await call('POST', `/assets/${s.id}/claim`, { token: s.tiers.token, body: { nonce: s.photographed } });
      const ownQr = await call('POST', `/assets/${s.id}/transfer-offers`, { token: s.tiers.token, body: {} });
      const unlock = await call('POST', `/assets/${s.id}/recovered`, { token: s.tiers.token });
      fact('QR photographié', `${photo.status} · ${photo.data.message}`);
      fact('Son propre QR de cession', `${ownQr.status} · ${ownQr.data.message}`);
      fact('Lever l’alerte lui-même', `${unlock.status} · réservé au propriétaire en titre`);
    },
  },
  {
    title: 'Preuve indépendante',
    pitch: 'Un expert revérifie tout sans Certis : la clé publique, le fichier de preuve et un outil libre suffisent.',
    async run(s) {
      // En local, on ancre tout de suite au lieu d'attendre le passage des 10 minutes (ADR-0007).
      if (new URL(API).hostname === 'localhost') {
        try {
          const anchored = execFileSync('npm', ['--prefix', join(import.meta.dirname, '..', 'backend'), 'run', '-s', 'registry:anchor'], { encoding: 'utf8', stdio: 'pipe' });
          fact('Ancrage', anchored.trim());
        } catch {
          fact('Ancrage', 'autorité d’horodatage injoignable : l’API réessaiera dans 10 minutes');
        }
      }
      const dir = tmpdir();
      const proof = join(dir, `certis-preuve-${s.id}.json`);
      writeFileSync(proof, JSON.stringify(await must('GET', `/assets/${s.id}/history`, { token: s.collectionB.token })));
      const output = execFileSync('node', [join(import.meta.dirname, '..', 'tools', 'verify', 'verify.mjs'), proof, `${API}/.well-known/certis-keys`], { encoding: 'utf8' });
      say(output.replace(/^/gm, '   ').trimEnd());
      fact('Fichier de preuve', proof);
    },
  },
];

async function main() {
  const arg = process.argv[2];
  const saved = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;
  if (arg === 'next') {
    if (!saved || saved.api !== API || saved.step >= STEPS.length) {
      console.error('Aucune histoire en cours : commencez par « npm run demo -- 1 » (ou un autre numéro).');
      process.exitCode = 2;
      return;
    }
  }
  const target = arg === 'next' ? Number(process.argv[3] ?? saved.step + 1) : arg ? Number(arg) : STEPS.length;
  if (!Number.isInteger(target) || target < 1 || target > STEPS.length) {
    console.error(`Usage : npm run demo [-- <étape 1 à ${STEPS.length}>]`);
    STEPS.forEach((step, i) => console.error(`  ${i + 1}. ${step.title}`));
    process.exitCode = 2;
    return;
  }
  const s = {
    issuer: await account(ISSUER.email, ISSUER.password),
    ...Object.fromEntries(await Promise.all(Object.entries(PEOPLE).map(async ([role, email]) => [role, await account(email)]))),
  };
  if (arg === 'next' && !(target > saved.step)) {
    console.error(`L'histoire en cours est déjà à l'étape ${saved.step} : choisissez une étape suivante.`);
    process.exitCode = 2;
    return;
  }
  const first = arg === 'next' ? saved.step + 1 : 1;
  if (arg === 'next') Object.assign(s, saved.piece);
  for (const [i, step] of STEPS.entries()) {
    const n = i + 1;
    if (n < first) continue;
    if (n > target) break;
    // Sans numéro : tout en détail. Avec un numéro : les étapes précédentes préparent la pièce.
    quiet = Boolean(arg) && n < target;
    if (quiet && n === 1) console.log(`Préparation : étapes 1 à ${target - 1} sur une pièce neuve…`);
    say(`\n${n}. ${step.title.toUpperCase()}\n   ${step.pitch}\n`);
    await step.run(s);
  }
  quiet = false;
  const { id, serial, photographed } = s;
  writeFileSync(STATE, JSON.stringify({ api: API, step: target, piece: { id, serial, photographed } }));
  say(`\nPièce ${s.id}${target < STEPS.length ? ` · suite : npm run demo -- next (étape ${target + 1}, ${STEPS[target].title.toLowerCase()})` : ''}`);
  say(`Numéro de série gravé : ${s.serial}`);
  say(`Pour continuer dans l’interface (${WEB}) : mot de passe des comptes de démo « ${PASSWORD} », émetteur ${ISSUER.email}.`);
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}`);
  console.error(`API attendue sur ${API} : « npm run dev » est-il lancé ? (Instance distante : API_URL=…)`);
  process.exitCode = 1;
});
