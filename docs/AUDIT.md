# Audit Certis — Phase 0

| | |
|---|---|
| Date | 2026-10-23 |
| Code audité | `main` @ `9de1082` (= `Niwa-Yume/certis` `main`, vérifié via l'API GitHub) |
| Méthode | Lecture intégrale du backend (`backend/src`, `prisma/`, `test/`), du front (`mobile/app`, `mobile/lib`, `mobile/components`, `app.json`), de la config de déploiement et de l'historique git. Aucune exécution : la reproduction automatisée des attaques sera le premier livrable de la Phase 2 (tests rouges). |
| Références | `fichier:ligne` relatifs à la racine du dépôt, sur `9de1082`. |

**Gravité.** *Critique* : vol de propriété ou falsification possible sans prérequis particulier. *Haute* : atteinte à la confiance ou à la vie privée, exploitable facilement. *Moyenne* : défense en profondeur absente ou bug visible. *Basse* : hygiène, dette.

**Verdict.** *Confirmé* : le constat est exact. *Confirmé, nuancé* : exact sur le fond, mais une partie de l'énoncé est imprécise (la nuance est donnée). *Infirmé* : faux.

---

## Synthèse

| ID | Constat | Verdict | Gravité | Backlog |
|---|---|---|---|---|
| N0 | Le checkout local pointe vers le dépôt boilerplate, qui contient lui aussi la clé fuitée | Nouveau | Haute | P1-02 |
| S1 | Secrets publics, fallback JWT, `render.yaml` incomplet | Confirmé, nuancé | Critique | P1-01, P1-03, P1-04 |
| S2 | Pas de contrôle de propriété sur la génération de nonce | Confirmé | Critique | P2-02 |
| S3 | Nonce non lié à l'actif (`claim` et `authenticate`) | Confirmé | Critique | P2-02 |
| S4 | Pas de finalité du nonce (QR vérif = QR transfert) | Confirmé | Critique | P2-02, P2-04 |
| S5 | Consommation du nonce non atomique | Confirmé, élargi | Haute | P2-03 |
| S6 | Signature fragile (payload, canonicalisation, nommage) | Confirmé, élargi | Haute | P2-06, P3-03 |
| S7 | `GET` qui modifie l'état | Confirmé, élargi | Moyenne | P2-05 |
| S8 | Hygiène API (validation, CORS, rate limit, IDOR, auto-claim) | Confirmé, nuancé | Haute | P2-07 |
| S9 | Le registre chaîné a disparu | Confirmé, nuancé | Haute (écart promesse) | P3-05, P3-08 |
| S10 | Trous métier (série, calibre, cycle de vie, émetteur, images) | Confirmé | Haute (écart promesse) | P3-01 à P3-11 |
| F1 | Pas de responsive, emojis | Confirmé | Haute (critique jury) | P4-02 à P4-06 |
| N1 | L'app est brandée « Audemars Piguet » avec le logo AP | Nouveau | **Critique (réputation/juridique)** | P1-05 |
| N2 | L'écran de vérification affiche « invalide » pour toute erreur | Nouveau | Haute | P2-08 |
| N3 | « Montre authentique » ne prouve rien sur l'authenticité | Nouveau | Haute | P3-01, P3-02 |
| N4 | Aucune vérification possible hors serveur Certis | Nouveau | Haute | P3-01, P3-08 |
| N5 | Les tests e2e effacent la base de dev | Nouveau | Haute | P1-06 |
| N6 | Un test consacre un bug ; aucune CI ; pas de tests unitaires | Nouveau | Moyenne | P1-07, P2-01 |
| N7 | Transfert direct sans consentement du destinataire | Nouveau | Haute | P2-04 |
| N8 | Assignation de masse sur `POST /assets` | Nouveau | Moyenne | P2-07 |
| N9 | Comptes de seed faibles publics, seed destructif sans garde | Nouveau | Haute (si seed en prod) | P1-01, P3-10 |
| N10 | Hébergement Render gratuit : base qui expire, disque éphémère | Nouveau | Moyenne | P1-04, ADR-0008 |
| N11 | Démo dépendante d'Expo Go (SDK 54) | Nouveau | Moyenne | P5-02 |
| N12 | Node 20 recommandé alors qu'il est en fin de vie | Nouveau | Basse | P1-08 |
| N13 | Fonctionnalités promises mais retirées, code mort | Nouveau | Basse | P1-09 |
| N14 | JWT en `localStorage` sur le web, pas de révocation | Nouveau | Basse (résiduel assumé) | THREAT_MODEL |
| N15 | Historique git peu lisible pour un recruteur | Nouveau | Basse | — (pas de réécriture) |

---

## N0 — État du dépôt local (constat préalable)

- Le checkout de travail était sur la branche `boilerplate/template-v1`. Ses remotes `origin`, `newrepo` et `template-origin` pointent tous vers `github.com/Niwa-Yume/boilerplate-nest-react-reactBitsPro` (public). **Aucun remote ne pointe vers `Niwa-Yume/certis`.**
- `boilerplate/template-v1` = `main` + 1 commit (`0e0f2f6`) qui remplace Certis par un boilerplate (`apps/api`, `apps/web`). Le commit `9de1082`, qui contient `backend/.env`, est donc **aussi présent dans l'historique public du dépôt boilerplate** (vérifié : `gh api repos/Niwa-Yume/boilerplate-nest-react-reactBitsPro/commits/9de1082` répond).
- J'ai créé la branche `docs/phase-0-audit` depuis `main`, rien d'autre.

**Pourquoi c'est important.** La fuite du S1 touche deux dépôts publics, pas un. Une éventuelle réécriture d'historique (Phase 1) devrait donc traiter les deux, et un `git push` depuis ce checkout partirait vers le mauvais dépôt.

---

## Sécurité

### S1 — Secrets publics · Confirmé, nuancé · Critique

**Preuves**
- `backend/.env:1-8` est versionné depuis `9de1082` (2026-08-10, « ajout des .env pour mon travail de bachelors »). Le même commit retire `.env`, `.env.*` et `.env.example` du `.gitignore` racine (`.gitignore:68-70`, lignes désormais vides). `backend/.gitignore:3` ignore encore `.env` : le fichier a donc été ajouté de force.
- Le fichier contient `ECDSA_PRIVATE_KEY` (PEM PKCS#8 P-256, `backend/.env:7`) et `ECDSA_PUBLIC_KEY` (`:8`).
- `DATABASE_URL` (`backend/.env:1`) pointe vers `localhost`, avec les identifiants Docker déjà publics dans `docker-compose.yml:7-9`, `README.md` et `.idea/dataSources.xml`. **Nuance : la `DATABASE_URL` n'est pas une fuite en soi.** Ce sont des identifiants de dev local.
- Fallback JWT codé en dur : `backend/src/auth/auth.module.ts:12` et `backend/src/auth/jwt.strategy.ts:16`. `JWT_SECRET` est absent de `backend/.env`, donc le fallback est actif en local. La valeur du fallback est en plus publiée dans `README.md:66` et `GUIDE_DEMARRAGE_PROFESSEUR_EXPO_GO.md:53`.
- `render.yaml:23-29` déclare `DATABASE_URL`, `JWT_SECRET` et `PORT`, mais pas `ECDSA_PRIVATE_KEY` ni `ECDSA_PUBLIC_KEY`. `backend/src/crypto/crypto.service.ts:10-11` fait `process.env.ECDSA_PRIVATE_KEY!.replace(...)`.

**Analyse**
- Avec la clé privée, n'importe qui peut fabriquer un `integrityHash` valide pour n'importe quel contenu. La signature ne protège donc plus rien, même pas contre un admin de la base.
- Si `JWT_SECRET` n'est pas renseigné en production, un attaquant forge un JWT `HS256` avec le secret publié et se connecte comme n'importe quel utilisateur, `sub` = id de la victime. Les ids du seed sont lisibles : `'julien-castro'`, `'certis-pro'` (`backend/prisma/seed.ts:12,18`).
- **Nuance sur « plante en production ».** Le crash a lieu au **démarrage** : `CryptoService` est instancié par l'injection de dépendances et lève `TypeError: Cannot read properties of undefined`. Il ne survient pas « à la première signature ». Il ne se produit que si les variables n'ont pas été ajoutées à la main dans le dashboard Render, ce qui est probablement ton cas puisque la démo a tourné. Le vrai défaut, c'est que le blueprint ne décrit pas la config nécessaire et que rien ne vérifie la config au démarrage.
- À vérifier : `render.yaml:21` lance `npm run build` **avant** `npx prisma generate`, et aucune commande `prisma migrate deploy` n'est prévue. Le schéma de production n'est donc pas géré par le déploiement.

**Correction** : P1-01 (rotation et sortie du suivi), P1-02 (historique), P1-03 (fail-fast), P1-04 (`render.yaml`).

### S2 — Pas de contrôle de propriété sur le nonce · Confirmé · Critique

**Preuves**
- `backend/src/asset/asset.controller.ts:39-42` : `generateNonce(@Param('id') id)` ne reçoit même pas `request.user`.
- `backend/src/asset/asset.service.ts:59-62` vérifie seulement que l'actif existe (`findOne`), puis appelle `nonce.generate(id)` (`backend/src/nonce/nonce.service.ts:10-23`).

**Analyse.** Tout utilisateur connecté peut obtenir un nonce pour n'importe quel actif dont il connaît l'id. Combiné à `claim` (S3/S4), cela suffit à voler une montre. Il n'y a ni limite de génération ni purge des nonces expirés : la table `AuthNonce` grossit sans borne.

### S3 — Nonce non lié à l'actif · Confirmé · Critique

**Preuves**
- `backend/src/transfer/transfer.service.ts:59-73` : `findUnique({ where: { nonceValue } })`. `nonce.assetId` n'est jamais comparé à `assetId`.
- `backend/src/asset/asset.service.ts:64-67` → `backend/src/nonce/nonce.service.ts:27` : `consume(nonceValue)` ne reçoit même pas l'`assetId`.
- La relation existe pourtant dans le schéma (`backend/prisma/schema.prisma:49-50`). Elle n'est simplement jamais utilisée pour contrôler.

**Analyse.**
- **S3 suffit à lui seul pour voler une montre, même sans S2.** L'attaquant crée sa propre montre (`POST /assets`, ouvert à tous), génère légitimement un nonce pour *sa* montre, puis appelle `POST /assets/<id-victime>/claim` avec ce nonce. Le transfert passe.
- Côté vérification, un nonce de la montre A permet d'afficher « Montre authentique » pour la montre B.

### S4 — Pas de finalité du nonce · Confirmé · Critique

**Preuves**
- `mobile/app/watch/[id].tsx:90` (QR d'authentification) et `mobile/app/watch/[id].tsx:108` (QR de transfert) appellent tous les deux `GET /assets/${id}/nonce`. Seule la route du QR diffère : `/verify` à `:101-103`, `/claim` à `:117-119`.
- `backend/prisma/schema.prisma:41-51` : `AuthNonce` n'a pas de champ de finalité.

**Analyse.** Un QR de vérification montré lors d'une vente (photo, partage d'écran) contient `id` et `nonce`. Dans les 30 secondes (`nonce.service.ts:12`) et tant que l'acheteur ne l'a pas scanné, il suffit de remplacer `/verify` par `/claim` pour s'approprier la montre.

#### Chaînes d'attaque consolidées (deviendront les tests rouges P2-01)

Prérequis commun : connaître l'id de l'actif. Cet id figure en clair dans chaque QR (`mobile/app/watch/[id].tsx:102,118`).

| # | Chaîne | Failles | Résultat attendu après correction |
|---|---|---|---|
| A | L'attaquant génère un nonce **sur l'actif de la victime** → `claim` | S2 | 403 à la génération |
| B | L'attaquant génère un nonce **sur son propre actif** → `claim` de l'actif victime | S3 | 409 ou 403, nonce non consommé |
| C | Un QR de vérification intercepté est rejoué sur `/claim` | S4 | 403 (finalité `VERIFY` ≠ `TRANSFER`) |
| D | Deux `claim` concurrents avec le même nonce | S5 | exactement 1 succès |

### S5 — Consommation non atomique · Confirmé, élargi · Haute

**Preuves**
- `backend/src/transfer/transfer.service.ts:59-73` : `findUnique`, contrôle de `used` en mémoire, puis `update({ where: { nonceValue } })`. L'`update` ne pose aucune condition sur `used`.
- Même schéma dans `backend/src/nonce/nonce.service.ts:28-50`.
- `$transaction` interactive sans niveau d'isolation explicite : on hérite du défaut PostgreSQL, *read committed*.

**Analyse.** Deux `claim` simultanés lisent tous deux `used = false`. Le second `UPDATE` attend le verrou de ligne du premier, puis s'exécute quand même, car sa clause `WHERE` ne porte que sur `nonceValue`. Résultat : deux lignes `Transfer`, et le dernier qui valide devient propriétaire.

**Élargissement : le même problème touche l'actif.**
- Deux `claim` avec deux nonces différents sur le même actif réussissent tous les deux. Le second `Transfer.fromOwnerId` est alors faux : il a été lu avant le premier commit.
- Dans `transfer()`, le contrôle `asset.ownerId !== currentUserId` (`transfer.service.ts:16`) est un *time-of-check / time-of-use*.

**Choix proposé (ADR-0002, Phase 2).** Un `updateMany` conditionnel sur le nonce : `nonceValue`, `used: false`, `expiresAt > now`, `assetId`, `purpose`, en exigeant `count === 1`. Plus un `updateMany` conditionnel sur l'actif : `id`, `ownerId: <propriétaire attendu>`, en exigeant `count === 1`. Les deux dans la même transaction.

**Pourquoi.** Sous *read committed*, PostgreSQL réévalue la clause `WHERE` d'un `UPDATE` sur la version la plus récente de la ligne après avoir attendu son verrou : un seul des deux appels concurrents peut donc obtenir `count = 1`. On n'a besoin ni de SQL brut (Prisma n'expose pas `SELECT … FOR UPDATE`), ni de passer en *serializable*, qui imposerait une boucle de retry. C'est le correctif le plus court qui soit correct.

### S6 — Signature fragile · Confirmé, élargi · Haute

**Preuves**
- Le payload signé est `{brand, model, reference, ownerId}` à cinq endroits dupliqués : `backend/src/asset/asset.service.ts:16-21` et `:45-53`, `backend/src/transfer/transfer.service.ts:28-33` et `:83-88`, `backend/prisma/seed.ts:72`.
- Pas d'`assetId`, de série, de version ni d'émetteur. `name`, `status` et `imageUrl` ne sont pas signés (`schema.prisma:16,20,23`).
- `JSON.stringify` : `backend/src/crypto/crypto.service.ts:15,23` et `backend/prisma/seed.ts:39`, qui duplique `CryptoService.sign`.
- `integrityHash` (`schema.prisma:21`) contient en réalité une signature ECDSA encodée en DER puis en base64. Ce n'est pas un hash.

**Analyse**
- **Transplantation.** Deux montres de même marque, modèle et référence chez le même propriétaire ont le même payload : leurs signatures sont interchangeables. La signature identifie un couple (modèle, propriétaire), pas une montre.
- **Canonicalisation.** Aujourd'hui, ça marche parce que l'ordre des clés est figé dans le code. Mais un vérificateur indépendant, écrit dans un autre langage, ne peut pas reconstruire les octets de façon fiable. Avec RFC 8785 (JCS), l'ordre des clés et la sérialisation des nombres deviennent déterministes.
  - Nuance : JCS **ne normalise pas l'Unicode**. `A. Lange & Söhne` (`seed.ts:34`) peut arriver en NFC ou en NFD et donner deux signatures différentes. Il faut normaliser en NFC à l'entrée (validation des DTO).
- **Renommage.** `prisma migrate dev` génère un `DROP` puis un `ADD COLUMN`, ce qui perdrait les données. La migration de renommage doit être éditée à la main (`ALTER TABLE … RENAME COLUMN`).
- **Format.** La signature est en DER. Une JWS ES256 attend le format IEEE P1363 (`r||s`). Il faudra le prévoir au passage en JWS (P3-03).
- Chaque transfert re-signe et écrase la signature précédente : aucune trace des états antérieurs. Lien avec S9.

### S7 — `GET` qui modifie l'état · Confirmé, élargi · Moyenne

**Preuves**
- `backend/src/asset/asset.controller.ts:44-47` : `@Get(':id/authenticate')` consomme le nonce.
- **Élargi :** `@Get(':id/nonce')` (`:39-42`) crée une ligne en base. C'est aussi un `GET` à effet de bord.

**Analyse.**
- Les aperçus de lien des messageries, le préchargement des navigateurs et certaines apps de scan de QR suivent les URL en `GET`. Ils peuvent consommer le nonce avant l'acheteur.
- Le nonce circule dans la query string (`mobile/app/verify.tsx:19`). Il atterrit donc dans les logs d'accès (Render) et dans l'historique du navigateur.

### S8 — Hygiène API · Confirmé, nuancé · Haute

| Point | Preuve | Verdict |
|---|---|---|
| Pas de `ValidationPipe`, DTO sans validation | `backend/src/main.ts:7-12` (pas de `useGlobalPipes`). `backend/src/auth/dto/auth-credentials.dto.ts:1-4` et `backend/src/asset/dto/create-asset.dto.ts:1-6` n'ont aucun décorateur. `class-validator` est absent de `backend/package.json:22-37`. | Confirmé. Voir aussi N8. |
| CORS ouvert | `backend/src/main.ts:9` : `enableCors()` répond `Access-Control-Allow-Origin: *`. | Confirmé, **nuancé** : l'auth passe par un header `Bearer` et non par des cookies, donc le CORS ouvert n'ouvre pas de CSRF. Restreindre l'origine reste peu coûteux et attendu. |
| Pas de helmet | Absent des dépendances. | Confirmé, **nuancé** : pour une API JSON, l'apport est faible (quelques en-têtes). C'est une hygiène bon marché, pas une faille. |
| Pas de rate limiting | Ni `@nestjs/throttler` ni équivalent. Login : `backend/src/auth/auth.controller.ts:14-17`. | Confirmé : brute force du login, spam de nonces (S2). |
| IDOR sur `GET /assets/:id` | `backend/src/asset/asset.controller.ts:29-32` → `asset.service.ts:36-40` renvoie l'actif complet (`ownerId`, signature) à tout utilisateur connecté. | Confirmé. **Élargi** : `GET /assets/:id/verify` (`:34-37`) et `GET /assets/:id/history` (`backend/src/transfer/transfer.controller.ts:27-30`) n'ont aucun contrôle non plus. L'historique expose les ids de tous les anciens propriétaires. |
| Auto-claim, auto-transfert | `claim` (`transfer.service.ts:53-94`) et `transfer` (`:12-43`) ne refusent pas un destinataire égal au propriétaire actuel. Résultat : des lignes `Transfer` X→X. | Confirmé. |
| Transfert vers un utilisateur inexistant → 500 | Violation de la clé étrangère `Asset_ownerId_fkey` (migration `20260531125616_add_user/migration.sql:15`), aucun filtre d'exception Prisma. | Confirmé. Le test `backend/test/security-critical.e2e-spec.ts:98-107` **attend** ce 500 (voir N6). |
| **Élargi :** `claim` sans nonce → 500 | `@Body('nonce')` vaut `undefined` → `findUnique({ where: { nonceValue: undefined } })` → erreur de validation Prisma → 500. | Nouveau. |

---

## Écart entre promesse et livré

### S9 — Le registre chaîné a disparu · Confirmé, nuancé · Haute

**Preuves.** La migration `backend/prisma/migrations/20260803120000_remove_event_model/migration.sql:2` supprime `Event`, retiré du schéma par le commit `20b1f37` (2026-08-03).

**Nuance importante.** La table `Event` (`backend/prisma/migrations/20260420095557_init/migration.sql:34-42`) ne contenait que `type`, `description`, `createdAt` et `assetId` : **aucun hash, aucun chaînage**. `git log --all -S prevHash` et `-S previousHash` ne renvoient rien. Le registre hash-chaîné n'a donc **jamais existé dans le code**, il n'a jamais été que conceptuel. Ce qui a été supprimé, c'est un simple journal non chaîné. À l'oral, il faut le dire tel quel : « le chaînage était une intention de conception, je l'ai implémenté après le jury ».

### S10 — Trous métier · Confirmé · Haute

| Point | Preuve |
|---|---|
| Pas de numéro de série ni de calibre | `backend/prisma/schema.prisma:14-30` |
| Pas d'événements de cycle de vie | Voir S9. `AssetStatus` (`schema.prisma:63-67`) déclare `INACTIVE` et `TRANSFERRED`, mais ces statuts ne sont jamais écrits nulle part. |
| Pas d'émetteur | `CryptoService` (`crypto.service.ts:9-12`) porte une clé unique de plateforme. `POST /assets` (`asset.service.ts:15-29`) signe ce que **n'importe quel utilisateur** saisit. Voir N3. |
| Images en dur par référence | `mobile/lib/watchImages.ts:1-7` : 5 références seulement. Les 4 montres de `certis@pro.com` dans le seed (`seed.ts:31-34`) n'ont pas d'image. |

---

## Frontend

### F1 — Pas de responsive, emojis · Confirmé · Haute

- Aucune occurrence de `useWindowDimensions`, `Dimensions`, `maxWidth` ni de breakpoint dans `mobile/app`, `mobile/components` et `mobile/theme` (vérifié par grep).
- Emojis : `mobile/app/verify.tsx:38` (✅/❌), `mobile/app/claim.tsx:36`, `mobile/app/watch/new.tsx:87`, `mobile/app/transfer/[id].tsx:51`.
- Éléments qui ne correspondent pas aux codes du luxe :
  - l'id brut du propriétaire et la signature tronquée présentée comme « Empreinte » (`mobile/app/watch/[id].tsx:207-214`) ;
  - l'enum `ACTIVE` affiché tel quel dans une `Chip` (`:215`) ;
  - des textes sans accents (« Modele », « Reference », « Retour a la liste ») ;
  - une palette nommée `porscheGreen` (`mobile/theme/tokens.ts:2`).

---

## Constats supplémentaires

### N1 — Branding Audemars Piguet dans un projet public · Critique (réputation et juridique)

**Preuves**
- `mobile/app.json:3` : `"name": "Audemars Piguet Certis"`. Icône et splash utilisent `./assets/logo AP.jpeg` (`:8,12,17,25,27`).
- `mobile/components/BrandLogo.tsx:4` charge `logo AP.jpeg`. Ce composant apparaît sur **tous** les écrans.
- Texte « Audemars Piguet » en dur : `mobile/app/index.tsx:62`, `mobile/app/dashboard.tsx:83`, `mobile/app/watch/[id].tsx:164` (affiché au-dessus d'une Rolex), `mobile/app/transfer/[id].tsx:73`. Et « Collection privée AP » (`mobile/app/dashboard.tsx:90`).

**Analyse.**
- Le nom et le logo d'une maison sont utilisés dans un dépôt public et un déploiement public, alors que tu as été en stage dans sa Digital Factory.
- C'est très probablement la source de la confusion du jury entre bachelor, stage et politique de l'entreprise.
- Pour un recruteur du secteur, et pour AP elle-même, cela peut se lire comme un projet AP non autorisé ou comme une fuite d'intention interne.
- Je ne qualifie pas le risque juridique précisément (je ne suis pas juriste). Le risque de réputation, lui, est certain.

**Correction (P1-05).**
- Rebrand neutre « Certis » : `mobile/assets/logo-certis.png` existe déjà.
- Mention de non-affiliation.
- Émetteurs fictifs dans le seed (décision à prendre, voir les questions).

### N2 — La vérification affiche « invalide » pour toute erreur · Haute

- `mobile/app/verify.tsx:18-22` : la moindre erreur (401 faute de compte, réseau, nonce expiré ou déjà utilisé) donne `setValid(false)`. L'écran affiche alors « Authenticité invalide » et « La signature ne correspond pas aux données enregistrées » (`:40-46`).
- Tout `AssetController` est protégé par JWT (`asset.controller.ts:11`). **Un acheteur sans compte Certis voit donc toujours « invalide ».**
- Un faux négatif sur un écran anti-contrefaçon peut faire capoter la vente d'une montre authentique. Il faut trois états : *authentique*, *non authentique*, *vérification impossible* (avec la raison).

### N3 — « Authentique » n'est pas démontré · Haute

`POST /assets` est ouvert à tout utilisateur, et la plateforme signe les champs saisis (`asset.service.ts:15-29`). N'importe qui peut donc créer une « Patek Philippe Nautilus 5711/1A-010 » et obtenir « Montre authentique ».

Ce que la signature prouve réellement : *cet enregistrement existe chez Certis et n'a pas été modifié par quelqu'un qui n'a pas la clé*. Elle ne dit rien de l'authenticité de la montre. C'est le cœur de l'écart entre promesse et livré, et la raison d'être du modèle émetteur (section 4).

### N4 — Aucune vérification indépendante · Haute

- La clé publique n'est exposée nulle part.
- La vérification n'existe que côté serveur, derrière JWT (`asset.controller.ts:34-37`).
- Le commentaire de `backend/scripts/generate-keys.ts:3` (« tout le monde peut vérifier ») n'est pas réalisé : le modèle actuel est « fais confiance au serveur ».

### N5 — Les tests e2e effacent la base de dev · Haute

- Les tests n'importent pas `dotenv`. Ils utilisent `process.env.DATABASE_URL ??= '…/certis_db'` (`backend/test/security-critical.e2e-spec.ts:20`, `backend/test/app.e2e-spec.ts:13`), c'est-à-dire **la même base que le dev**.
- `cleanDatabase` (`security-critical.e2e-spec.ts:209-214`) supprime tous les utilisateurs et tous les actifs.
- Si une `DATABASE_URL` de production est exportée dans le shell, `npm run test:e2e` efface la production.

### N6 — Tests et CI · Moyenne

- `security-critical.e2e-spec.ts:107` **attend un 500** : le test grave le bug S8 dans le marbre.
- `app.e2e-spec.ts` ne teste que « Hello World! ».
- Aucun `*.spec.ts` unitaire dans `backend/src`, et pas de dossier `.github/`. Aucune CI.

### N7 — Transfert direct sans consentement · Haute

- `POST /assets/:id/transfer` (`transfer.controller.ts:18-25`) pousse la propriété vers un id arbitraire, sans que le destinataire accepte.
- On peut ainsi attribuer une montre (plus tard une montre volée) à quelqu'un à son insu.
- L'écran correspondant (`mobile/app/transfer/[id].tsx`) n'est atteignable depuis aucune navigation (vérifié : aucun `router.push` vers `/transfer`). L'endpoint, lui, est actif.
- Correction : supprimer l'endpoint au profit de l'offre en deux temps (P2-04).

### N8 — Assignation de masse · Moyenne

`asset.service.ts:25` fait `...dto` sans liste blanche. Un client peut imposer `id` ou `status` (`TRANSFERRED`, `INACTIVE`) à la création. `ownerId` et `integrityHash` sont écrasés ensuite, mais uniquement à cause de l'ordre des propriétés : c'est fragile.

### N9 — Seed · Haute si le seed a tourné en production

- `backend/prisma/seed.ts:18-20` : le compte `certis@pro.com` a le mot de passe `1234567`, en clair dans un dépôt public. Si la base de production a été seedée, **n'importe qui peut se connecter en prod avec ce compte**.
- `seed.ts:15` : le hash bcrypt est marqué « factice ». Ce compte ne fonctionne probablement pas (à vérifier).
- `seed.ts:50-55` efface toutes les tables sans aucune garde d'environnement.

### N10 — Hébergement Render gratuit · Moyenne

D'après la [documentation Render](https://render.com/docs/free), consultée le 2026-10-23 :
- une base Postgres gratuite **expire 30 jours après sa création**, puis est supprimée après 14 jours de grâce ;
- un service web gratuit **s'endort après 15 minutes** sans trafic et met environ une minute à redémarrer ;
- le disque est **éphémère** : les fichiers envoyés sont perdus à chaque redéploiement.

Cela explique probablement l'abandon de l'upload d'images (`7b5a5b1`, puis `0158de1`). Pour une vitrine destinée à rester en ligne pour des recruteurs, ce n'est pas une prod durable. Décision à documenter dans ADR-0008 (Phase 1).

### N11 — Démo dépendante d'Expo Go · Moyenne

- Le projet est sur Expo SDK 54 (`mobile/package.json:14`, sortie le 2025-09-10). La dernière version est le SDK 58 (2026-09-29), selon le registre npm consulté le 2026-10-23.
- Expo Go ne prend en charge qu'un SDK à la fois, et seule la dernière version est installable sur iPhone physique.
- Au 2026-05-04, Expo indiquait que la version SDK 54 restait sur les stores, car la version SDK 55 était bloquée en validation chez Apple ([changelog Expo](https://expo.dev/changelog/expo-go-and-app-store-may-2026)).
- La démo « 2 téléphones avec Expo Go » (`README.md:42`) peut casser du jour au lendemain. Il faut un plan B (P5-02).
- **Recommandation : ne pas monter de version d'Expo pendant la refonte** (voir le backlog).

### N12 — Version de Node · Basse

`README.md:39` recommande Node 20, en fin de vie depuis le 2026-04-30 ([calendrier Node.js](https://github.com/nodejs/Release/blob/main/schedule.json)). La LTS active est Node 24 (24.22.1, 2026-10-20). Il n'y a ni `.nvmrc` ni champ `engines` sur `main`.

### N13 — Promesses retirées, code mort · Basse

- `README.md:19` annonce « création d'une montre avec photo ». En réalité, c'est un champ d'URL libre (`mobile/app/watch/new.tsx:119-127`). L'upload ajouté dans `22244a3` a été retiré dans `7b5a5b1`.
- Restes de cet upload : `backend/public/uploads/*.jpg` (4 fichiers), `@types/multer` (`backend/package.json:47`), `expo-image-picker` (`mobile/package.json:16`, jamais importé).
- `NonceModule` est importé deux fois (`backend/src/app.module.ts:13`).
- L'`imageUrl` libre est chargée par le client de chaque visiteur : l'hôte tiers voit passer l'IP de chaque personne qui consulte la montre.

### N14 — Session web · Basse (résiduel assumé)

- Sur le web, le JWT est stocké en `localStorage` (`mobile/lib/storage.ts:8-20`) : une faille XSS suffit à le voler.
- Le token expire au bout d'une heure (`auth.module.ts:13`), sans refresh ni révocation, et la déconnexion reste purement locale.
- C'est acceptable pour une implémentation de référence, à condition d'avoir une CSP et de le documenter dans le modèle de menace.

### N15 — Historique git · Basse

- Quelques messages de commit comme `22244a3 "FUCK YEAH"`, ou 4 commits identiques « fix: error rounting on prod ».
- Un tech lead lit l'historique. Je **ne propose pas** de le réécrire (règle 10, et ce serait effacer l'état que le jury a vu).
- La réponse passe par les branches de phase en Conventional Commits, plus une ligne dans le README : « historique antérieur au jury conservé tel quel ».

---

## Questions ouvertes (à trancher par toi)

1. **La clé ECDSA de production est-elle celle de `backend/.env` ?** `JWT_SECRET` est-il bien renseigné sur Render ? Le déploiement Render est-il encore en ligne ? Et la base de prod a-t-elle été seedée (compte `certis@pro.com` / `1234567`) ?
2. **Dépôt boilerplate** : il contient l'historique de Certis, clé comprise. Doit-il rester public ?
3. **Émetteurs du seed** : maisons réelles (Rolex, Patek…) ou maisons fictives ? Je recommande des maisons fictives, parce qu'un passeport « signé Rolex » avec une clé détenue par Certis est une usurpation, même en démo.
4. **Licence** : voir la question dans `BACKLOG.md`.
