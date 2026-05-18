# agent.md - Frontend Expo (Certis)

Ce document sert de guide pour tout agent IA/contributeur qui intervient sur le frontend Expo.

## 1) Objectif du frontend

L'application mobile Certis permet de :
- lister les assets disponibles ;
- consulter le detail d'un asset ;
- generer un QR d'authentification temporaire (nonce) ;
- verifier l'authenticite via un lien profond Expo.

Le frontend consomme l'API backend NestJS (`/assets`, `/assets/:id`, `/assets/:id/nonce`, `/assets/:id/authenticate`).

## 2) Stack et conventions

- Framework: Expo + React Native
- Navigation: Expo Router (`app/`)
- UI: React Native Paper
- HTTP: Axios (`lib/api.ts`)
- Langage: TypeScript

Conventions de code :
- garder les ecrans dans `app/` (route-file based) ;
- factoriser les appels API et la configuration reseau dans `lib/` ;
- preferer des composants simples et lisibles ;
- eviter les changements de structure non necessaires.

## 3) Structure actuelle

- `app/_layout.tsx` : provider Paper + stack router
- `app/index.tsx` : dashboard (liste des assets)
- `app/watch/[id].tsx` : detail asset + generation nonce + QR
- `app/verify.tsx` : verification d'authenticite avec `id` + `nonce`
- `lib/api.ts` : instance Axios et `baseURL`

## 4) Flux metier principal

1. Dashboard charge `GET /assets`.
2. Ouverture d'un asset via `app/watch/[id].tsx` avec `GET /assets/:id`.
3. Generation d'un nonce via `GET /assets/:id/nonce`.
4. Construction d'un lien deep link Expo pour la route `/verify?id=...&nonce=...`.
5. Ecran Verify appelle `GET /assets/:id/authenticate?nonce=...`.
6. Affichage du resultat: valide/invalide.

## 5) Config reseau

Le fichier `lib/api.ts` contient actuellement une IP locale en dur :
- `baseURL: 'http://192.168.1.140:3001'`

Recommandation :
- sortir cette valeur dans une variable d'environnement Expo (`EXPO_PUBLIC_API_URL`) ;
- eviter d'engager une IP personnelle dans les commits partages.

## 6) Commandes utiles

Depuis `mobile/` :

```bash
npm install
npm run start
npm run ios
npm run android
npm run web
```

## 7) Regles de contribution pour un agent

- Ne pas casser les routes existantes (`/`, `/watch/[id]`, `/verify`).
- Preserver la compatibilite avec les reponses backend actuelles.
- Ajouter des types explicites pour les payloads API modifies.
- Garder les messages utilisateur en francais, sauf demande contraire.
- Si ajout d'un nouvel endpoint backend, mettre a jour :
  - l'ecran concerne ;
  - les types ;
  - ce document (`agent.md`) si le flux change.

## 8) Checklist avant de livrer une modif

- L'app demarre avec `npm run start`.
- Le dashboard affiche bien les assets.
- Le detail d'un asset se charge sans erreur.
- La generation de nonce fonctionne.
- Le scan/ouvrir du lien vers `/verify` affiche un resultat coherent.
- Aucune URL locale sensible n'est ajoutee par inadvertance.

## 9) Evolutions conseillees (prochaines etapes)

- Ajouter un client API type-safe (DTO partages ou schemas runtime).
- Ajouter gestion centralisee des erreurs reseau (toast/snackbar).
- Ajouter etat de rechargement uniforme et empty states.
- Remplacer l'IP hardcodee par config d'environnement par profil (dev/staging/prod).

