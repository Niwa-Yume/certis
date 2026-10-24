# API Certis

NestJS 11, Prisma 7, PostgreSQL. Lancement, comptes de démo et déploiement : [README à la racine](../README.md).

- Routes et réponses : [`docs/api/endpoints.md`](docs/api/endpoints.md)
- Décisions : [`../docs/adr`](../docs/adr) (clés des émetteurs, passeport, numéro de série, chaîne d'événements)
- Menaces et contrôles : [`../docs/security/THREAT_MODEL.md`](../docs/security/THREAT_MODEL.md)

| Dossier | Rôle |
|---|---|
| `src/issuer` | Émetteurs, leurs clés, JWKS publique, contrôle du rôle |
| `src/registry` | Chaîne d'événements : ajout d'un maillon, vérification complète |
| `src/asset` | Inscription, vue du propriétaire, vol, vérification publique, numéro de série |
| `src/transfer` | Cession en deux temps |
| `src/nonce` | QR à usage unique, liés à une pièce et à une finalité |
| `src/crypto` | JWS ES256, JSON canonique, chiffrement des clés, dérivations |
| `src/config` | Configuration vérifiée au démarrage |

| Commande | Effet |
|---|---|
| `npm run start:dev` | API en mode watch (port 3001 via `npm run dev` à la racine) |
| `npm test` / `npm run test:e2e` | Tests unitaires / e2e (base `certis_test`) |
| `npm run db:reset` | Base de démo propre (refusé en production) |
| `npm run issuer:grant -- <e-mail> "<maison>"` | Faire d'un compte existant l'émetteur d'une maison |
| `node scripts/generate-secrets.mjs` | Secrets neufs au format `.env` |
