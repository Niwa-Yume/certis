# Certis - Travail de Bachelor

URL du repo github : https://github.com/Niwa-Yume/certis

Certis est une application mobile de certification d'actif.

Le projet permet de créer des actifs (montres), d'attester leur authenticité par signature cryptographique et de transférer la propriété entre utilisateurs via QR code temporaire.

## Objectif du travail

- proposer un registre de propriété simple ;
- démontrer un flux de transfert sécurisé entre deux utilisateurs ;
- utiliser une architecture moderne (mobile + API + base de données) ;
- intégrer une preuve cryptographique (ECDSA) côté backend.

## Fonctionnalités principales

- inscription / connexion utilisateur ;
- création d'une montre avec photo ;
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

- Node.js LTS (20 recommandé) ;
- npm ;
- Docker Desktop ;
- 2 téléphones avec Expo Go pour la démo de transfert. (ils doivent être sur le même réseau wifi, 4g, etc...)

## Setup rapide

### 1) Cloner et installer

```bash
cd backend && npm install
cd ../mobile && npm install
```

### 2) Démarrer PostgreSQL

```bash
docker compose up -d
```

### 3) Configurer les variables backend

Créer `backend/.env` (et non `backend/env`) :

```env
DATABASE_URL="postgresql://certis:certis_password@localhost:5432/certis_db"
PORT=3001
JWT_SECRET="dev-jwt-secret-change-me"
ECDSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ECDSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

Génération des clés ECDSA :

```bash
cd backend
npx ts-node scripts/generate-keys.ts
```

### 4) Initialiser la base

```bash
cd backend
npx prisma migrate deploy
```

Optionnel (données de démonstration) :

```bash
cd backend
npx ts-node prisma/seed.ts
```

## Lancement

### Backend

```bash
cd backend
npm run start:dev
```

### Mobile

Configurer `mobile/.env` :

```env
EXPO_PUBLIC_API_URL=http://<IP_ORDINATEUR>:3001
```

Puis lancer Expo :

```bash
cd mobile
npm run start
```

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
