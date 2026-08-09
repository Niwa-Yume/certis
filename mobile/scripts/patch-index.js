#!/usr/bin/env node
/**
 * Post-build : injecte le script de restauration SPA dans dist/index.html.
 *
 * Fonctionnement :
 *   1. L'utilisateur navigue directement vers /dashboard
 *   2. Render ne trouve pas le fichier → sert dist/404.html
 *   3. 404.html stocke "/dashboard" dans sessionStorage et redirige vers /
 *   4. index.html charge → ce script lit sessionStorage et remet l'URL correcte
 *      AVANT qu'Expo Router commence à rendre → Expo Router affiche /dashboard
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ dist/index.html introuvable — le build Expo a-t-il réussi ?');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

const spaScript = `<script>(function(){var r=sessionStorage.getItem('spa_redirect');if(r){sessionStorage.removeItem('spa_redirect');window.history.replaceState(null,null,r);}})()</script>`;

if (html.includes('spa_redirect')) {
  console.log('ℹ️  Script SPA déjà présent dans index.html, rien à faire.');
  process.exit(0);
}

html = html.replace('</head>', spaScript + '\n  </head>');
fs.writeFileSync(indexPath, html, 'utf8');

console.log('✅ Script SPA injecté dans dist/index.html');

