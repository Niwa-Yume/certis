// Vérification du lot 4 (écrans 1 et 2) : le parcours invitation → pièce attendue → remise →
// activation → carte, joué dans le navigateur, en 360 et 1440 px, clair et sombre, FR et EN, et axe.
// À relancer : `WEB_PORT=8091 npm run dev`, puis depuis un dossier où playwright@1.56.1 et
// @axe-core/playwright@4.11.0 sont installés :
//   TOKEN=<jeton de session d'un compte de maison> node <chemin>/verifier.mjs <sortie>
// Le client est un compte jetable, créé par l'invitation : aucun identifiant n'est écrit ici.
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
const timings = [];
async function check(page, file) {
    await page.screenshot({ path: `${OUT}/${file}.jpg`, type: 'jpeg', quality: 70 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    report.push({ file, overflow, violations: axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, sample: v.nodes[0]?.target })) });
}
const open = async (opts, token) => {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    if (token) {
        await page.goto(WEB);
        await page.evaluate((t) => localStorage.setItem('certis_access_token', t), token);
    }
    return { ctx, page };
};

for (const lang of ['fr', 'en']) {
    for (const scheme of ['light', 'dark']) {
        for (const width of [360, 1440]) {
            const opts = { viewport: { width, height: width === 360 ? 800 : 900 }, colorScheme: scheme, reducedMotion: 'no-preference', locale: lang };
            const tag = `${lang}-${width}-${scheme}`;
            // Une pièce neuve dans le stock de la maison, pour chaque passage.
            const { source, photo, story, ...piece } = entry;
            const { id } = await call('POST', '/assets', { ...piece, ...photo, serial: `VERIF-${randomUUID().slice(0, 8)}` }, HOUSE);
            const email = `client.${randomUUID()}@certis.local`;

            // 1. La maison invite son client, depuis la fiche de la pièce.
            const house = await open(opts, HOUSE);
            await house.page.goto(`${WEB}/watch/${id}?lang=${lang}`, { waitUntil: 'networkidle' });
            await house.page.getByLabel(/E-mail du client|Client e-mail/).fill(email);
            await house.page.getByRole('button', { name: /Inviter le client|Invite the client/ }).click();
            await house.page.waitForTimeout(1200);
            await check(house.page, `${tag}-2-maison-invitation`);

            // 2. Le client ouvre l'invitation : un mot de passe, un seul bouton.
            const { token } = await call('POST', `/assets/${id}/invitations`, { email }, HOUSE);
            const client = await open(opts);
            const start = Date.now();
            await client.page.goto(`${WEB}/invite?token=${token}&lang=${lang}`, { waitUntil: 'networkidle' });
            await check(client.page, `${tag}-1-invitation`);
            await client.page.getByLabel(/Choisissez un mot de passe|Choose a password/).fill(randomUUID());
            await client.page.getByRole('button', { name: /Créer mon compte|Create my account/ }).click();
            await client.page.waitForURL(/dashboard/);
            await client.page.waitForTimeout(1200);
            timings.push({ tag, signupSeconds: (Date.now() - start) / 1000 });
            await check(client.page, `${tag}-3-collection-attendue`);

            // 3. La remise : la maison montre le QR réservé, le client l'accepte, le passeport s'active.
            const { nonce } = await call('POST', `/assets/${id}/transfer-offers`, { recipientEmail: email }, HOUSE);
            await client.page.goto(`${WEB}/claim?id=${id}&nonce=${nonce}&lang=${lang}`, { waitUntil: 'networkidle' });
            const click = Date.now();
            await client.page.getByRole('button', { name: /Accepter la pièce|Accept the piece/ }).click();
            await client.page.getByText(/^(Passeport actif|Active passport)$/).waitFor();
            await client.page.waitForTimeout(1100); // la fin de l'animation
            timings[timings.length - 1].activationSeconds = (Date.now() - click) / 1000;
            await check(client.page, `${tag}-2-activation`);

            // 4. La carte : publique, elle ne dit que l'état du passeport. Le client la lit sur sa pièce.
            const clientToken = await client.page.evaluate(() => localStorage.getItem('certis_access_token'));
            const { cardId } = await call('GET', `/assets/${id}`, null, clientToken);
            const visitor = await open(opts);
            await visitor.page.goto(`${WEB}/card?c=${cardId}&lang=${lang}`, { waitUntil: 'networkidle' });
            await visitor.page.waitForTimeout(800);
            await check(visitor.page, `${tag}-6-carte-publique`);
            await visitor.ctx.close();
            await house.ctx.close();
            await client.ctx.close();
        }
    }
}
await browser.close();
writeFileSync(`${OUT}/axe.json`, JSON.stringify({ report, timings }, null, 2));
for (const r of report) console.log(r.file, r.overflow ? 'DÉBORDE' : '', r.violations.map((v) => `${v.id}(${v.nodes})`).join(' ') || 'axe OK');
for (const t of timings) console.log(t.tag, `compte ${t.signupSeconds}s`, `activation ${t.activationSeconds}s`);
