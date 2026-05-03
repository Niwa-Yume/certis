# Architecture Backend Certis

## Stack

- Framework: NestJS 11
- Runtime: Node.js + TypeScript
- Base de donnees: PostgreSQL
- ORM: Prisma (`@prisma/client` + `@prisma/adapter-pg`)
- Crypto: ECDSA P-256 via `crypto` (Node)

## Modules applicatifs

- `PrismaModule` (global): acces base de donnees
- `CryptoModule` (global): signature/verif ECDSA
- `NonceModule` (global): generation/consommation nonce (TTL 30s)
- `AssetModule`: creation, lecture, verification, auth nonce
- `TransferModule`: transfert de propriete + historique

## Flux metier principal

1. Creation d'un asset
   - `POST /assets`
   - Le backend signe `{brand, model, reference, ownerId}`
   - Signature stockee dans `integrityHash`
2. Verification integrite
   - `GET /assets/:id/verify`
   - Recalcule la verification ECDSA avec les donnees stockees
3. Authentification par nonce
   - `GET /assets/:id/nonce` => nonce unique, expiration 30s
   - `GET /assets/:id/authenticate?nonce=...` => consomme le nonce puis verifie l'asset
4. Transfert de propriete
   - `POST /assets/:id/transfer`
   - Enregistre un `Transfer` (`fromOwnerId` -> `toOwnerId`)
   - Met a jour `asset.ownerId`
   - Re-signe l'asset (nouvelle signature liee au nouveau proprietaire)
5. Historique
   - `GET /assets/:id/history`
   - Retourne l'historique chronologique ascendant

## Modeles Prisma utilises

- `Asset`: identite metier + signature + proprietaire courant
- `AuthNonce`: nonce unique, expiration, statut d'usage
- `Transfer`: trace des changements de proprietaire
- `Event`: present dans le schema mais non expose par API actuellement

## Variables d'environnement attendues

- `DATABASE_URL`: connexion PostgreSQL
- `PORT` (optionnel): port HTTP (defaut 3000)
- `ECDSA_PRIVATE_KEY`: cle privee PEM (avec `\\n` echappes)
- `ECDSA_PUBLIC_KEY`: cle publique PEM (avec `\\n` echappes)

## Demarrage rapide

```bash
cd /Users/niwa/WebstormProjects/certis

docker compose up -d

cd backend
npm install
npm run start:dev
```

## Generation des cles ECDSA

Le script `scripts/generate-keys.ts` genere des valeurs pretes a coller dans un `.env`.

```bash
cd /Users/niwa/WebstormProjects/certis/backend
npx ts-node scripts/generate-keys.ts
```

