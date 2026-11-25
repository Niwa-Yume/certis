// Vérification du lot 2 (écran 7) : captures 360 et 1440 px, clair et sombre, FR et EN, et axe.
// À relancer : `WEB_PORT=8091 npm run dev`, puis depuis un dossier où playwright@1.56.1 et
// @axe-core/playwright@4.11.0 sont installés :
//   ISSUER_PASSWORD=<mot de passe de la maison de démo, voir backend/prisma/seed.ts> node <chemin>/verifier.mjs <sortie>
// Vendeur et acheteur sont des comptes jetables : aucun identifiant n'est écrit ici.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const WEB = 'http://localhost:8091';
const API = 'http://localhost:3001';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const call = async (method, path, body, token) => {
    const res = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} : ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
};
const account = async () => {
    const email = `verif-${randomUUID()}@certis.local`;
    return { email, token: (await call('POST', '/auth/register', { email, password: randomUUID() })).accessToken };
};
const issuer = (await call('POST', '/auth/login', { email: 'atelier@certis.demo', password: process.env.ISSUER_PASSWORD })).accessToken;
const [catalogue] = await call('GET', '/catalog');
const mint = async (owner) => {
    const { source, photo, ...entry } = catalogue;
    return (await call('POST', '/assets', { ...entry, ...photo, serial: `VERIF-${randomUUID().slice(0, 8)}`, ownerEmail: owner.email }, issuer)).id;
};

const seller = await account();
const piece = await mint(seller);
const stolen = await mint(seller);
await call('POST', `/assets/${stolen}/stolen`, {}, seller.token);
const verifyUrl = (id) => async () => `/verify?id=${id}&nonce=${(await call('POST', `/assets/${id}/verifications`, {}, seller.token)).nonce}`;

const shots = [
    ['verifiee', verifyUrl(piece)],
    ['verifiee-preuves', verifyUrl(piece), { act: (p) => p.getByRole('button', { name: /Preuves|Proofs/ }).click() }],
    ['volee', verifyUrl(stolen)],
    ['qr-expire', `/verify?id=${piece}&nonce=00000000-0000-4000-8000-000000000000`],
    // L'acheteur reçoit la pièce : chaque capture la cède à un nouveau compte, puis la rend au vendeur.
    ['cession', null, { claim: true }],
    ['cession-acceptee', null, { claim: true, act: (p) => p.getByRole('button', { name: /Accepter la pièce|Accept the piece/ }).click() }],
];

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const lang of ['fr', 'en']) {
    for (const scheme of ['light', 'dark']) {
        for (const width of [360, 1440]) {
            for (const [name, path, opt = {}] of shots) {
                const ctx = await browser.newContext({ viewport: { width, height: width === 360 ? 800 : 900 }, colorScheme: scheme, reducedMotion: 'reduce', locale: lang });
                const page = await ctx.newPage();
                let url = typeof path === 'function' ? await path() : path;
                if (opt.claim) {
                    const buyer = await account();
                    await page.goto(WEB);
                    await page.evaluate((t) => localStorage.setItem('certis_access_token', t), buyer.token);
                    const { nonce } = await call('POST', `/assets/${piece}/transfer-offers`, {}, seller.token);
                    url = `/claim?id=${piece}&nonce=${nonce}`;
                    opt.after = async () => {
                        // Rendue au vendeur, pour la capture suivante.
                        const back = await call('POST', `/assets/${piece}/transfer-offers`, {}, buyer.token).catch(() => null);
                        if (back) await call('POST', `/assets/${piece}/claim`, { nonce: back.nonce }, seller.token);
                    };
                }
                await page.goto(`${WEB}${url}${url.includes('?') ? '&' : '?'}lang=${lang}`, { waitUntil: 'networkidle' });
                await page.waitForTimeout(1200);
                if (opt.act) {
                    await opt.act(page);
                    await page.waitForTimeout(1200);
                }
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
                const file = `${lang}-${width}-${scheme}-${name}.jpg`;
                await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 70 });
                const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
                report.push({ file, overflow, violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target })) });
                if (opt.after) await opt.after();
                await ctx.close();
            }
        }
    }
}
await browser.close();
writeFileSync(`${OUT}/axe.json`, JSON.stringify(report, null, 2));
for (const r of report) console.log(r.file, r.overflow ? 'DÉBORDE' : '', r.violations.map((v) => `${v.id}(${v.nodes})`).join(' ') || 'axe OK');
