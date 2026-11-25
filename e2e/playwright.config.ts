import { defineConfig } from '@playwright/test';

// Contre l'app qui tourne : `npm run dev` à la racine (WEB_PORT si 8090 est pris).
// Chrome installé sur la machine : pas de navigateur à télécharger.
export default defineConfig({
    testDir: '.',
    timeout: 120_000,
    workers: 1,
    retries: 0,
    reporter: [['list'], ['json', { outputFile: 'results.json' }]],
    use: {
        baseURL: process.env.WEB_URL ?? 'http://localhost:8090',
        channel: 'chrome',
        locale: 'fr-CH',
        reducedMotion: 'no-preference',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'mobile', use: { viewport: { width: 360, height: 800 } } },
        { name: 'ordinateur', use: { viewport: { width: 1440, height: 900 } } },
    ],
});
