# Certis — en une page

**Ce que c'est.** Un registre de provenance pour montres d'occasion :
- la maison signe le passeport de la pièce ;
- chaque changement de mains est chaîné et signé ;
- l'acheteur vérifie sans compte, et un expert peut tout revérifier sans faire confiance au service.

Travail de bachelor (CREA, 2026), repris après le jury pour en corriger les failles et le mener au niveau d'une implémentation de référence.

**Voir** : [vidéo de 34 s](../demo/certis-demo.mp4) · [captures](../screenshots) · [README](../../README.md)

## Ce que le projet démontre

| Compétence | Preuve, cliquable |
|---|---|
| **Sécurité applicative** | 4 failles de cession reproduites en tests rouges ([`9fd0503`](https://github.com/Niwa-Yume/certis/commit/9fd0503)), puis corrigées ([`90b0b35`](https://github.com/Niwa-Yume/certis/commit/90b0b35)). Consommation atomique sous concurrence : 20 réclamations simultanées, une seule réussit ([ADR-0002](../adr/0002-consommation-atomique-du-nonce.md)). |
| **Cryptographie appliquée, sans bibliothèque tierce** | JWS ES256 sur JSON canonique (RFC 8785), JWKS publique avec empreintes RFC 7638, clés chiffrées en AES-256-GCM, HMAC pour le numéro de série ([ADR-0003 à 0005](../adr)). |
| **Modélisation de données et intégrité** | Chaîne d'événements par pièce : append-only imposé par un trigger PostgreSQL, sans fourche possible grâce à `UNIQUE (assetId, seq)` ([ADR-0006](../adr/0006-journal-d-evenements-chaine.md)). Un vérificateur indépendant signale le maillon modifié ([`tools/verify`](../../tools/verify)). |
| **Front-end et accessibilité** | Expo/React Native pour le mobile et le web, design system maison, responsive. 0 violation axe (WCAG 2.2 AA) sur 9 écrans. Rapport imprimable ([ADR-0009](../adr/0009-direction-visuelle-registre-v6.md)). |
| **Méthode** | Audit chiffré du code de départ ([AUDIT](../AUDIT.md)), backlog MoSCoW, une décision documentée par choix structurant, tests rouges avant correctif, un bilan par phase avec ses écarts ([BACKLOG](../BACKLOG.md)). |
| **Compréhension du métier** | Contraintes réelles du marché : passeport européen, règlement anti-blanchiment de 2027, RGPD face aux registres immuables. Sourcées et datées ([vision marché](../market/MARKET_VISION.md)). |

## La méthode en une phrase par phase
0. **Audit** sans toucher au code.
1. **Remise en état** : lancement en une commande, déploiement Render et Neon.
2. **Sécurité de la cession** : tests rouges, puis correctifs.
3. **Modèle émetteur, passeport, chaîne, vol.**
4. **Interface** de niveau luxe, accessible.
5. **Démonstration** rejouable, chronométrée.
6. **Vision marché** sourcée.

## Ce que je n'ai pas fait, et pourquoi
- **Blockchain publique, NFT, Verifiable Credentials** : aucun bénéfice visible pour l'acheteur ici. Le format reste compatible, s'il le faut un jour.
- **Ancrage externe** : reporté, parce que l'interface n'en montre rien. Le vérificateur affiche en attendant la tête de chaîne à conserver.
- **Lien physique (NFC)** : documenté, pas construit.

**Stack** : TypeScript · NestJS 11 · Prisma 7 · PostgreSQL 16 · Expo 54 · React Native · Jest et Supertest · Playwright · GitHub Actions · Render et Neon.

**Lancer** : `npm run dev`, puis `npm run demo`. Dépôt : [github.com/Niwa-Yume/certis](https://github.com/Niwa-Yume/certis) · Contact : *(à compléter)*
