# Backend Certis

Backend NestJS pour la certification et le transfert de propriete d'assets, avec signature ECDSA et authentification par nonce.

## Bilan backend valide

- `POST /assets` pour creer un asset
- `GET /assets` pour lister les assets
- `GET /assets/:id` pour le detail
- `GET /assets/:id/verify` pour verifier la signature ECDSA
- `GET /assets/:id/nonce` pour generer un nonce (30s)
- `GET /assets/:id/authenticate?nonce=...` pour authentifier via nonce
- `POST /assets/:id/transfer` pour transferer la propriete
- `GET /assets/:id/history` pour l'historique des transferts

Etat metier confirme:

- transfert enregistre avec `fromOwnerId` et `toOwnerId`
- signature ECDSA recalculee automatiquement apres transfert
- authentification toujours valide apres transfert
- historique de propriete chronologique

## Documentation detaillee

- `docs/README.md`
- `docs/architecture.md`
- `docs/api/endpoints.md`
- `docs/modules/asset.md`
- `docs/modules/transfer.md`
- `docs/modules/security-and-auth.md`

## Prerequis

- Node.js (version compatible NestJS 11)
- PostgreSQL (local ou via Docker)
- Variables d'environnement:
  - `DATABASE_URL`
  - `JWT_SECRET` (32 caracteres minimum)
  - `ECDSA_PRIVATE_KEY` (P-256 ; la cle publique en est derivee)
  - `PORT` (optionnel, defaut 3000)
- L'API refuse de demarrer si l'une d'elles manque ou est invalide (`src/config/env.ts`).

## Lancer le projet

```bash
cd ..
docker compose up -d

cd backend
npm install
npm run start:dev
```

## Script utile

Generation des secrets (format pret pour `.env` ou Render) :

```bash
node scripts/generate-secrets.mjs
```

