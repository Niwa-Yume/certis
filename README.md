# Certis - Travail de Bachelor

URL du repo github : https://github.com/Niwa-Yume/certis

Certis est une application mobile de certification d'actif.

Le projet permet de créer des actifs (montres), d'attester leur authenticité par signature cryptographique et de transférer la propriété entre utilisateurs via QR code temporaire.

> Projet personnel, sans affiliation avec aucune maison horlogère. Les marques et références citées dans les données de démonstration appartiennent à leurs propriétaires respectifs.

## Objectif du travail

- proposer un registre de propriété simple ;
- démontrer un flux de transfert sécurisé entre deux utilisateurs ;
- utiliser une architecture moderne (mobile + API + base de données) ;
- intégrer une preuve cryptographique (ECDSA) côté backend.

## Fonctionnalités principales

- inscription / connexion utilisateur ;
- création d'une montre (photo par URL) ;
- génération d'un QR d'authentification ;
- génération d'un QR de transfert temporaire (nonce expirant) ;
- consultation des actifs et des détails ;
- historique de transfert côté API.

## Architecture

- `mobile/` : application Expo / React Native ;
- `backend/` : API NestJS + Prisma ;
- `docker-compose.yml` : PostgreSQL local pour la démo.

## Stack technique

- Mobile : Expo 54, React Native, Expo Router ;
- Backend : NestJS 11, Prisma, PostgreSQL ;
- Sécurité : JWT + signatures ECDSA + nonce de courte durée.

## Prérequis

- Node.js 24 LTS (`.nvmrc`) ; Node 22 fonctionne aussi ;
- Docker Desktop ;
- pour la démo de transfert sur téléphone : Expo Go (SDK 54), sur le même réseau que l'ordinateur.

## Lancement en local (une commande)

```bash
npm run dev
```

Cette commande démarre PostgreSQL (Docker), installe les dépendances manquantes, crée `backend/.env` avec des secrets neufs s'il n'existe pas, applique les migrations, seede la base si elle est vide, puis lance l'API (http://localhost:3001) et le web (http://localhost:8090). `Ctrl+C` arrête tout.

Comptes de démo (dev uniquement) : voir `backend/prisma/seed.ts`.

| Commande | Effet |
|---|---|
| `npm --prefix backend run db:reset` | Repartir d'une base de démo propre |
| `npm --prefix backend test` | Tests unitaires |
| `npm --prefix backend run test:e2e` | Tests e2e, sur la base isolée `certis_test` |
| `npm --prefix backend run lint` | Lint (sans correction automatique) |

Sur téléphone, l'app cherche l'API sur l'IP de l'ordinateur, port 3001 (`mobile/lib/api.ts`). Sinon, définir `EXPO_PUBLIC_API_URL` dans `mobile/.env`.

## Déploiement (Render + Neon)

Le choix est expliqué dans [`docs/adr/0008-hebergement-render-neon.md`](docs/adr/0008-hebergement-render-neon.md).

1. Créer une base sur Neon (offre gratuite) et copier sa chaîne de connexion **directe**.
2. Générer la clé de signature de production : `node backend/scripts/generate-secrets.mjs`. Ne copier que la ligne `ECDSA_PRIVATE_KEY`, car `JWT_SECRET` est généré par Render.
3. Sur Render : *New → Blueprint*, sur ce dépôt. Renseigner `DATABASE_URL` et `ECDSA_PRIVATE_KEY` pour `certis-api`.
4. Une fois `certis-api` en ligne, renseigner `EXPO_PUBLIC_API_URL` (son URL publique) pour `certis-web`, puis relancer le déploiement du site.

L'API refuse de démarrer si une variable manque ou est trop faible : le message liste chaque problème.

## Démonstration recommandée (bachelor)

1. Téléphone A : connexion compte propriétaire ;
2. Téléphone A : ajout d'une montre ;
3. Téléphone A : génération QR de transfert ;
4. Téléphone B : scan et réception de la montre ;
5. Téléphone B : vérification que la propriété a changé ;
6. Retour API : contrôle des données côté backend.

## Documentation complémentaire

- `GUIDE_DEMARRAGE_PROFESSEUR_EXPO_GO.md` ;
- `backend/README.md` ;
- `backend/docs/README.md`.

## Arrêt de l'environnement

```bash
docker compose down
```
