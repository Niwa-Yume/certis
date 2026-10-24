// Vidéo de la démonstration (P5-04) : le parcours de docs/DEMO_SCRIPT.md, filmé dans Chrome.
// Les étapes qui changent l'état passent par `npm run demo`, comme en direct ; la page montre le reste.
//
// Prérequis : `npm run dev` et Google Chrome. Depuis un dossier où Playwright est installé :
//   npm i playwright@1.64.1 && node <chemin>/docs/demo/record.mjs
// Puis, pour le README : voir les commandes ffmpeg en fin de fichier.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(`${process.cwd()}/`)('playwright');
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const API = 'http://localhost:3001';
const WEB = 'http://localhost:8090';
const SIZE = { width: 1280, height: 800 };

const demo = (...args) => execFileSync('node', ['scripts/demo.mjs', ...args], { cwd: ROOT, encoding: 'utf8' });
const post = async (path, body, token) =>
  (await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  })).json();
const login = async (email) => (await post('/auth/login', { email, password: 'Demo2026!piece' })).accessToken;

// Préparation hors caméra : la pièce est inscrite par l'atelier et vendue à la collection A.
const prepared = demo('2');
const id = prepared.match(/Pièce ([0-9a-f-]{36})/)[1];
const serial = prepared.match(/Numéro de série gravé : (\S+)/)[1];
const tokens = { a: await login('collection-a@certis.demo'), b: await login('collection-b@certis.demo') };

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
const page = await context.newPage();

// Sous-titre incrusté dans la page filmée, pas dans l'application.
async function caption(text) {
  await page.evaluate((t) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      el.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:9999;max-width:560px;padding:12px 18px;'
        + 'background:#0B1430;color:#F4F1EA;font:500 17px/1.4 Geist,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}
async function as(token, path) {
  await page.goto(WEB);
  await page.evaluate((t) => (t ? localStorage.setItem('certis_access_token', t) : localStorage.clear()), token);
  await page.goto(WEB + path, { waitUntil: 'networkidle' });
}
const pause = (ms) => page.waitForTimeout(ms);
const scrollReport = (top) => page.evaluate((y) => { document.getElementById('report').scrollTop = y; }, top);

await as(tokens.a, `/watch/${id}`);
await caption('1–2 · L’atelier a inscrit la pièce et signé son passeport ; la collection A l’a achetée.');
await pause(3500);
await page.getByRole('tab', { name: 'Provenance' }).click();
await pause(2500);

const { nonce } = await post(`/assets/${id}/verifications`, {}, tokens.a);
await as(null, `/verify?id=${id}&nonce=${nonce}`);
await caption('3 · Une maison de ventes scanne le QR : sans compte, il ne sert qu’une fois.');
await pause(4500);
await scrollReport(820);
await page.getByLabel('Numéro gravé sur la pièce').fill(serial.toLowerCase().replace('-', ' '));
await page.getByRole('button', { name: 'Comparer' }).click();
await caption('Le numéro gravé est comparé à l’empreinte du passeport : il n’est stocké nulle part.');
await pause(3000);
await scrollReport(1700);
await caption('Quatre couches signées : la pièce, le propriétaire, l’historique, la signature.');
await pause(3000);
await scrollReport(2700);
await caption('La provenance, chaînée et datée.');
await pause(2500);

demo('next', '5'); // 4 : révision par l'atelier · 5 : revente à la collection B
await as(tokens.b, `/watch/${id}`);
await page.getByRole('tab', { name: 'Provenance' }).click();
await caption('4–5 · Révision par l’atelier, puis revente : chaque événement est un maillon signé.');
await pause(3500);

demo('next'); // 6 : vol
await as(tokens.b, `/watch/${id}`);
await caption('6 · La pièce est volée : la collection B la déclare, plus aucune cession possible.');
await pause(3000);
const stolen = await post(`/assets/${id}/verifications`, {}, tokens.b);
await as(null, `/verify?id=${id}&nonce=${stolen.nonce}`);
await caption('Tout acheteur qui la vérifie est alerté.');
await pause(3500);

await context.close();
await browser.close();
renameSync(await page.video().path(), `${OUT}certis-demo.webm`);
console.log(`Vidéo : ${OUT}certis-demo.webm`);

// Pour le README (ffmpeg) :
//   ffmpeg -y -i certis-demo.webm -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart certis-demo.mp4
//   ffmpeg -y -i certis-demo.webm -vf "fps=6,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" certis-demo.gif
//   rm certis-demo.webm
