# Backlog Certis — post-jury

Date : 2026-10-23 · Source : [`AUDIT.md`](AUDIT.md) · Suivi des critiques : [`JURY_FEEDBACK_MAP.md`](JURY_FEEDBACK_MAP.md)

## Décisions du 2026-10-23 (après revue de la Phase 0)

- **Objectif prioritaire** : une version de Certis **fonctionnelle**, testable en local, **déployée**, avec une UI/UX de haut niveau.
- **Ordre d'exécution** : Phase 1 (le faire tourner et le rendre déployable) → Phase 2 (faille de transfert) → **Phase 4 (UI/UX)** → Phase 3 (domaine, limité à ce que l'UI montre) → Phase 5 → Phase 6.
- **Pas d'échéance.** Les estimations servent d'ordre de grandeur, pas de planning.
- `.env` : clés de dev uniquement. Aucune réécriture d'historique (P1-02 réduit à un remote `certis` et une note). Le boilerplate reste public.
- Seed : 2 ou 3 montres de marques réelles. Licence : aucune.

## Conventions

- **MoSCoW** :
  - *Must* : sans lui, une critique du jury ou un point de la Definition of Done reste ouvert.
  - *Should* : forte valeur, mais coupable si le planning dérape.
  - *Could* : seulement s'il reste du temps.
  - *Won't* : explicitement hors de cette itération, avec la raison.
- **Estimation** : heures idéales de travail concentré, revue et tests compris. Le total est majoré de 30 % pour les imprévus (voir le registre des risques). L'écart réel/estimé est relevé à chaque fin de phase : c'est la preuve de méthode.
- **Workflow** : une branche par phase (`phase-N/<slug>`) et des commits Conventional Commits. Pour chaque faille, le test rouge et le correctif sont dans deux commits distincts. La phase s'arrête sur une revue de ta part.
- **Done (par item)** : critères d'acceptation vérifiés, CI verte (à partir de P1-07), ADR écrite si l'item en prévoit une, ligne du `JURY_FEEDBACK_MAP` mise à jour si l'item en ferme une.

---

## 0. Avis franc sur la cible produit (section 4)

Résumé : **la direction est la bonne, le volume ne l'est pas.** La section 4 prise au pied de la lettre (clés par acteur, VC, Merkle et ancrage, NFC, DPP) représente plus que le reste du backlog réuni. Le jury a reproché trois choses : une faille, une démo maigre et un manque de méthode. Aucune de ces critiques ne se règle avec plus de cryptographie. Mon critère de tri : chaque élément doit soit fermer une critique du jury, soit rendre défendable la phrase « je comprends le problème mieux que la moyenne ».

