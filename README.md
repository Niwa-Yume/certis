# Certis — le passeport numérique d'une montre

La maison qui vend une montre lui remet un passeport qu'elle signe, et reste présente dans sa vie : remise, révisions, revente. Le propriétaire décide de ce qu'il montre. N'importe quel acheteur vérifie le passeport sans compte, et un expert peut refaire la vérification **sans faire confiance à Certis**.

**La démo de 3 minutes** : [`DEMO.md`](DEMO.md), une seule montre, de la remise à la revente, jouée de bout en bout par un [test automatique](e2e/demo.spec.ts).

## En 60 secondes

- **Le problème.** Acheter une montre d'occasion, c'est croire des papiers qui se photocopient et un vendeur qu'on ne connaît pas. Après la vente, la maison perd le lien avec son client.
- **Ce que fait Certis**, en sept écrans :
  1. **Invitation** : la maison invite son client en boutique. Un mot de passe, un bouton, et la pièce l'attend dans sa collection.
  2. **Remise** : le passeport devient actif devant le client, en une seconde. C'est le seul geste animé de l'app.
  3. **Collection** : chaque pièce en grand, avec son statut en un mot.
  4. **Fiche de vie** :
     - la personne de la maison qui a émis le passeport ;
     - l'histoire de la pièce, en phrases ;
     - l'histoire de la référence et la prochaine révision ;
     - les preuves, repliées.
  5. **Révision** : le propriétaire la demande, la maison la reçoit puis la rend, et elle entre dans l'histoire signée.
  6. **Partage** : rien n'est public sans le propriétaire. Il crée un lien de 1 h, 24 h ou 7 jours, avec ou sans l'histoire.
  7. **Vérification et cession** : l'acheteur lit « Passeport vérifié, émis par la maison » et l'éventuel statut de vol, puis la cession guidée le ramène à sa collection.
- **Ce qui le prouve.**
  - Des tests d'attaque écrits en rouge avant chaque correctif, dont l'[audit de sécurité](docs/adr/0019-corrections-audit-securite-run-1.md) des nouveaux écrans.
  - [18 décisions argumentées (ADR)](docs/adr), un [modèle de menace](docs/security/THREAT_MODEL.md) et une [analyse d'impact (AIPD)](docs/security/AIPD.md).
  - Un [vérificateur indépendant](tools/verify) qui signale le maillon modifié.
  - Le parcours des écrans 1 à 7 passe 20 fois sur 20 (mobile et ordinateur).
  - 0 violation axe (WCAG 2.2 AA) sur 168 captures, en FR et EN, clair et sombre ([rapport du lot 6](docs/lots/lot-6/README.md)).

## Comment ça marche

```mermaid
sequenceDiagram
    participant M as Maison
    participant C as Certis
    participant P as Client puis propriétaire
    participant A as Acheteur
    participant E as Expert
    M->>C: inscrit la pièce, signe son passeport (clé de la maison)
    M->>P: invitation en boutique (QR, jeton de 7 jours)
    P->>C: crée son compte avec le jeton : la pièce l'attend
    M->>P: remise, cession réservée à ce compte
    C->>C: maillon TRANSFER signé : le passeport est actif
    P->>C: demande une révision ; la maison la rend (maillon SERVICE)
    P->>A: partage un lien, ou présente un QR (60 s, usage unique)
    A->>C: vérifie, sans compte : passeport vérifié, statut de vol
    P->>A: cède la pièce (offre réservée, puis acceptation)
    E->>E: tools/verify avec la clé publique : sans Certis
```

Le vocabulaire (maison, pièce, passeport, remise, cession, révision…) est défini une fois pour toutes dans le [glossaire](docs/glossaire.md). L'interface, le code et la base l'emploient tous.

## Lancer en local (une commande)

Prérequis : Node.js 24 (`.nvmrc`, Node 22 convient aussi) et Docker Desktop.

```bash
npm run dev
```

Cette commande :
- démarre PostgreSQL (Docker) et installe les dépendances manquantes ;
- crée `backend/.env` avec des secrets neufs, ou complète celui qui existe ;
- applique les migrations et charge les données de démo ;
- lance l'API (http://localhost:3001) et le web (http://localhost:8090).

Si le port 8090 est pris, utilisez `WEB_PORT=8091 npm run dev`. La commande affiche aussi l'adresse à ouvrir depuis un téléphone du même réseau. `Ctrl+C` arrête tout.

L'app existe en français et en anglais (`?lang=en`, sinon la langue du système), et en thème clair ou sombre selon le système. Pour savoir quoi essayer, voir le [guide d'essai](docs/GUIDE_ESSAI.md).

