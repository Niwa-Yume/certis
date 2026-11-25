// Vérification du lot 1, à relancer : `WEB_PORT=8091 npm run dev`, puis depuis un dossier où
// playwright@1.56.1 et @axe-core/playwright@4.11.0 sont installés : node <chemin>/verifier.mjs <dossier de sortie>.
// Lot 1 : captures 360 et 1440 px, clair et sombre, et axe (WCAG 2.2 AA) sur chaque capture.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const WEB = 'http://localhost:8091';
const API = 'http://localhost:3001';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const post = async (path, body, token) =>
    (await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body ?? {}),
    })).json();
// Un compte jetable, qui reçoit sa pièce d'essai à l'inscription (ADR-0012) : aucun identifiant dans ce fichier.
const owner = (await post('/auth/register', { email: `verif-${randomUUID()}@certis.local`, password: randomUUID() })).accessToken;
const [piece] = await (await fetch(`${API}/assets`, { headers: { Authorization: `Bearer ${owner}` } })).json();
const verifyUrl = async () => `/verify?id=${piece.id}&nonce=${(await post(`/assets/${piece.id}/verifications`, {}, owner)).nonce}`;

const shots = [
    ['accueil', '/'],
    ['connexion', '/login'],
    ['collection', '/dashboard', { token: owner }],
    ['collection-vide', '/dashboard', { token: owner, route: (r) => r.fulfill({ json: [] }) }],
    ['collection-hors-ligne', '/dashboard', { token: owner, route: (r) => r.abort() }],
    ['fiche', `/watch/${piece.id}`, { token: owner }],
    ['verification', verifyUrl],
    ['verification-en', async () => `${await verifyUrl()}&lang=en`],
];

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const scheme of ['light', 'dark']) {
    for (const width of [360, 1440]) {
        for (const [name, path, opt = {}] of shots) {
            const ctx = await browser.newContext({ viewport: { width, height: width === 360 ? 800 : 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
            const page = await ctx.newPage();
            if (opt.token) {
                await page.goto(WEB);
                await page.evaluate((t) => localStorage.setItem('certis_access_token', t), opt.token);
            }
            if (opt.route) await page.route(/:3001\/assets$/, opt.route);
            await page.goto(WEB + (typeof path === 'function' ? await path() : path), { waitUntil: 'networkidle' });
            await page.waitForTimeout(1500);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
            const file = `${width}-${scheme}-${name}.jpg`;
            await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 70 });
            const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
            report.push({ file, overflow, violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target })) });
            await ctx.close();
        }
    }
}
await browser.close();
writeFileSync(`${OUT}/axe.json`, JSON.stringify(report, null, 2));
for (const r of report) console.log(r.file, r.overflow ? 'DÉBORDE' : '', r.violations.map((v) => `${v.id}(${v.nodes})`).join(' ') || 'axe OK');
