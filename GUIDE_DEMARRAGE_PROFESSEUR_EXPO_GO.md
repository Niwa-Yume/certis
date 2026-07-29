# Guide de démarrage professeur — Certis (Expo Go + 2 téléphones)

Ce guide explique **pas à pas** comment lancer le projet Certis pour une démonstration avec **2 téléphones** via **Expo Go**, même sans connaître le projet au préalable.

## 1) Comprendre rapidement le projet

Certis est une application mobile qui permet de :

- créer un compte utilisateur ;
- se connecter ;
- ajouter des montres (assets) ;
- prouver l’authenticité via un QR temporaire ;
- transférer la propriété d’une montre d’un compte à un autre.

Architecture :

- **Frontend mobile** : Expo / React Native (dossier `mobile/`) ;
- **Backend API** : NestJS (dossier `backend/`) ;
- **Base de données** : PostgreSQL (lancée avec Docker).

## 2) Prérequis (à installer une seule fois)

Sur l’ordinateur (Mac/Windows/Linux) :

1. **Node.js LTS** (version 20 recommandée)
2. **npm** (fourni avec Node.js)
3. **Docker Desktop** (pour PostgreSQL)

Sur les 2 téléphones :

1. Installer l’application **Expo Go** (App Store / Google Play)
2. Connecter les 2 téléphones au **même Wi-Fi** que l’ordinateur

## 3) Préparer l’environnement backend

Depuis la racine du projet :

```bash
cd /chemin/vers/certis
docker compose up -d
```

Cela démarre PostgreSQL sur le port `5432`.

Ensuite :

```bash
cd backend
npm install
```

### 3.1 Fichier `.env` backend

Créer ou vérifier `backend/.env` avec au minimum :

```env
DATABASE_URL="postgresql://certis:certis_password@localhost:5432/certis_db"
PORT=3001
JWT_SECRET="change-me-super-secret"
ECDSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ECDSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

Pour générer les clés ECDSA :

```bash
npx ts-node scripts/generate-keys.ts
```

Copier/coller les valeurs générées dans `.env`.

### 3.2 Initialiser la base

Toujours dans `backend/` :

```bash
npx prisma migrate deploy
```

Optionnel (jeu de données de démonstration) :

```bash
npx ts-node prisma/seed.ts
```

> ⚠️ Le seed **supprime les données existantes** puis recrée des utilisateurs/montres de démonstration.

## 4) Démarrer l’API backend

Dans un terminal (laissé ouvert) :

```bash
cd /chemin/vers/certis/backend
npm run start:dev
```

Le backend doit écouter sur `http://<IP_ORDINATEUR>:3001`.

## 5) Préparer le mobile (Expo)

Dans un **deuxième** terminal :

```bash
cd /chemin/vers/certis/mobile
npm install
```

### 5.1 Trouver l’IP locale de l’ordinateur

Exemple sur macOS :

```bash
ipconfig getifaddr en0
```

Vous obtiendrez une IP du type `192.168.x.x`.

### 5.2 URL API : mode automatique (recommandé)

Le frontend détecte automatiquement l’hôte Expo et construit l’URL API en `http://<hote>:3001`.
Donc, en LAN (même Wi-Fi), vous n’avez normalement **rien à changer** quand vous passez de la maison au bureau.

### 5.3 Forcer une URL API (optionnel)

Créer `mobile/.env` :

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```

Remplacer `192.168.x.x` par l’IP réelle de l’ordinateur.

Après création/modification de `mobile/.env`, redémarrer Expo (`Ctrl + C` puis `npm run start`).

## 6) Démarrer Expo

Toujours dans `mobile/` :

```bash
npm run start
```

Puis :

1. Expo affiche un QR dans le terminal / navigateur ;
2. Ouvrir Expo Go sur **Téléphone A** et scanner le QR ;
3. Faire la même chose sur **Téléphone B**.

Les deux téléphones exécutent la même application, mais avec des sessions utilisateur séparées.

## 7) Vérifications rapides en cas de problème

1. **Erreur réseau dans l’app**  
   Vérifier que `EXPO_PUBLIC_API_URL` pointe vers `http://IP_ORDINATEUR:3001`.

2. **Téléphone ne voit pas le backend**  
   Vérifier que téléphone + ordinateur sont sur le **même Wi-Fi**.
   Si vous êtes sous VPN d’entreprise, le LAN peut être bloqué : tester sans VPN ou forcer `EXPO_PUBLIC_API_URL`.

3. **QR expiré**  
   Les nonces expirent rapidement (~30 s), régénérer le QR.

4. **401 / non autorisé**  
   Vérifier que l’utilisateur est bien connecté dans l’app.

5. **Base non initialisée**  
   Relancer : `npx prisma migrate deploy`.

6. **Port déjà utilisé**  
   Vérifier les ports `3001` (API) et `8081`/ports Expo selon affichage.

## 8) Commandes utiles (récapitulatif)

```bash
# Depuis la racine
docker compose up -d

# Backend
cd backend
npm install
npx prisma migrate deploy
npm run start:dev

# Mobile
cd ../mobile
npm install
npm run start
```

## 10) Arrêter l’environnement

Dans les terminaux backend/mobile : `Ctrl + C`  
Pour PostgreSQL :

```bash
cd /chemin/vers/certis
docker compose down
```