| Commande | Effet |
|---|---|
| `cd e2e && npm ci && WEB_URL=http://localhost:8090 npm run test:10` | La démo de 3 minutes, écrans 1 à 7, et les tests d'attaque du client, joués 10 fois de suite sur mobile et sur ordinateur ([DEMO.md](DEMO.md)) |
| `npm --prefix backend run test:e2e` | Tests e2e de l'API (base isolée `certis_test`) |
| `npm run demo` | Le cycle de vie d'une pièce en 8 étapes, dans le terminal ([démo technique](docs/DEMO_SCRIPT.md)) |
| `npm run demo -- 6` | Rejouer une étape seule, sur une pièce neuve |
| `node tools/verify/verify.mjs preuve.json jwks.json` | Vérifier un passeport et sa chaîne sans Certis |
| `npm --prefix backend run db:reset` | Repartir d'une base de démo propre |
| `npm --prefix backend run issuer:grant -- <e-mail> "<maison>" ["<nom>" "<rôle>" "<photo>"]` | Faire d'un compte l'émetteur d'une maison, avec le visage que verront ses clients (ADR-0016) |
| `npm --prefix backend run issuer:revoke -- <kid> [date ISO]` | Révoquer une clé d'émetteur compromise (ADR-0011) |
| `npm --prefix backend run registry:anchor` | Horodater tout de suite les têtes de chaîne chez un tiers (ADR-0007) |

Comptes de démo, en dev uniquement (mots de passe dans `backend/prisma/seed.ts`) :

| Compte | Rôle |
|---|---|
| `atelier@certis.demo` | La maison fictive « Maison Orvène » (visage : Claire Vasseur, conseillère horlogère), 3 pièces en stock |
| `certis@pro.com` | Propriétaire : Équinoxe Phase de Lune, révisée |
| `julien.castro@certis.local` | Propriétaire : Méridienne Petite Seconde, révisée puis reçue par cession |

Chaque nouveau compte créé hors invitation reçoit une pièce d'essai, fictive (ADR-0012).

### Une démo aux couleurs d'une maison

Le dépôt montre une maison fictive. Pour une démo aux couleurs d'une vraie maison, avec son accord, un fichier local remplace la maison, son catalogue, ses textes, ses liens et le visage de son conseiller :
- `DEMO_HOUSE_FILE=demo-house.local.json` dans `backend/.env` ;
- les photos dans `backend/public/watches/local/`.

Git ignore ces fichiers : le nom et les visuels d'une marque réelle n'entrent jamais dans ce dépôt public (ADR-0015). Les couleurs passent par des tokens : `EXPO_PUBLIC_THEME=neutral` donne la version Certis, sans maison (ADR-0014).

## Périmètre

| Travail de bachelor (CREA, avril à août 2026) | Repris après le jury (octobre et novembre 2026) | Hors périmètre |
|---|---|---|
| App Expo et API NestJS, comptes, inscription d'une montre par son propriétaire, QR de vérification et de cession, signature ECDSA par la plateforme, historique des cessions. État exact : `main` @ `9de1082`, audité dans [`docs/AUDIT.md`](docs/AUDIT.md). | **Socle** : audit et backlog ; failles de cession corrigées, tests rouges d'abord ; modèle émetteur, passeport signé, chaîne d'événements, vol, numéro de série ; vérificateur indépendant ; ancrage chez un tiers horodateur ; pièce d'essai, refus expliqués. **Expérience client** (lots 1 à 6) : les sept écrans, identité par tokens, FR/EN, thème sombre, test du parcours complet. **Audit de sécurité** des nouveaux écrans, et ses corrections. | Blockchain, intégration Aura ou Arianee, paiements, marketplace, enchères, publication sur les stores, puce NFC, Verifiable Credentials W3C, envoi d'e-mails. |

