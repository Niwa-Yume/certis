# Certis - Travail de Bachelor

URL du repo github : https://github.com/Niwa-Yume/certis

Certis est une application mobile de certification d'actif.

Une maison (l'émetteur) inscrit une montre et signe son passeport avec sa propre clé. Chaque cession, révision ou déclaration de vol devient un maillon signé d'une chaîne propre à la pièce. Un acheteur vérifie la pièce sans compte, en scannant un QR à usage unique ; un expert peut tout revérifier sans Certis, avec la clé publique et le vérificateur libre `tools/verify`.

> Projet personnel, sans affiliation avec aucune maison horlogère. Les marques et références citées dans les données de démonstration appartiennent à leurs propriétaires respectifs.

## Objectif du travail

- proposer un registre de propriété simple ;
- démontrer un flux de transfert sécurisé entre deux utilisateurs ;
- utiliser une architecture moderne (mobile + API + base de données) ;
- intégrer une preuve cryptographique (ECDSA) côté backend.

## Fonctionnalités principales

- inscription d'une pièce par un émetteur : passeport signé (JWS ES256), numéro de série gardé en empreinte seulement ;
- vérification publique par QR (60 s, usage unique) : rapport imprimable, contrôle du numéro de série ;
- cession en deux temps (offre, puis acceptation), éventuellement réservée à un destinataire ;
- provenance chaînée et signée : inscription, révisions, cessions, vol et restitution ;
- pièce déclarée volée : cession bloquée, alerte affichée à tout acheteur qui la vérifie ;
- clés publiques en JWKS (`/.well-known/certis-keys`) et vérificateur indépendant (`tools/verify`).

## Architecture

- `mobile/` : application Expo / React Native ;
- `backend/` : API NestJS + Prisma ;
- `docker-compose.yml` : PostgreSQL local pour la démo.

## Stack technique

- Mobile : Expo 54, React Native, Expo Router ;
- Backend : NestJS 11, Prisma, PostgreSQL ;
- Sécurité : JWT, ECDSA P-256 (une clé par émetteur, une clé plateforme), JSON canonique (RFC 8785), nonces à usage unique, journal append-only imposé par PostgreSQL. Décisions : [`docs/adr`](docs/adr), menaces : [`docs/security/THREAT_MODEL.md`](docs/security/THREAT_MODEL.md).

## Prérequis

- Node.js 24 LTS (`.nvmrc`) ; Node 22 fonctionne aussi ;
- Docker Desktop ;
- pour la démo de transfert sur téléphone : Expo Go (SDK 54), sur le même réseau que l'ordinateur.

## Lancement en local (une commande)

```bash
npm run dev
```

Cette commande démarre PostgreSQL (Docker), installe les dépendances manquantes, crée `backend/.env` avec des secrets neufs s'il n'existe pas, applique les migrations, seede la base si elle est vide, puis lance l'API (http://localhost:3001) et le web (http://localhost:8090). `Ctrl+C` arrête tout.

Comptes de démo (dev uniquement, mots de passe dans `backend/prisma/seed.ts`) :

| Compte | Rôle | Pièces |
|---|---|---|
| `atelier@certis.demo` | Émetteur fictif « Atelier de démonstration » : inscrit des pièces | aucune en stock |
| `certis@pro.com` | Propriétaire | Submariner Date, Royal Oak Extra-Plat |
| `julien.castro@certis.local` | Propriétaire | Carrera Calibre S (reçue par cession) |

| Commande | Effet |
|---|---|
| `npm --prefix backend run db:reset` | Repartir d'une base de démo propre |
| `npm --prefix backend test` | Tests unitaires |
| `npm --prefix backend run test:e2e` | Tests e2e, sur la base isolée `certis_test` |
| `npm --prefix backend run lint` | Lint (sans correction automatique) |
| `node tools/verify/verify.mjs preuve.json jwks.json` | Vérifier un passeport et sa chaîne sans Certis ([mode d'emploi](tools/verify/README.md)) |

Sur téléphone, l'app cherche l'API sur l'IP de l'ordinateur, port 3001 (`mobile/lib/api.ts`). Sinon, définir `EXPO_PUBLIC_API_URL` dans `mobile/.env`.

## Déploiement (Render + Neon)

Le choix est expliqué dans [`docs/adr/0008-hebergement-render-neon.md`](docs/adr/0008-hebergement-render-neon.md).

1. Créer une base sur Neon (offre gratuite) et copier sa chaîne de connexion **directe**.
2. Générer la clé de signature de production : `node backend/scripts/generate-secrets.mjs`. Ne copier que la ligne `ECDSA_PRIVATE_KEY`, car `JWT_SECRET` et `KEY_ENCRYPTION_KEY` sont générés par Render. Ne jamais changer `KEY_ENCRYPTION_KEY` ensuite : elle chiffre les clés des émetteurs.
3. Sur Render : *New → Blueprint*, sur ce dépôt. Renseigner `DATABASE_URL`, `ECDSA_PRIVATE_KEY` et `CORS_ORIGINS` (l'URL de `certis-web`) pour `certis-api`. `TRUST_PROXY_HOPS` vaut 1 par hypothèse : à vérifier au premier déploiement (`docs/security/THREAT_MODEL.md`).
4. Une fois `certis-api` en ligne, renseigner `EXPO_PUBLIC_API_URL` (son URL publique) pour `certis-web`, puis relancer le déploiement du site.

L'API refuse de démarrer si une variable manque ou est trop faible : le message liste chaque problème.

## Démonstration recommandée (bachelor)

1. Émetteur : inscription d'une pièce, remise à son premier propriétaire ;
2. Propriétaire : « Présenter pour vérification », l'acheteur scanne le QR sans compte et compare le numéro de série ;
3. Propriétaire : cession par QR, l'acheteur l'accepte depuis son compte ;
4. Nouveau propriétaire : la provenance affiche « Reçue par vous » ;
5. Déclaration de vol : la cession est bloquée, la vérification affiche l'alerte ;
6. Expert : « Télécharger la preuve », puis `tools/verify` signale tout maillon altéré.

Le script chronométré de la soutenance est l'objet de la Phase 5.

## Documentation complémentaire

- `GUIDE_DEMARRAGE_PROFESSEUR_EXPO_GO.md` ;
- `backend/README.md` ;
- `backend/docs/README.md`.

## Arrêt de l'environnement

```bash
docker compose down
```