| Proposition | Verdict | Pourquoi |
|---|---|---|
| Émetteur = maison, clé par émetteur, JWKS public | **Garder, en version honnête** | C'est la correction conceptuelle principale (N3 : aujourd'hui, la plateforme signe ce que l'utilisateur tape). Mais si Certis génère et garde les clés des maisons, la séparation reste logique, pas réelle. Proposition : les clés vivent côté serveur pour la démo (une par émetteur, avec `kid`), l'ADR-0003 décrit la cible (clé dans le HSM/KMS de la maison, Certis ne connaît que la clé publique), et ce n'est pas présenté comme davantage. |
| Clé plateforme séparée de la clé émetteur | **Garder** | Coût quasi nul une fois les `kid` en place. La plateforme signe ce qu'elle atteste (événement de transfert, checkpoint d'ancrage), la maison signe ce qu'elle certifie (émission, service). |
| Passeport canonique signé | **Garder : JWS compacte ES256 sur un payload JCS** | Ce n'est pas redondant. JWS signe des octets ; JCS garantit que n'importe qui reconstruit les mêmes octets à partir des données (chaîne de hash, vérificateur indépendant). |
| W3C Verifiable Credentials | **Couper (Won't), mais rester « compatible VC »** | VC Data Model 2.0 et VC-JOSE-COSE sont des Recommandations W3C ([VC DM 2.0](https://www.w3.org/TR/vc-data-model-2.0/), 2025-05-15 ; [VC-JOSE-COSE](https://www.w3.org/TR/vc-jose-cose/), REC 2025-05-15, republiée le 2026-10-13, consultée le 2026-10-23). Le coût : contextes JSON-LD, méthode DID, cryptosuites. L'acheteur ou la maison de ventes n'en tire aucun bénéfice visible. Je nomme les champs comme en VC (`issuer`, `validFrom`, `credentialSubject`), ce qui permet un emballage `application/vc+jwt` plus tard sans refonte. ADR-0004. |
| `serialHash` | **Garder (Must, peu coûteux)** | Signal fort de compréhension métier, pour environ 2 h de travail. Le vrai sujet est le choix du schéma : HMAC à clé émetteur ou sel public + KDF lente, car l'espace des numéros de série est petit et un hash salé simple se force par brute force. ADR-0005. |
| Journal append-only chaîné, 5 types d'événements | **Garder** | Ferme S9 et nourrit la démo. L'append-only est imposé **par la base** (trigger qui refuse `UPDATE`/`DELETE`, contrainte `UNIQUE(assetId, seq)` contre les fourches), pas par discipline applicative. |
| Événements « signés par l'acteur » | **Couper (Could)** | Un propriétaire n'a pas de clé. Lui en donner une (clé d'appareil, WebAuthn) est un projet en soi. Les événements sont signés par la maison (`MINT`, `SERVICE`) ou par la plateforme, qui enregistre l'`actorId` authentifié. Résiduel documenté dans le modèle de menace. |
| `STOLEN_REPORTED` bloque les transferts | **Garder (Must)** | Moment fort de la démo (étape 7), environ 2 h de travail. |
| Ancrage Merkle + RFC 3161 / OpenTimestamps | **Réduire** | *Must* : le vérificateur indépendant (il répond à « l'admin peut tout recalculer » du côté de la détection). *Should* : un ancrage, un seul, choisi par ADR-0007. Ma préférence provisoire va à RFC 3161 : jeton immédiat, vérifiable avec `openssl ts` sans dépendance. OpenTimestamps est gratuit et sans compte, mais la confirmation Bitcoin n'est pas immédiate, ce qui est un mauvais choix pour une démo en direct. L'ancrage tourne dans un workflow GitHub Actions planifié (gratuit) qui versionne les reçus : pas d'infra cron. Merkle seulement si une preuve d'inclusion par actif est nécessaire ; sinon, un checkpoint (hash JCS des têtes de chaîne) suffit. |
| Transfert en deux temps (offre → claim) | **Garder (Must)** | C'est la correction directe de la critique du jury. Supprimer en même temps le transfert direct sans consentement (N7). |
| Rôles `OWNER` / `ISSUER` / `SERVICE_CENTER` + vérification publique | **Garder, sans framework RBAC** | Un enum `Role` et un guard `@Roles()` suffisent. La vérification publique sans compte est *Must* : c'est le parcours de la maison de ventes, et c'est N2. |
| NFC (NTAG 424 DNA / SUN) | **Documentation seulement (Should), simulateur en Won't** | Point clé à documenter : NTAG 424 DNA authentifie par AES-128 (SUN), donc chaque scan doit être vérifié par le détenteur de la clé symétrique, c'est-à-dire un oracle en ligne. NXP propose aussi NTAG X DNA, avec cryptographie asymétrique PKI et certification EAL6+ selon NXP, positionné explicitement sur le DPP ([NXP](https://nxp.com/company/about-nxp/newsroom/NW-NXP-ENABLES-SECURE-AUTHENTICATION), consulté le 2026-10-23). Lui seul permettrait une vérification hors ligne cohérente avec « sans faire confiance à Certis ». À confirmer : la faisabilité d'une puce dans un boîtier métallique. Je n'ai pas de source fiable là-dessus, la carte de garantie NFC est l'hypothèse réaliste, et elle se sépare de la montre. |
| « DPP-ready » | **Documentation seulement (Should)** | Tes repères sont confirmés : registre opérationnel le 2026-07-20, passeport batteries obligatoire le 2027-02-18, actes délégués textiles, aluminium et pneus attendus au T3–T4 2027 (indicatif), le tout selon la [page DPP de la Commission](https://single-market-economy.ec.europa.eu/single-market/digital-product-passport_en), consultée le 2026-10-23. Je n'ai trouvé **aucune** mention des montres mécaniques ou de la joaillerie dans le plan de travail ESPR 2025-2030 (COM(2025) 187, 2025-04-16) ni dans l'étude JRC. Seules les montres connectées apparaissent, dans les travaux sur la réparabilité des produits électroniques, d'après une source secondaire. **Incertitude** : je n'ai pas pu lire le texte EUR-Lex directement (accès bloqué). En Suisse, le Conseil fédéral a ouvert le 2026-06-05 une consultation sur la révision de la LETC, qui crée la base légale d'un passeport numérique de produit (fin le 2026-09-28) ([admin.ch](https://www.admin.ch/fr/newnsb/k4JemTZmDs6ON5OOOP--_)). |

**Ce que je couperais en premier si le temps manque**, dans l'ordre : ancrage (on garde le vérificateur), upload d'images, one-pager DOM détaillé, `SERVICE_CENTER` (fusionné avec `ISSUER`), Merkle. **Ce que je ne couperais jamais** : la Phase 2 complète, la vérification publique, la Phase 4 desktop, la démo chronométrée.

---

## Phase 1 — Hygiène et secrets · branche `phase-1/hygiene`

| ID | Item | MoSCoW | Est. | Couvre | Critères d'acceptation |
|---|---|---|---|---|---|
| P1-01 | Sortir `backend/.env` du suivi, créer `backend/.env.example`, régénérer la clé ECDSA et le `JWT_SECRET`, re-signer le seed, restaurer `.gitignore` | Must | 2 h | S1, N9 | `git ls-files \| grep '\.env$'` est vide. Une signature produite avec l'ancienne clé publique est rejetée (test). Scan gitleaks propre sur `HEAD`. Mot de passe de seed fort, généré, absent du dépôt. |
| P1-02 | Ajouter le remote `certis` à ce checkout. Historique : décision du 2026-10-23, aucune réécriture (clés de dev uniquement). | Must | 0,25 h | N0 | `git remote -v` liste `Niwa-Yume/certis`. |
| P1-03 | Validation de la config au démarrage (fail-fast), suppression de tous les fallbacks de secrets | Must | 2 h | S1 | Démarrer sans `JWT_SECRET`, avec un secret de moins de 32 octets, ou avec une clé ECDSA illisible ou non P-256, fait échouer le process avec un message explicite (test). `grep -rn "?? '" backend/src` ne trouve aucun secret. Pas de nouvelle dépendance : `node:crypto` suffit. |
| P1-04 | Corriger `render.yaml` : variables ECDSA, `prisma migrate deploy`, ordre du build, version de Node | Must | 1,5 h | S1, N10 | Chaque variable exigée par P1-03 est déclarée. Les migrations s'appliquent au déploiement. ADR-0008 (hébergement) tranche la question de la base gratuite qui expire à 30 jours. |
| P1-05 | Rebrand neutre « Certis » : retirer nom et logo AP, ajouter une mention de non-affiliation | Must | 2 h | N1, jury « confusion » | `grep -rniE "audemars|logo AP|collection privée AP" mobile` est vide. `app.json` s'appelle `Certis` et utilise `logo-certis.png`. L'image `logo AP.jpeg` est supprimée. |
| P1-06 | Base de test dédiée, tests qui refusent de tourner sur une autre base | Must | 1,5 h | N5 | Les e2e tournent sur `certis_test`. Lancer les e2e avec une URL qui ne contient pas `_test` échoue avant toute requête. |
| P1-07 | CI GitHub Actions : lint, typecheck (backend et mobile), tests unitaires, e2e avec un service Postgres | Must | 3 h | N6, jury « méthode » | La CI est verte sur la PR de phase. Un commit volontairement cassé la fait passer au rouge (capture). |
| P1-08 | Node 24 LTS : `.nvmrc` + `engines` | Should | 0,5 h | N12 | La CI utilise `.nvmrc`. |
| P1-09 | Nettoyage : `public/uploads`, `@types/multer`, `expo-image-picker`, double `NonceModule`, README corrigé (« avec photo ») | Should | 1 h | N13 | Build et tests verts, README conforme au code. |
| P1-11 | Corriger la sortie du build (`include: ["src"]`) pour que `start:prod` démarre | Must | 0,25 h | N16 | `npm run build && npm run start:prod` répond sur `/` (vérifié en CI). |
| P1-12 | Aligner les dépendances Expo sur le SDK 54 (`npx expo install --fix`) | Must | 0,5 h | N17 | `expo start` n'affiche plus d'avertissement de version. Login vérifié sur Expo Go. |
| P1-13 | Lancement local en une commande (base, API, web) et seed utilisable : 2 ou 3 montres avec image sur un compte qui fonctionne | Must | 1,5 h | N9, DoD | Sur un clone neuf, `docker compose up -d` puis une commande, et on se connecte pour voir des montres avec image. |
| P1-10 | ~~Fichier `LICENSE`~~ : décision du 2026-10-23, pas de licence pour l'instant | Won't | 0 h | open science | `LICENSE` à la racine, `license` renseigné dans les `package.json` (aujourd'hui `UNLICENSED`, `backend/package.json:7`). |

**Total Phase 1 : environ 16 h.**

### Bilan Phase 1 (2026-10-23, branche `phase-1/hygiene`)

| ID | Statut | Preuve | Écart par rapport aux critères |
|---|---|---|---|
| P1-01 | Fait | `22412d8`, `6867382`. Aucun `.env` ni clé privée dans `HEAD` (`git grep "BEGIN PRIVATE KEY" HEAD` est vide). | Pas de scan gitleaks (outil non installé), remplacé par le `git grep`. Les mots de passe du seed restent ceux de démo, conformément à ta décision du jour. |
| P1-02 | Fait | Remote `certis` ajouté. ADR-0001. | Push protection GitHub : à activer par toi. |
| P1-03 | Fait | `6867382`, `src/config/env.spec.ts` (6 tests). Démarrage sans config : message explicite et code de sortie 1. | — |
| P1-04 | Fait | `a98ec9b`, ADR-0008. Démarrage Render simulé en local (variables seules, sans `.env`). | Pas encore déployé : il faut ton compte Render et ton compte Neon (voir README, Déploiement). |
| P1-05 | Fait (identité provisoire) | `4dbfb22`. Le `grep` sur « Audemars » ne renvoie plus que les données de montres. Mention de non-affiliation dans le README. | Icônes : placeholders Expo en attendant l'identité visuelle de la Phase 4. |
| P1-06 | Fait | `38e4c63`. Le garde-fou refuse `certis_db`. | — |
| P1-07 | Fait localement | `367eb9a`. Toutes les étapes passent en local. | Pas encore exécutée sur GitHub : la branche n'est pas poussée. |
| P1-08 | Fait | `.nvmrc` = 24 (lu par Render et par la CI). | Pas d'`engines` : Node 22 en local reste accepté. |
| P1-09 | Partiel | README « photo par URL », `dotenv` déclaré. | `public/uploads`, `@types/multer`, `expo-image-picker` et le double `NonceModule` sont reportés (*Should*). |
| P1-11 | Fait | `00f77a8`. Le build produit `dist/main.js`, et `start:prod` démarre. | — |
| P1-12 | Fait | `ded7e33`. `expo-doctor` 18/18. | Login sur Expo Go non vérifié (pas de téléphone ici). |
| P1-13 | Fait | `b30c074`, `6cf142a`. `npm run dev` testé aussi en partant d'un `.env` absent. Les deux comptes se connectent et voient leurs montres avec image. Transfert pro → julien : 201, signature valide. | Test sur un clone neuf non fait, à cause du conflit avec le conteneur `certis_db` existant. |

**Estimé / réel** : environ 16 h estimées pour un développeur, environ 30 min de temps agent d'après l'horodatage des commits. Les deux ne sont pas comparables. L'estimation humaine reste la référence de planning.

**Imprévus rencontrés**
- Le harnais d'aperçu exportait `PORT`, ce qui détournait l'API vers le port du web : `PORT` est désormais forcé à 3001 dans `dev.mjs`.
- Le premier lancement des e2e, avant leur isolation, a vidé la base de dev : c'est exactement le constat N5 que P1-06 corrige.
- Un commit embarquait par erreur des suppressions déjà indexées : il a été défait localement (non poussé) et refait.

## Phase 2 — Sécurité du transfert · branche `phase-2/transfer-security`

| ID | Item | MoSCoW | Est. | Couvre | Critères d'acceptation |
|---|---|---|---|---|---|
| P2-01 | **Tests rouges d'abord** : chaînes A, B, C, D de l'audit, transplantation de signature, IDOR (`GET /assets/:id`, `/history`, `/verify`), auto-claim, destinataire inexistant, assignation de masse, `claim` sans nonce | Must | 5 h | S2–S8, N6–N8 | Un commit `test(security): …` où ces tests **échouent** (sortie CI en capture). Le test qui attend 500 (`security-critical.e2e-spec.ts:107`) est corrigé pour attendre un 4xx. |
| P2-02 | Nonce avec finalité (`VERIFY` / `TRANSFER`), lié à l'actif, émis uniquement par le propriétaire | Must | 3 h | S2, S3, S4 | Chaînes A, B et C au vert. Migration Prisma ajoutant `purpose` et `issuedById`. |
| P2-03 | Consommation atomique : `updateMany` conditionnel sur le nonce, garde optimiste sur `ownerId` | Must | 2 h | S5 | 20 `claim` concurrents donnent exactement 1 succès et 19 refus (test répété 20 fois en CI sans échec intermittent). ADR-0002. |
| P2-04 | Transfert en deux temps : `POST /assets/:id/transfer-offers` (propriétaire, TTL court, destinataire optionnel), puis `POST /assets/:id/claim`. Suppression de `POST /assets/:id/transfer` et de l'écran mort `mobile/app/transfer/[id].tsx`. Adaptation du mobile. | Must | 5 h | S4, S8, N7 | Auto-claim refusé (409). Offre ciblée réclamée par un tiers : 403. Destinataire inexistant : 404, jamais 500. |
| P2-05 | Plus aucun `GET` à effet de bord : génération et consommation des nonces en `POST`, nonce retiré de la query string | Must | 2 h | S7 | `GET` ne modifie plus rien (vérifié par revue des routes). Le nonce n'apparaît plus dans les URL loggées. |
| P2-06 | Signature : payload avec `assetId` et `v`, tous les champs affichés, JCS (RFC 8785), NFC à l'entrée, `integrityHash` renommé `signature` (migration éditée à la main), seed et serveur partagent le même code | Must | 2,5 h | S6 | Test de transplantation au vert. La migration conserve les données (test sur une copie). Une seule fonction de signature dans le code. |
| P2-07 | Hygiène API : `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`), DTO décorés, CORS en liste blanche via env, helmet, throttler sur login, register et nonces, filtre d'erreurs Prisma → 4xx, `GET /assets/:id` et `/history` réservés au propriétaire | Must | 5 h | S8, N8 | Tests IDOR et assignation de masse au vert. 11 tentatives de login par minute → 429. Aucun 500 dans la suite e2e. |
| P2-08 | Écran de vérification à trois états (authentique / non authentique / vérification impossible + raison), sans emoji. Version fonctionnelle, le design vient en Phase 4. | Must | 1,5 h | N2, F1 | Un 401 ou une erreur réseau n'affiche jamais « non authentique ». |
| P2-09 | `docs/security/THREAT_MODEL.md` (STRIDE allégé) avec résiduels assumés : clonage physique sans NFC, compromission de la clé émetteur, admin de la base, JWT web (N14), carte séparée de la montre | Must | 3 h | jury « méthode » | Chaque menace renvoie à un test, à un contrôle ou à un « accepté, parce que… ». |

**Total Phase 2 : environ 29 h.**

### Bilan Phase 2 (2026-10-23, branche `phase-2/transfer-security`)

**Rouge, puis vert.**
- `9fd0503` : 18 tests sur 22 en échec, chacun parce que l'attaque réussit. Le relevé est dans le message de commit ; par exemple, 10 claims concurrents réussissent avec le même nonce.
- Après les correctifs : **22 tests sur 22**. Le test D (concurrence) est passé 15 fois sur 15.

| ID | Statut | Preuve | Écart par rapport aux critères |
|---|---|---|---|
| P2-01 | Fait | `9fd0503` (rouge) | Le relevé rouge est dans le message de commit plutôt qu'en capture CI, puisque la branche n'est pas poussée. |
| P2-02 | Fait | `90b0b35`. Tests A, B, C au vert. | — |
| P2-03 | Fait | `90b0b35`, ADR-0002. Test D : 15/15. | Répété 15 fois au lieu de 20. |
| P2-04 | Fait | `90b0b35`, `d337821`. Tests G, H et offres ciblées. | Pas de champ « destinataire » dans l'UI (l'API le gère) : prévu en Phase 4. |
| P2-05 | Fait | `4199566`. Test K. | Le nonce reste dans l'URL du front (QR) : résiduel n° 6. |
| P2-06 | Fait | `7fca3b2`. Test E, `canonical-json.spec.ts`. | Canonicalisation maison (environ 15 lignes) plutôt que le paquet `canonicalize`, et testée sur les exemples du RFC. |
| P2-07 | Fait | `5e18f80`. Tests F, I, J, L, N. CORS et helmet vérifiés en direct. | Pas de filtre d'erreurs Prisma (la validation ferme les 500 connus). `TRUST_PROXY_HOPS=1` est une hypothèse. |
| P2-08 | Fait | `d337821`. Trois états vérifiés dans Expo web. | Les autres emojis (claim, ajout) restent pour la Phase 4. |
| P2-09 | Fait | `docs/security/THREAT_MODEL.md` | — |

**Ajouté en cours de route** (non prévu au backlog) : la vérification est **publique**, sans compte (test M). C'était la cause principale du faux « non authentique » de l'écran de vérification (N2).

**Imprévus rencontrés**
- supertest refermait le serveur éphémère entre deux requêtes : l'app de test écoute désormais sur un port fixe.
- Prisma 7 ne régénère plus le client après `migrate dev`, et `nest --watch` garde les types en cache : après un changement de schéma, il faut relancer `npm run dev`.
- Prettier remplace les échappements `\uXXXX` par les caractères eux-mêmes : les tests Unicode construisent leurs chaînes à partir des unités UTF-16.

## Phase 3 — Domaine et registre · branche `phase-3/domain-registry`

| ID | Item | MoSCoW | Est. | Couvre | Critères d'acceptation |
|---|---|---|---|---|---|
| P3-01 | Modèle `Issuer`, une clé par émetteur avec `kid`, endpoint `/.well-known/certis-keys` (format JWKS, RFC 7517), clé plateforme distincte | Must | 4 h | S10, N3, N4 | JWKS public et sans auth. Une rotation de clé laisse les anciens passeports vérifiables. ADR-0003. |
| P3-02 | Rôles `OWNER` / `ISSUER` / `SERVICE_CENTER`, guard `@Roles()`, émission réservée à `ISSUER` | Must | 3 h | N3 | Un `OWNER` qui tente d'émettre reçoit 403 (test). |
| P3-03 | Passeport : payload JCS `{v, assetId, issuer, brand, model, reference, caliber, issuedAt, serialHash}`, en JWS compacte ES256 via `jose` | Must | 4 h | S6, S10 | Vérifiable avec la JWKS seule, sans appel à Certis (test). ADR-0004. |
| P3-04 | `serialHash` | Must | 2 h | S10 | Le numéro de série n'est stocké nulle part en clair (test sur le schéma et les réponses API). ADR-0005. |
| P3-05 | Journal d'événements `MINT`, `TRANSFER`, `SERVICE`, `STOLEN_REPORTED`, `RECOVERED` : `seq`, `prevHash`, `hash`, `actorId`, signature (`kid`). Écrit dans la même transaction que le changement d'état. Trigger anti-`UPDATE`/`DELETE`, `UNIQUE(assetId, seq)`. | Must | 6 h | S9 | Un `UPDATE` SQL direct sur `Event` est refusé par la base (test). Deux événements concurrents ne forment jamais de fourche. ADR-0006. |
| P3-06 | `STOLEN_REPORTED` bloque offres et claims, `RECOVERED` les débloque (droits définis dans l'ADR-0006) | Must | 2 h | démo étape 7 | Un claim sur une montre volée renvoie 423 avec un message explicite (test). |
| P3-07 | Vérification publique sans compte : passeport, statut et provenance pseudonymisée (aucun id ni email de propriétaire), avec rate limit | Must | 2 h | N2, S8 | Accessible sans token. Aucune donnée personnelle dans la réponse (test). |
| P3-08 | Vérificateur indépendant `tools/verify` : sans Nest ni Prisma, prend un export JSON et la JWKS, signale le premier maillon cassé | Must | 4 h | S9, N4 | Modifier une ligne en base fait signaler l'altération par le vérificateur (test). README d'utilisation en 3 commandes. |
| P3-09 | Ancrage : checkpoint (ou racine Merkle), RFC 3161 **ou** OTS, workflow GitHub Actions planifié qui versionne les reçus | Should | 5 h | réponse à « l'admin peut tout recalculer » | Un reçu vérifiable par `openssl ts -verify` (si RFC 3161). ADR-0007. |
| P3-10 | Migrations propres (ajouts uniquement, aucune réécriture de migration déjà appliquée) et seed réaliste : émetteurs, séries, calibres, garde d'environnement | Must | 3 h | N9, S10 | Le seed refuse de tourner si `NODE_ENV=production`. 2 ou 3 montres de marques réelles (décision du 2026-10-23). |
| P3-11 | Catalogue de références avec images servi par le backend, suppression de `mobile/lib/watchImages.ts` | Should | 2 h | S10 | Plus aucun mapping d'image dans le front. |

**Total Phase 3 : environ 37 h.**

### Bilan Phase 3 (2026-10-24, branche `phase-3/domain-registry`)

**Rouge, puis vert.**
- `f1df856` : 17 tests sur 38 en échec, chacun pour la raison attendue. Le plus parlant : un simple propriétaire inscrit une « Nautilus 5711/1A-010 » et reçoit 201 au lieu de 403 (N3).
- Après `81f0395` et `3e0ff0c` : **38 tests e2e sur 38**, et 12 tests unitaires.

| ID | Statut | Preuve | Écart par rapport aux critères |
|---|---|---|---|
| P3-01 | Fait | `3e0ff0c`, ADR-0003. Tests N4 (×2) et P3-01 (rotation). | La JWKS ajoute un membre `issuer` à chaque clé : non standard, mais nécessaire pour vérifier qu'une inscription vient bien de la maison nommée. |
| P3-02 | Fait, simplifié | `3e0ff0c`. Test N3. | Deux rôles (`OWNER`, `ISSUER`) : `SERVICE_CENTER` est fusionné avec `ISSUER`, premier élément de l'ordre de coupe. Un guard dédié plutôt qu'un décorateur `@Roles()` : deux routes seulement. |
| P3-03 | Fait | `3e0ff0c`, ADR-0004. Test « passport verifies with the public keys alone ». | `node:crypto` plutôt que `jose` : un seul algorithme, aucune dépendance, et le vérificateur fait pareil. Le calibre est un champ de `specs`, pas un champ de premier niveau. |
| P3-04 | Fait | `3e0ff0c`, ADR-0005. Tests S10 (×2). | **Ajouté** : contrôle du numéro par l'acheteur, après une vérification, 5 essais en 10 minutes. |
| P3-05 | Fait | `3e0ff0c`, ADR-0006. Tests S9 (×3), dont le refus d'`UPDATE` et `DELETE` par la base. | Événements signés par l'émetteur ou par la plateforme, jamais par l'acteur (option écartée dans l'ADR). |
| P3-06 | Fait | `3e0ff0c`. Tests P3-06 (×2). | La restitution n'exige aucune preuve : risque résiduel n° 11. |
| P3-07 | Fait | `3e0ff0c`. Tests P3-07 (×2). | — |
| P3-08 | Fait | `81f0395`, [`tools/verify`](../tools/verify/README.md). Test P3-08 : une ligne réécrite en contournant le trigger est signalée (`seq 1`). | — |
| P3-09 | Reporté | — | Ancrage (*Should*) : l'UI n'en montre rien, et c'est le premier élément de l'ordre de coupe. En attendant, le vérificateur affiche la tête de chaîne à conserver (risque résiduel n° 3). ADR-0007 non écrite. |
| P3-10 | Fait | Migration `20261024120000_issuer_passport_event_chain`, écrite à la main, sans toucher aux migrations déjà appliquées. Seed : `NODE_ENV=production` refusé. | La migration n'est pas qu'additive : elle supprime la table `Transfer`, la colonne `signature` et les pièces v1, qu'aucun émetteur n'a attestées. C'est acceptable faute de base de production. Émetteur fictif, montres réelles aux caractéristiques sourcées (WatchBase, 2026-10-24). |
| P3-11 | Fait | `3c55b61`. `mobile/lib/watchImages.ts` supprimé, photos servies par l'API sous `/public/watches`. | Seule la Carrera de l'accueil et de la connexion reste embarquée, pour que ces écrans ne dépendent pas de l'API. |

**Vérification finale (2026-10-24)** : backend lint, build, 12 tests unitaires et 38 e2e. Mobile : `tsc`, `expo-doctor` 18/18, export web 2,7 Mo. axe-core : 0 violation sur 9 écrans, à 375 et 1440 px. Parcours rejoués dans Chrome :
- inscription par l'émetteur via le formulaire, avec remise directe à un propriétaire ;
- déclaration de vol, alerte à la vérification publique, puis restitution ;
- contrôle du numéro de série ;
- cession avec retour après connexion.

`tools/verify` valide les trois pièces de démo, avec la JWKS lue par URL.

**Ajouté en cours de route**
- `GET /auth/me` : l'interface s'adapte au rôle, et seul un émetteur voit « Inscrire une pièce ».
- La vérification publique d'une pièce volée a son propre écran, au lieu de « authentique ».
- « Télécharger la preuve » (web) produit le fichier lu par le vérificateur indépendant.
- `npm run dev` ajoute un secret manquant à un `.env` existant ; le seed reprend une base qui n'a pas encore d'émetteur.

**Estimé / réel** : environ 37 h estimées pour un développeur ; de l'ordre de 2 h de temps agent, d'après l'horodatage. Comme pour les phases précédentes, les deux ne sont pas comparables.

**Imprévus rencontrés**
- WatchBase refuse la lecture automatisée (403) : les caractéristiques ont été relevées dans le navigateur intégré.
- ts-jest vérifie les types : un `import` vers un module encore absent aurait fait échouer toute la suite. Le helper rouge le chargeait donc à l'exécution.
- Le test N3 échouait d'abord pour une mauvaise raison (400 sur un champ inconnu). Il reprend désormais l'exemple de l'audit, et le guard refuse avant toute validation.
- Le test I aurait passé pour une mauvaise raison (champ `serial` manquant) : il envoie désormais un corps complet.
- Le trigger append-only refuse `DELETE` : la remise à zéro des tests et du seed passe par `TRUNCATE`.
- Les paramètres des outils passent par JSON : un `​` écrit dans un fichier devenait un vrai caractère invisible. Un cas de la Phase 4 a été retrouvé et corrigé, et un contrôle confirme qu'il n'en reste aucun.

## Phase 4 — Desktop et finition luxe · branche `phase-4/desktop-luxury`

| ID | Item | MoSCoW | Est. | Couvre | Critères d'acceptation |
|---|---|---|---|---|---|
| P4-01 | 2 ou 3 directions visuelles : références, palette, typographies, ton, un écran maquetté sur Expo web par direction. **Tu choisis.** | Must | 4 h | jury « desktop » | ADR-0009 enregistre ton choix. Une seule boucle de révision dans le timebox. |
| P4-02 | Breakpoints (`useWindowDimensions`), conteneur à largeur maximale, détail en 2 colonnes | Must | 4 h | F1 | Captures à 375, 768 et 1440 px sans débordement. |
| P4-03 | Page de vérification publique pensée pour desktop (revendeur, maison de ventes) | Must | 4 h | F1, N2 | Lisible à 1440 px, imprimable (rapport de vérification). |
| P4-04 | Typographie (`expo-font`), tokens renommés, emojis remplacés par des icônes (`react-native-vector-icons`, déjà installé), accents corrigés | Must | 3 h | F1 | `grep` des emojis vide dans `mobile/app`. |
| P4-05 | Images : ratios fixes, placeholders, fallback. Upload = Could, car il exige un stockage objet (le disque Render est éphémère, N10). | Should | 3 h (+6 h upload) | S10 | Aucune image ne déforme la mise en page. |
| P4-06 | États vides, de chargement et d'erreur. Accessibilité : libellés, contraste AA, ordre de focus web, mise à l'échelle des polices. | Must | 5 h | F1 | Audit axe/Lighthouse sur Expo web sans erreur critique. |
| P4-07 | Captures Playwright mobile et desktop sur Expo web, publiées comme artefact de CI | Must | 3 h | DoD | Captures avant/après dans la PR de phase. |

**Total Phase 4 : environ 26 h.**

### Bilan Phase 4 (2026-10-24, branche `phase-4/desktop-luxury`)

| ID | Statut | Preuve | Écart par rapport aux critères |
|---|---|---|---|
| P4-01 | Fait | `e728dbc`, ADR-0009. Canevas privé « Certis — directions visuelles ». | **Six itérations au lieu d'une révision** : le risque R5 s'est réalisé. Ce qui l'a débloqué : étudier de vrais sites primés dans le navigateur et partir des vraies photos du projet, plutôt que dessiner. |
| P4-02 | Fait | `35da0eb`, `f01cc34`. Captures à 375, 768 et 1440 px dans [`docs/screenshots`](screenshots), sans débordement horizontal. | — |
| P4-03 | Fait | `027b5dc` (API), `3e465bb` (rapport). L'impression tient sur 3 pages A4, en couleur et sans les commandes, vérifiée en PDF. | **Ajouté** : l'API publique renvoie la pièce et sa provenance datée, jamais d'identité. Test rouge `19a5990`, puis vert. Sans cela, l'acheteur ne pouvait pas comparer le certificat à la pièce. |
| P4-04 | Fait | `35da0eb`, `8a2a8d1`. Le `grep` des emojis est vide dans `mobile/`. | Icônes dessinées en SVG (8 tracés) plutôt que `react-native-vector-icons`, qui est retiré avec React Native Paper. |
| P4-05 | Fait | `f0d2116`, `f01cc34`. Boîtes à dimensions fixes, photo de repli, mention « Photographie à venir ». | Upload non fait (*Could*). **Ajouté** : trois photos dont la référence ne correspondait pas à la pièce montrée (Carrera, Patek, Speedmaster) ; le seed garde 3 pièces vérifiées, et les photos passent de 23 Mo à 320 Ko (WebP). |
| P4-06 | Fait | `8fe71b1`. axe-core, règles WCAG 2.2 AA : **0 violation** sur 9 écrans, à 375 et 1440 px. Ordre de tabulation et anneau de focus vérifiés au clavier. | axe ne couvre qu'une partie de WCAG. Pas de test avec un lecteur d'écran (VoiceOver), ni sur appareil. |
| P4-07 | Partiel | `08223b9`, `bf5d387`. 37 captures et le script [`capture.mjs`](screenshots/capture.mjs) qui les rejoue. | Pas encore publiées comme artefact de CI : le script exige l'API, la base seedée et Chrome, et la branche n'est pas poussée. Pas de captures « avant » dans le dossier : l'état précédent reste visible au commit `d337821`. |

**Vérification finale (2026-10-24)** : `tsc` mobile sans erreur, `expo-doctor` 18/18, export web 2,9 Mo (bundle JS 1,3 Mo). Backend : lint, build, 11 tests unitaires et 24 tests e2e au vert. Parcours rejoués de bout en bout dans Chrome : inscription → collection vide → ajout d'une pièce ; cession → connexion → retour sur la cession → réception → provenance « Reçue par vous ».

**Ajouté en cours de route**
- La cession peut être réservée à l'e-mail du destinataire depuis l'interface (l'API le permettait depuis la Phase 2).
- Après connexion, on revient à la page d'origine (`?next=`, chemins internes uniquement) : un QR de cession scanné hors connexion ramène bien à l'acceptation.
- Les polices sont importées graisse par graisse (`2f3d9d1`) : 8 fichiers au lieu de 46, export web de 8,1 à 2,9 Mo.

**Estimé / réel** : environ 26 h estimées pour un développeur. Côté agent, environ 1 h de directions visuelles (six itérations) puis environ 45 min d'implémentation, d'après l'horodatage des fichiers et des commits. Comme pour la Phase 1, les deux ne sont pas comparables.

**Imprévus rencontrés**
- Le panneau du navigateur intégré, masqué, met la page en arrière-plan : les animations n'avancent pas. Les vérifications visuelles passent par Playwright en headless.
- React Native Web reprend la taille native d'une image si le style n'en fixe pas, et remplace `scrollTo()` sur le nœud DOM par sa propre signature `{ x, y }`.
- Un masque CSS rognait l'ombre portée des photos détourées : ombre et masque sont désormais sur deux éléments distincts.
- `web.output: single` n'utilise pas `+html.tsx` : le CSS global (focus, impression) est injecté depuis `_layout.tsx`.
- Le `node_modules` orphelin à la racine du dépôt fait planter `npm install` : Playwright est installé hors du dépôt.

## Phase 5 — Démo et récit · branche `phase-5/demo`

| ID | Item | MoSCoW | Est. | Couvre | Critères d'acceptation |
|---|---|---|---|---|---|
| P5-01 | Script de cycle de vie rejouable étape par étape (`demo:step N`) : émission → revendeur → vérification en maison de ventes → service → revente → vol → claim frauduleux rejeté | Must | 4 h | jury « démo » | Chaque étape est rejouable seule. C'est aussi le plan B. |
| P5-02 | `docs/DEMO_SCRIPT.md` : 10 min chronométrées, plan B par étape (réseau, Expo Go, Render endormi) | Must | 3 h | jury « démo », « temps », N11 | Chaque étape a une durée cible et un repli. |
| P5-03 | 3 répétitions chronométrées, journal des temps réels | Must | 2 h | jury « temps » | Écart ≤ ±1 min à la troisième répétition. |
| P5-04 | GIF ou vidéo de la démo | Should | 2 h | DoD | Lien dans le README. |
| P5-05 | README pour recruteur (lisible en 60 s) : problème, réalisation, corrections post-jury, schéma Mermaid, résumé du modèle de menace, captures, lancement en une commande | Must | 4 h | DoD | Après `docker compose up` et une commande, tout tourne (vérifié sur un clone neuf). |
| P5-06 | Section « Périmètre » : bachelor / après le jury / hors scope. Rien de tiré des stages. | Must | 1 h | jury « confusion » | Validée par toi mot à mot. |

**Total Phase 5 : environ 16 h.**

### Bilan Phase 5 (2026-10-24, branche `phase-5/demo`)

| ID | Statut | Preuve | Écart par rapport aux critères |
|---|---|---|---|
| P5-01 | Fait | `e8ebbc9`, `ba9d684`. `npm run demo` : 8 étapes (émission, vente, vérification en maison de ventes, révision, revente, vol, fraude, preuve indépendante). `npm run demo -- N` rejoue chaque étape seule, `-- next` poursuit la même pièce en direct. | Une 8ᵉ étape, la preuve indépendante, s'ajoute aux 7 prévues. La « fraude » montre trois refus (QR photographié, QR fabriqué, alerte levée par un tiers). |
| P5-02 | Fait | [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md) : 10 segments avec heure de début, durée, écran, phrase clé et repli, plus les replis généraux et l'ordre de coupe. | Le déroulé n'a été rejoué qu'en machine (enregistrement de la vidéo), pas à voix haute. |
| P5-03 | **À faire par toi** | Journal prêt en bas de `DEMO_SCRIPT.md`. | Les répétitions sont les tiennes : je ne peux pas chronométrer ta parole. |
| P5-04 | Fait | `2cf105e`. [`docs/demo/certis-demo.mp4`](demo/certis-demo.mp4) (34 s, 1 Mo) et le GIF du README (2,7 Mo), enregistrés par `docs/demo/record.mjs`. | Vidéo sans voix, avec sous-titres incrustés. |
| P5-05 | Fait | `31f35b1`. README lisible en 60 s, schéma Mermaid, captures, vidéo, résumé du modèle de menace. Clone neuf (2026-10-24) : `git clone`, puis `npm run dev` seul. Dépendances installées, `.env` créé, migrations et seed passés, API et web en ligne ; `npm run demo` passe ses 8 étapes et la collection s'affiche avec ses photos. | Les liens vers les commits ne fonctionneront qu'une fois la branche poussée. |
| P5-06 | Fait | Section « Périmètre » du README, validée telle quelle par toi le 2026-10-24. | — |

**Ajouté en cours de route**
- `npm run issuer:grant` : faire d'un compte l'émetteur d'une maison, sans rien effacer. Sans cette commande, une instance déployée n'aurait aucun émetteur (le seed y est refusé).
- Sur le web, l'app déduit l'adresse de l'API de l'adresse de la page, et `npm run dev` autorise l'origine du réseau local. Le téléphone de l'acheteur peut donc ouvrir le QR affiché par l'ordinateur.
- Une pièce inscrite par l'API peut pointer vers une photo servie par l'API (`/public/…`) et la déclarer détourée.
- Documentation périmée retirée : l'architecture et les modules du backend, ainsi que le guide Expo Go du professeur, décrivaient des routes qui n'existent plus.

**Imprévus rencontrés**
- La pièce créée par le script n'avait pas de photo : le DTO n'acceptait que des URL absolues, et `localhost` ne marche pas sur un téléphone. D'où le chemin `/public/…`, résolu par l'app.
- `npm run demo -- N` crée une pièce neuve à chaque appel : une démo en direct sur une seule pièce exigeait le mode `next`.
- Playwright exige sa propre version de ffmpeg pour filmer (1,4 Mo, installée par `npx playwright install ffmpeg`).
- Le test du clone neuf a révélé que les jetons gardés par le script de démo survivaient à une remise à zéro de la base : le script les teste désormais (`GET /auth/me`) avant de s'en servir.
- `container_name: certis_db` empêche deux copies du projet de tourner en même temps : le test du clone neuf a exigé d'arrêter le conteneur principal, sans toucher à son volume.

## Phase 6 — Vision marché · branche `phase-6/market`

| ID | Item | MoSCoW | Est. | Couvre | Critères d'acceptation |
|---|---|---|---|---|---|
| P6-01 | `docs/market/MARKET_VISION.md` : paysage, réglementation, chaîne de valeur, clés côté émetteur, freins, 3 scénarios 2027–2030 | Must | 10 h | contextualisation | Chaque affirmation porte une source et une date de consultation, l'incertitude est signalée. Aucune source vendeur sans contrepoint. |
| P6-02 | One-pager DOM (open science, modèle de données ouvert, vérificateur ouvert, reproductibilité) | Must | 2 h | public 1 | Une page. |
| P6-03 | One-pager recruteur (problème, compétences, preuves cliquables) | Must | 2 h | public 2 | Une page, liens vers les commits et tests. |

**Total Phase 6 : environ 14 h.**

## Won't (cette itération)

| Item | Raison |
|---|---|
| Montée de version NestJS 12, Expo 58, Prisma 8 | NestJS 11 est encore maintenu (11.2.8 publié le 2026-10-23, tag `legacy`). Prisma 8 n'est qu'en RC (`8.0.0-rc.27`). Expo Go est lié au SDK installé sur les stores (N11). Monter de version pendant une refonte de sécurité mélange deux sources de régression. À rouvrir après la Phase 5. |
| Enveloppe W3C VC, DID | Voir la section 0. |
| Signatures d'événements par le propriétaire (clés d'appareil, WebAuthn) | Voir la section 0. Résiduel documenté. |
| Simulateur NFC | Voir la section 0. Documentation seulement. |
| Blockchain, smart contracts, Aura/Arianee, paiements, stores, Next.js, IA « décorative » | Hors périmètre (brief, section 7). |

---

## Totaux

| Phase | Estimation | Avec marge de 30 % |
|---|---|---|
| 1 — Hygiène | 16 h | 21 h |
| 2 — Sécurité du transfert | 29 h | 38 h |
| 3 — Domaine et registre | 37 h | 48 h |
| 4 — Desktop et luxe | 26 h | 34 h |
| 5 — Démo et récit | 16 h | 21 h |
| 6 — Marché | 14 h | 18 h |
| **Total** | **138 h** | **≈ 180 h**, soit environ 4,5 semaines à temps plein |

Les *Should* représentent environ 14 h. Ce sont les premiers à sauter si l'échéance l'impose.

---

## Registre des risques (gestion des imprévus)

| # | Risque | Prob. | Impact | Mitigation | Déclencheur |
|---|---|---|---|---|---|
| R1 | Expo Go ne prend plus en charge le SDK 54 le jour de la démo | Moyenne | Élevé | Démo principale sur Expo web plus le laptop local. Vidéo en secours. Pas de montée de version d'Expo pendant la refonte. | Vérification des stores 7 jours avant la démo |
| R2 | Render : base gratuite expirée (30 jours), démarrage à froid d'environ 1 min | Élevée | Moyen | ADR-0008. Démo en local avec Docker. Requête de réveil 2 min avant. | Création ou âge de la base |
| R3 | La réécriture d'historique casse des clones ou des liens (jury, CV) | Moyenne | Moyen | Décision explicite (ADR-0001). La rotation est obligatoire dans tous les cas. | Ta décision P1-02 |
| R4 | Dérive du périmètre (section 4) | Élevée | Élevé | MoSCoW figé à la validation de la Phase 0. Timebox par phase. Ordre de coupe pré-accepté (section 0). | Dépassement de plus de 30 % sur une phase |
| R5 | Boucle de design sans fin (Phase 4) | Moyenne | Moyen | 3 directions au maximum, un choix, une révision. | Deuxième demande de nouvelle direction. **Réalisé en Phase 4** (six itérations) : débloqué en partant de références réelles et des vraies photos. |
| R6 | Marque et légalité (AP, vraies maisons dans le seed) | Élevée tant que N1 est ouvert | Élevé | P1-05 en Phase 1, émetteurs fictifs. | — |
| R7 | Faits de marché périmés le jour de la soutenance | Moyenne | Moyen | Chaque affirmation datée. Revérification 14 jours avant. | Date de soutenance |
| R8 | Une migration de renommage perd des données | Faible | Élevé | Migration éditée à la main, testée sur une copie. | P2-06 |
| R9 | Tests de concurrence instables en CI | Moyenne | Moyen | Assertion « exactement 1 succès sur N », répétée 20 fois. Pas de `sleep`. | Premier échec intermittent |

---

## ADR prévues

| # | Titre | Phase |
|---|---|---|
| 0001 | Fuite de clé : rotation seule ou réécriture de l'historique (2 dépôts) | 1 |
| 0002 | Consommation atomique du nonce : `updateMany` conditionnel, `FOR UPDATE` ou `SERIALIZABLE` | 2 |
| 0003 | Modèle émetteur et garde des clés (démo et cible) | 3 |
| 0004 | Format du passeport : JWS + JCS ou W3C VC 2.0 | 3 |
| 0005 | `serialHash` : HMAC à clé émetteur ou sel public + KDF lente | 3 |
| 0006 | Journal d'événements : chaîne par actif, append-only imposé par la base, droits vol/récupération | 3 |
| 0007 | Ancrage externe : RFC 3161 ou OpenTimestamps | 3 |
| 0008 | Hébergement durable à coût minimal | 1 |
| 0009 | Direction visuelle (ton choix) | 4 |
| 0010 | Licence | 1 |

## Choix techniques vérifiés (registre npm et nodejs.org, 2026-10-23)

| Brique | Actuel dans le dépôt | Dernière version | Décision |
|---|---|---|---|
| Node.js | 20 (README) | 24.22.1 LTS « Krypton » | Passer à 24 (P1-08) |
| NestJS | ^11.0.1 | 12.2.0 (11.2.8 encore maintenu) | Rester sur 11 |
| Prisma | ^7.7.0 | 7.10.1 stable, 8.0.0-rc.27 | Rester sur 7.x |
| Expo | ~54.0.33 | SDK 58.0.17 | Rester sur 54 (R1) |
| class-validator / helmet / @nestjs/throttler | absents | 0.15.1 / 8.3.0 / 6.7.1 | Ajouter (P2-07) |
| canonicalize (RFC 8785) | absent | 5.1.0 | Ajouter (P2-06), ou ~30 lignes maison si la dépendance pose problème |
| jose (JWS/JWKS) | absent | 6.2.13 | Ajouter (P3-03), sans dépendance transitive |

## Question : licence

Aujourd'hui, `backend/package.json:7` indique `UNLICENSED` et il n'y a pas de fichier `LICENSE`. Par défaut, c'est « tous droits réservés » : le code est visible, mais personne ne peut légalement le réutiliser. C'est contradictoire avec l'angle open science de la Fondation.

- **Apache-2.0** (mon conseil) : licence permissive, avec une **concession explicite de brevets** et une clause de résiliation en cas de litige sur les brevets. Dans une industrie qui dépose beaucoup de brevets, c'est ce qui rassure une maison ou une fondation qui voudrait réutiliser le modèle de données ou le vérificateur.
- **MIT** : plus courte et plus connue, mais sans clause de brevets.
- **Pas de licence pour l'instant** : se défend si tu veux garder la main avant de parler à la Fondation, mais cela affaiblit le discours « vérificateur ouvert ».