Projet personnel, sans affiliation avec aucune maison horlogère. Il ne contient aucun code, document ni information issus de mes stages, et n'engage aucune entreprise. La maison de démonstration est fictive.

## Ce qui a changé après le jury

| Critique du jury | Réponse | Statut |
|---|---|---|
| Faille de transfert : le nonce n'était pas lié à la montre | La faille et 3 failles voisines corrigées, chaque attaque rejouée en test ([chaînes A à N](backend/test/transfer-attacks.e2e-spec.ts)) | Fait |
| Interface basique, en dessous des standards du luxe | Sept écrans pensés comme une expérience de maison : la montre en grand, un visage, un récit, une remise ; identité par tokens, accessibilité vérifiée (ADR-0014 à 0018) | Fait |
| Démo sommaire, écart entre promesse et livré | Une démo de 3 minutes, de la remise à la revente ([DEMO.md](DEMO.md)), jouée par un test 20 fois sur 20 ; chaque mot ne promet que ce que Certis prouve (« Passeport vérifié », jamais « montre authentique ») | Fait |
| Manque de méthode | Audit, backlog, 18 ADR, tests rouges avant chaque correctif, une branche et une PR par lot, audit de sécurité | Fait |
| Confusion bachelor, stage et entreprise | Rebrand neutre, maison de démonstration fictive, section « Périmètre » ci-dessus | Fait |
| Gestion du temps | Script de 3 minutes avec ce qu'on dit à l'oral et des parades ; répétitions chronométrées à faire | En cours |

Le détail, preuve par preuve : [`docs/JURY_FEEDBACK_MAP.md`](docs/JURY_FEEDBACK_MAP.md).

## La sécurité, en bref

- **Cession** : un nonce lié à la pièce, à une finalité et, au choix, à un destinataire. Consommation atomique (ADR-0002) ; pièce verrouillée si elle est déclarée volée.
- **Passeport** : seule une maison inscrit une pièce. Le passeport est une JWS ES256 sur du JSON canonique (RFC 8785), vérifiable avec la JWKS publique (ADR-0003, ADR-0004). Il prouve l'enregistrement de la pièce par la maison, pas l'objet physique : l'interface le dit.
- **Provenance** : une chaîne par pièce, en base append-only (trigger), sans fourche possible (`UNIQUE`).
  - Aucune identité réelle n'y figure, seulement des pseudonymes. Un compte supprimé n'y est plus rattachable (ADR-0006, RGPD).
  - Les têtes de chaîne sont horodatées par une autorité tierce (RFC 3161) : même avec toutes les clés, on ne réécrit pas l'histoire à une date passée (ADR-0007).
- **Numéro de série** : jamais stocké. Seule son empreinte HMAC l'est, et la comparaison est limitée à 5 essais (ADR-0005).
- **Invitation et remise** : un jeton de 256 bits montré en boutique, dont la base ne garde que l'empreinte, valable 7 jours.
  - L'invitation est liée au compte qui présente le jeton, pas à l'e-mail (ADR-0017, ADR-0019).
  - La remise est une cession réservée à ce compte.
  - La carte publique ne dit que l'état du passeport.
- **Partage** : créé par le propriétaire seul, à durée limitée, sans l'histoire par défaut. Il s'arrête à la demande et dès que la pièce change de mains (ADR-0018).
- **Limites assumées** :
  - pour la démo, Certis garde les clés des maisons ;
  - un QR prouve l'enregistrement, pas l'objet ;
  - l'autorité d'horodatage est gratuite et sans engagement ;
  - sans vérification d'e-mail, un tiers peut bloquer la création de compte à une adresse : il ne voit plus rien et ne reçoit rien, mais la vérification d'e-mail est à prévoir avant toute donnée réelle.

  Détail dans le [modèle de menace](docs/security/THREAT_MODEL.md).

## Qualité mesurée

Mesures du lot 6, sur le build de production ([rapport](docs/lots/lot-6/README.md)) :

