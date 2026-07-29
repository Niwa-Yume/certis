# Guide de demarrage professeur - Certis (Expo Go + 2 telephones)

Ce guide sert a lancer la demonstration complete de Certis sans preparation technique avancee.

## 1) Resume en 30 secondes

Certis permet de :

- creer des comptes utilisateur ;
- enregistrer des montres ;
- generer un QR d'authentification ;
- transferer la propriete d'une montre a un autre utilisateur via QR temporaire.

Architecture :

- mobile `mobile/` : Expo / React Native ;
- API `backend/` : NestJS ;
- base de donnees : PostgreSQL via Docker.

## 2) Prerequis

Sur ordinateur :

1. Node.js LTS (20 recommande)
2. npm
3. Docker Desktop

Sur 2 telephones :

1. Expo Go installe
2. meme reseau Wi-Fi que l'ordinateur

## 3) Demarrage rapide (ordre recommande)

### Etape A - Base de donnees

```bash
cd /Users/niwa/WebstormProjects/certis
docker compose up -d
```

### Etape B - Backend

```bash
cd /Users/niwa/WebstormProjects/certis/backend
npm install
```

Creer `backend/.env` (important : pas `backend/env`) :

```env
DATABASE_URL="postgresql://certis:certis_password@localhost:5432/certis_db"
PORT=3001
JWT_SECRET="dev-jwt-secret-change-me"
ECDSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ECDSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

Generer une paire de cles ECDSA :

```bash
cd /Users/niwa/WebstormProjects/certis/backend
npx ts-node scripts/generate-keys.ts
```

Initialiser la base :

```bash
cd /Users/niwa/WebstormProjects/certis/backend
npx prisma migrate deploy
```

Option demo (reset + donnees exemples) :

```bash
cd /Users/niwa/WebstormProjects/certis/backend
npx ts-node prisma/seed.ts
```

Lancer l'API :

```bash
cd /Users/niwa/WebstormProjects/certis/backend
npm run start:dev
```

### Etape C - Mobile Expo

```bash
cd /Users/niwa/WebstormProjects/certis/mobile
npm install
```

Trouver l'IP locale de l'ordinateur (macOS) :

```bash
ipconfig getifaddr en0
```

Creer `mobile/.env` :

```env
EXPO_PUBLIC_API_URL=http://<IP_ORDINATEUR>:3001
```

Puis lancer Expo :

```bash
cd /Users/niwa/WebstormProjects/certis/mobile
npm run start
```

Scanner le QR Expo Go sur les 2 telephones.

## 4) Scenario de demo conseille (professeur)

1. Telephone A : creer un compte et se connecter.
2. Telephone A : ajouter une montre.
3. Telephone A : ouvrir la montre puis generer un QR de transfert.
4. Telephone B : scanner le QR pour recevoir la montre.
5. Telephone B : verifier que la montre apparait dans sa collection.

## 5) Point important sur les QR

Les QR de verification et de transfert sont generes dynamiquement selon l'URL Expo en cours.
Si l'IP Wi-Fi change, regenerer simplement le QR depuis l'application.

## 6) Depannage rapide

1. **Erreur reseau dans l'app** : verifier `mobile/.env` (`EXPO_PUBLIC_API_URL`).
2. **Smartphone ne se connecte pas** : verifier meme Wi-Fi.
3. **QR transfert expire** : regenerer (nonce court).
4. **401 Unauthorized** : deconnexion/reconnexion utilisateur.
5. **Probleme Expo LAN** : relancer Expo en tunnel.

Commande tunnel si necessaire :

```bash
cd /Users/niwa/WebstormProjects/certis/mobile
npx expo start --tunnel
```

## 7) Arret de l'environnement

```bash
cd /Users/niwa/WebstormProjects/certis
docker compose down
```

Et stopper les terminaux backend/mobile avec `Ctrl + C`.

