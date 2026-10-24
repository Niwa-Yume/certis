// Captures de référence de l'interface (Phase 4), mobile 375 px et desktop 1440 px.
//
// Prérequis : `npm run dev` à la racine (API + web, base de démo fraîchement seedée) et Google Chrome.
// Playwright n'est pas une dépendance du projet : depuis un dossier quelconque,
//   npm i playwright@1.64.1 && node <chemin>/docs/screenshots/capture.mjs
// L'état « non confirmée » exige une signature altérée en base : il n'est pas rejoué ici.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Résolu depuis le dossier courant (là où Playwright est installé), pas depuis ce fichier.
const { chromium } = createRequire(`${process.cwd()}/`)('playwright');

const WEB = 'http://localhost:8090';
const API = 'http://localhost:3001';
const OUT = fileURLToPath(new URL('.', import.meta.url));

const post = async (path, body, token) => {
    const res = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body ?? {}),
    });
    return res.json();
};
// Comptes de démo de backend/prisma/seed.ts.
const julien = (await post('/auth/login', { email: 'julien.castro@certis.local', password: 'ChangeMe123!' })).accessToken;
const pro = (await post('/auth/login', { email: 'certis@pro.com', password: '1234567' })).accessToken;
const [carrera] = await (await fetch(`${API}/assets`, { headers: { Authorization: `Bearer ${julien}` } })).json();
const verifyUrl = async () => `/verify?id=${carrera.id}&nonce=${(await post(`/assets/${carrera.id}/verifications`, {}, julien)).nonce}`;

const browser = await chromium.launch({ channel: 'chrome' });

async function shoot(name, width, path, { token, wait = 3500, scroll = [], act } = {}) {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 812 : 900 } });
    if (token) {
        await page.goto(WEB);
        await page.evaluate((t) => localStorage.setItem('certis_access_token', t), token);
    }
    await page.goto(WEB + (typeof path === 'function' ? await path() : path), { waitUntil: 'networkidle' });
    await page.waitForTimeout(wait);
    if (act) await act(page);
    const file = (suffix) => `${OUT}${width < 600 ? 'mobile' : 'desktop'}-${name}${suffix}.jpg`;
    await page.screenshot({ path: file(''), type: 'jpeg', quality: 85 });
    for (const [i, y] of scroll.entries()) {
        // RN Web remplace scrollTo() sur ce nœud par sa propre signature : on fixe scrollTop.
        await page.evaluate((top) => { const el = document.getElementById('report'); if (el) el.scrollTop = top; }, y);
        await page.waitForTimeout(900);
        await page.screenshot({ path: file(`-${i + 2}`), type: 'jpeg', quality: 85 });
    }
    await page.close();
}

for (const width of [375, 1440]) {
    const wide = width > 600;
    await shoot('01-accueil', width, '/');
    await shoot('02-connexion', width, '/login', { wait: 1500 });
    await shoot('03-collection', width, '/dashboard', { token: pro });
    await shoot('04-fiche', width, `/watch/${carrera.id}`, { token: julien });
    await shoot('05-qr-verification', width, `/watch/${carrera.id}`, {
        token: julien,
        act: async (page) => {
            await page.getByRole('button', { name: /Présenter pour vérification/ }).click();
            await page.waitForTimeout(1500);
        },
    });
    await shoot('06-inscrire', width, '/watch/new', { token: pro, wait: 1500 });
    await shoot('07-verification-authentique', width, verifyUrl, { scroll: wide ? [900, 1700, 2700] : [760, 1500, 2300, 3100] });
    await shoot('08-verification-impossible', width, `/verify?id=${carrera.id}&nonce=00000000-0000-4000-8000-000000000000`, { wait: 1500 });
}
await browser.close();
console.log('Captures écrites dans', OUT);
