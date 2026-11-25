import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

// Audit run 1 (ADR-0019) : un lien forgé ne doit pas détourner la requête authentifiée du propriétaire.
// /claim?id=<pièce>%2Fstolen%3F… visait POST /assets/<pièce>/stolen avec la session de la victime.
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

for (const [route, act] of [['claim', true], ['verify', false]] as const) {
    test(`un lien /${route} forgé ne déclare pas la pièce volée`, async ({ page }) => {
        const [entry] = await call<Record<string, unknown>[]>('GET', '/catalog');
        const house = await register('maison');
        execFileSync('npm', ['--prefix', '../backend', 'run', '-s', 'issuer:grant', '--', house.email, String(entry.brand)], { stdio: 'ignore' });
        const owner = await register('victime');
        const { source, photo, story, ...piece } = entry as { source: unknown; story: unknown; photo: object };
        void source; void story;
        const { id } = await call<{ id: string }>('POST', '/assets', { ...piece, ...photo, serial: `E2E-${randomUUID().slice(0, 8)}`, ownerEmail: owner.email }, house.token);

        await page.goto('/');
        await page.evaluate((t) => localStorage.setItem('certis_access_token', t), owner.token);
        await page.goto(`/${route}?id=${id}%2Fstolen%3F&nonce=${randomUUID()}`);
        if (act) await page.getByRole('button', { name: 'Accepter la pièce' }).click();
        await page.waitForTimeout(1500);

        const { status } = await call<{ status: string }>('GET', `/assets/${id}`, undefined, owner.token);
        expect(status).toBe('ACTIVE');
    });
}
