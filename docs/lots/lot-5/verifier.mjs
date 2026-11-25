// Vérification du lot 5 (écrans 5 et 6) : révision demandée, reçue, rendue ; partage créé, ouvert,
// arrêté. Joué dans le navigateur en 360 et 1440 px, clair et sombre, FR et EN, avec axe.
// À relancer : `WEB_PORT=8091 npm run dev`, puis depuis un dossier où playwright@1.56.1 et
// @axe-core/playwright@4.11.0 sont installés :
//   TOKEN=<jeton de session d'un compte de maison> node <chemin>/verifier.mjs <sortie>
// Le client est un compte jetable : aucun identifiant n'est écrit ici.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const WEB = 'http://localhost:8091';
const API = 'http://localhost:3001';
const OUT = process.argv[2];
const HOUSE = process.env.TOKEN;
mkdirSync(OUT, { recursive: true });

const call = async (method, path, body, token) => {
    const res = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} : ${res.status} ${await res.text()}`);
    return res.json();
};
const [entry] = await call('GET', '/catalog');

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
async function check(page, file) {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${file}.jpg`, type: 'jpeg', quality: 70 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    report.push({ file, overflow, violations: axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, sample: v.nodes[0]?.target })) });
}
async function open(opts, token, path) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    if (token) {
        await page.goto(WEB);
        await page.evaluate((t) => localStorage.setItem('certis_access_token', t), token);
    }
    await page.goto(WEB + path, { waitUntil: 'networkidle' });
    return { ctx, page };
}
// RN Web fait défiler un nœud, pas la page : on amène un texte à l'écran.
const reveal = (page, text) => page.getByText(text).first().scrollIntoViewIfNeeded();

for (const lang of ['fr', 'en']) {
    for (const scheme of ['light', 'dark']) {
        for (const width of [360, 1440]) {
            const opts = { viewport: { width, height: width === 360 ? 800 : 900 }, colorScheme: scheme, reducedMotion: 'reduce', locale: lang };
            const tag = `${lang}-${width}-${scheme}`;
            const email = `client.${randomUUID()}@certis.local`;
            const client = (await call('POST', '/auth/register', { email, password: randomUUID() })).accessToken;
            const { source, photo, story, ...piece } = entry;
            const { id } = await call('POST', '/assets', { ...piece, ...photo, serial: `VERIF-${randomUUID().slice(0, 8)}`, ownerEmail: email }, HOUSE);
            const q = `?lang=${lang}`;

            // Écran 5 : le client demande une révision.
            const c = await open(opts, client, `/watch/${id}${q}`);
            await reveal(c.page, /^(Demander une révision|Request a service)$/);
            await c.page.getByRole('button', { name: /Demander une révision|Request a service/ }).click();
            await reveal(c.page, /^(Demande envoyée|Request sent)$/);
            await check(c.page, `${tag}-5-revision-demandee`);

            // La maison la reçoit, puis la rend avec une note.
            const h = await open(opts, HOUSE, `/dashboard${q}`);
            await h.page.getByRole('button', { name: /Recevoir en atelier|Receive in the workshop/ }).first().click();
            await h.page.waitForTimeout(800);
            await check(h.page, `${tag}-5-maison-atelier`);
            await h.page.getByLabel(/Ce qui a été fait|What was done/).first().fill('Révision complète, étanchéité contrôlée');
            await h.page.getByRole('button', { name: /Rendre la pièce|Return the piece/ }).first().click();
            await h.page.waitForTimeout(800);
            await h.ctx.close();
            await c.page.reload({ waitUntil: 'networkidle' });
            await reveal(c.page, /Révision par la maison|Serviced by the house/);
            await check(c.page, `${tag}-5-revision-rendue`);

            // Écran 6 : le client partage, 7 jours, sans histoire, puis l'arrête.
            await reveal(c.page, /^(Créer le lien|Create the link)$/);
            await c.page.getByRole('radio', { name: /7 jours|7 days/ }).click();
            await c.page.getByRole('button', { name: /Créer le lien|Create the link/ }).click();
            await c.page.waitForTimeout(800);
            await reveal(c.page, /^(Arrêter ce partage|Stop this share)$/);
            await check(c.page, `${tag}-6-partage`);
            const { token } = await call('POST', `/assets/${id}/shares`, { hours: 24, history: false }, client);
            const v = await open(opts, null, `/share${q}&t=${token}`);
            await check(v.page, `${tag}-6-lien-ouvert`);
            const [first] = (await call('GET', `/assets/${id}`, null, client)).shares;
            await call('DELETE', `/assets/${id}/shares/${first.id}`, null, client);
            await v.page.reload({ waitUntil: 'networkidle' });
            await check(v.page, `${tag}-6-lien-arrete`);
            await v.ctx.close();
            await c.ctx.close();
        }
    }
}
await browser.close();
writeFileSync(`${OUT}/axe.json`, JSON.stringify(report, null, 2));
for (const r of report) console.log(r.file, r.overflow ? 'DÉBORDE' : '', r.violations.map((v) => `${v.id}(${v.nodes})`).join(' ') || 'axe OK');
