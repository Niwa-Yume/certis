// Vérification du lot 3 (écrans 3 et 4) : collection et fiche de vie, 360 et 1440 px, clair et
// sombre, FR et EN, et axe (WCAG 2.2 AA). À relancer : `WEB_PORT=8091 npm run dev`, puis depuis un
// dossier où playwright@1.56.1 et @axe-core/playwright@4.11.0 sont installés :
//   TOKEN=<jeton de session d'un compte propriétaire> PIECE=<id d'une de ses pièces> node <chemin>/verifier.mjs <sortie>
// Le jeton vient de la session de l'app (localStorage « certis_access_token ») : aucun identifiant ici.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const WEB = 'http://localhost:8091';
const OUT = process.argv[2];
const { TOKEN, PIECE } = process.env;
mkdirSync(OUT, { recursive: true });

const shots = [
    ['collection', '/dashboard'],
    ['fiche', `/watch/${PIECE}`],
    ['fiche-suite', `/watch/${PIECE}`, { scroll: 700 }],
    ['fiche-preuves', `/watch/${PIECE}`, { scroll: 2400, act: (p) => p.getByRole('button', { name: /Preuves|Proofs/ }).click() }],
];

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const lang of ['fr', 'en']) {
    for (const scheme of ['light', 'dark']) {
        for (const width of [360, 1440]) {
            for (const [name, path, opt = {}] of shots) {
                const ctx = await browser.newContext({ viewport: { width, height: width === 360 ? 800 : 900 }, colorScheme: scheme, reducedMotion: 'reduce', locale: lang });
                const page = await ctx.newPage();
                await page.goto(WEB);
                await page.evaluate((t) => localStorage.setItem('certis_access_token', t), TOKEN);
                await page.goto(`${WEB}${path}?lang=${lang}`, { waitUntil: 'networkidle' });
                await page.waitForTimeout(1500);
                if (opt.act) await opt.act(page);
                if (opt.scroll) {
                    // RN Web fait défiler un nœud, pas la page : on le cherche.
                    await page.evaluate((y) => document.querySelectorAll('*').forEach((el) => {
                        if (el.scrollHeight > el.clientHeight + 50 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = y;
                    }), opt.scroll);
                    await page.waitForTimeout(600);
                }
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
                const file = `${lang}-${width}-${scheme}-${name}.jpg`;
                await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 70 });
                const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
                report.push({ file, overflow, violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target })) });
                await ctx.close();
            }
        }
    }
}
await browser.close();
writeFileSync(`${OUT}/axe.json`, JSON.stringify(report, null, 2));
for (const r of report) console.log(r.file, r.overflow ? 'DÉBORDE' : '', r.violations.map((v) => `${v.id}(${v.nodes})`).join(' ') || 'axe OK');