| Mesure | Résultat |
|---|---|
| Parcours des écrans 1 à 7 (Playwright), 10 fois de suite | 20/20, mobile et ordinateur |
| Accessibilité WCAG 2.2 AA (axe), 360 et 1440 px, FR/EN, clair et sombre | 0 violation sur 168 captures |
| LCP en 4G (9 Mbit/s) sur les écrans publics | 1,1 à 2,1 s ; CLS < 0,02 |
| LCP en « Slow 4G » (profil par défaut de Lighthouse) | 3,7 à 6,2 s : au-dessus du seuil, à cause du coût d'exécution du framework (détail dans le rapport) |

## Stack

- **App** : Expo 54, React Native Web, Expo Router. Instrument Serif et Geist, réduites à l'alphabet latin, en WOFF2.
- **API** : NestJS 11, Prisma 7, PostgreSQL 16.
- **Cryptographie** : `node:crypto` (ECDSA P-256, AES-256-GCM, HKDF), aucune bibliothèque cryptographique tierce.
- **Test du parcours** : Playwright.
- **Déploiement** : Render et Neon ([ADR-0008](docs/adr/0008-hebergement-render-neon.md)).

## Déploiement (Render + Neon)

1. Créer une base sur Neon (offre gratuite) et copier sa chaîne de connexion **directe**.
2. Générer la clé de signature : `node backend/scripts/generate-secrets.mjs`. N'en copier que la ligne `ECDSA_PRIVATE_KEY` : `JWT_SECRET` et `KEY_ENCRYPTION_KEY` sont générés par Render. Ne plus jamais changer `KEY_ENCRYPTION_KEY` ensuite : elle chiffre les clés des maisons.
3. Sur Render, *New → Blueprint* sur ce dépôt. Renseigner pour `certis-api` :
   - `DATABASE_URL` ;
   - `ECDSA_PRIVATE_KEY` ;
   - `CORS_ORIGINS`, l'URL de `certis-web`.

   `TRUST_PROXY_HOPS` vaut 1 par hypothèse, à vérifier au premier déploiement ([modèle de menace](docs/security/THREAT_MODEL.md)).
4. Une fois l'API en ligne, renseigner `EXPO_PUBLIC_API_URL` pour `certis-web` (et `EXPO_PUBLIC_THEME=neutral` pour la version sans maison), puis relancer le site.
5. Créer un compte dans l'app, puis le faire émetteur : `npm --prefix backend run issuer:grant -- <e-mail> "<maison>" "<nom>" "<rôle>"`, avec les variables de production.
6. Facultatif : la maison de démonstration et son stock, avec `cd backend && npx prisma db seed`. Lancez-le avec les variables de production, plus `DEMO_ISSUER_PASSWORD`, un mot de passe à vous. Sur une base distante, le seed ne crée que cette maison, n'efface rien, et refuse de tourner sans ce mot de passe.

L'API refuse de démarrer si une variable manque ou est trop faible : le message liste chaque problème.

## Documentation

- **La démo** : [démo de 3 minutes](DEMO.md), [guide d'essai](docs/GUIDE_ESSAI.md), [démo technique dans le terminal](docs/DEMO_SCRIPT.md), [glossaire](docs/glossaire.md)
- **Décisions et sécurité** : [index des ADR](docs/adr/README.md), [modèle de menace](docs/security/THREAT_MODEL.md), [AIPD](docs/security/AIPD.md), [référence de l'API](backend/docs/api/endpoints.md), [vérificateur indépendant](tools/verify/README.md)
- **Méthode** : [audit de départ](docs/AUDIT.md), [backlog et bilans](docs/BACKLOG.md), [critiques du jury → preuves](docs/JURY_FEEDBACK_MAP.md), [rapports des lots 1 à 6](docs/lots)
- **Contexte** : [vision marché 2027-2030](docs/market/MARKET_VISION.md), notes d'une page pour la [Fondation Dominique Renaud](docs/onepagers/FONDATION_DOMINIQUE_RENAUD.md) et pour les [recruteurs](docs/onepagers/RECRUTEURS.md)
