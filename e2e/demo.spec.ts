import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { type Browser, type Page, expect, test } from '@playwright/test';

// Le parcours de la démo, écrans 1 à 7 : une seule montre, de la remise à la revente (DEMO.md).
// Trois personnes, trois sessions : la maison, son client, puis l'acheteur. Chaque passage crée ses
// propres comptes (mots de passe tirés au hasard) : aucun identifiant n'est écrit ici.
const API = process.env.API_URL ?? 'http://localhost:3001';

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
    const res = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} : ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
}

const register = async (who: string) => {
    const email = `${who}.${randomUUID()}@certis.local`;
    const { accessToken } = await call<{ accessToken: string }>('POST', '/auth/register', { email, password: randomUUID() });
    return { email, token: accessToken };
};

/** Une session de navigateur déjà connectée (ou anonyme, sans jeton). */
async function session(browser: Browser, baseURL: string, viewport: { width: number; height: number }, token?: string) {
    const ctx = await browser.newContext({ baseURL, viewport, locale: 'fr-CH' });
    const page = await ctx.newPage();
    if (token) {
        await page.goto('/');
        await page.evaluate((t) => localStorage.setItem('certis_access_token', t), token);
    }
    return page;
}

/** Le lien affiché sous un QR : sur ordinateur, on ne scanne pas son propre écran. */
const linkShown = async (page: Page, route: string) => {
    const text = await page.getByText(new RegExp(`/${route}\\?`)).last().textContent();
    return new URL(text!.trim()).pathname + new URL(text!.trim()).search;
};

test('écrans 1 à 7 : invitation, remise, collection, fiche, révision, partage, vérification et cession', async ({ browser, baseURL, viewport }) => {
    const size = viewport!;

    // La maison : un compte émetteur de la maison du catalogue, avec un visage, et une pièce en stock.
    const [entry] = await call<Record<string, unknown>[]>('GET', '/catalog');
    const house = await register('maison');
    execFileSync('npm', ['--prefix', '../backend', 'run', '-s', 'issuer:grant', '--', house.email, String(entry.brand), 'Claire Vasseur', 'Conseillère horlogère'], { stdio: 'ignore' });
    const { source, photo, story, ...piece } = entry as { source: unknown; story: unknown; photo: object };
    void source; void story;
    const { id } = await call<{ id: string }>('POST', '/assets', { ...piece, ...photo, serial: `E2E-${randomUUID().slice(0, 8)}` }, house.token);
    const clientEmail = `client.${randomUUID()}@certis.local`;

    const atHouse = await session(browser, baseURL!, size, house.token);
    await atHouse.goto(`/watch/${id}`);
    await atHouse.getByLabel('E-mail du client').fill(clientEmail);
    await atHouse.getByRole('button', { name: 'Inviter le client' }).click();
    const invitation = await linkShown(atHouse, 'invite');

    // Écran 1 : l'invitation. Un mot de passe, un seul bouton ; la pièce attend dans la collection.
    const client = await session(browser, baseURL!, size);
    await client.goto(invitation);
    await expect(client.getByText('Votre pièce vous attend')).toBeVisible();
    await client.getByLabel('Choisissez un mot de passe').fill(randomUUID());
    await client.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(client).toHaveURL(/dashboard/);
    await expect(client.getByText('Attendue')).toBeVisible();

    // Écran 2 : la remise. QR réservé au client ; le passeport s'active devant lui, en moins de 3 s.
    await atHouse.getByRole('button', { name: 'Remettre la pièce' }).click();
    const handover = await linkShown(atHouse, 'claim');
    await client.goto(handover);
    const tapped = Date.now();
    await client.getByRole('button', { name: 'Accepter la pièce' }).click();
    await expect(client.getByText('Passeport actif', { exact: true })).toBeVisible();
    expect(Date.now() - tapped).toBeLessThan(3_000);

    // Écran 3 : la collection, la pièce active.
    await client.getByRole('button', { name: 'Voir ma collection' }).click();
    await expect(client).toHaveURL(/dashboard/);
    await expect(client.getByText('Active', { exact: true })).toBeVisible();

    // Écran 4 : la fiche de vie. Un visage, un récit, puis les preuves repliées.
    await client.getByRole('link').filter({ hasText: String(entry.reference) }).first().click();
    await expect(client.getByText('Claire Vasseur')).toBeVisible();
    await expect(client.getByRole('heading', { name: 'Son histoire' })).toBeVisible();
    await expect(client.getByText('Reçue par vous').first()).toBeVisible();

    // Écran 5 : la révision. Demandée, reçue en atelier, rendue ; elle entre dans l'histoire.
    await client.getByRole('button', { name: 'Demander une révision' }).click();
    await expect(client.getByText('Demande envoyée')).toBeVisible();
    await atHouse.goto('/dashboard');
    await atHouse.getByRole('button', { name: 'Recevoir en atelier' }).first().click();
    await atHouse.getByLabel('Ce qui a été fait').first().fill('Révision complète, étanchéité contrôlée');
    await atHouse.getByRole('button', { name: 'Rendre la pièce' }).first().click();
    await expect(atHouse.getByRole('button', { name: 'Rendre la pièce' })).toHaveCount(0);
    await client.reload();
    await expect(client.getByText('Révision par la maison')).toBeVisible();

    // Écran 6 : le partage. Rien de public sans lui ; 24 heures, sans l'histoire.
    await client.getByRole('button', { name: 'Créer le lien' }).click();
    const shared = await linkShown(client, 'share');
    const visitor = await session(browser, baseURL!, size);
    await visitor.goto(shared);
    await expect(visitor.getByText('Passeport vérifié', { exact: true })).toBeVisible();
    await expect(visitor.getByRole('heading', { name: 'Son histoire' })).toHaveCount(0);

    // Écran 7 : l'acheteur vérifie, puis la cession guidée ; il revient à sa collection (écran 3).
    const buyer = await register('acheteur');
    await client.getByRole('button', { name: 'Présenter pour vérification' }).click();
    const check = await linkShown(client, 'verify');
    const atBuyer = await session(browser, baseURL!, size, buyer.token);
    await atBuyer.goto(check);
    await expect(atBuyer.getByText('Passeport vérifié', { exact: true })).toBeVisible();
    await expect(atBuyer.getByText(`Émis par ${String(entry.brand)}`)).toBeVisible();
    await client.getByRole('button', { name: 'Fermer' }).last().click();
    await client.getByRole('button', { name: 'Céder la pièce' }).click();
    await client.getByLabel('E-mail du destinataire (recommandé)').fill(buyer.email);
    await client.getByRole('button', { name: 'Générer le QR de cession' }).click();
    const sale = await linkShown(client, 'claim');
    await atBuyer.goto(sale);
    await atBuyer.getByRole('button', { name: 'Accepter la pièce' }).click();
    await expect(atBuyer.getByText('La pièce est à vous')).toBeVisible();
    await atBuyer.getByRole('button', { name: 'Voir ma collection' }).click();
    await expect(atBuyer).toHaveURL(/dashboard/);
    await expect(atBuyer.getByText(String(entry.reference)).first()).toBeVisible();
});
