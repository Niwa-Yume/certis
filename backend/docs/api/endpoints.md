# API Certis

Les refus sont en français, sous la forme « ce qui s'est passé : comment corriger » (ADR-0013). Avec `Accept-Language: en…`, ils arrivent en anglais, sous la même forme (ADR-0015).

Base URL locale : `http://localhost:3001` (`npm run dev` à la racine).
Toutes les routes valident leur corps (champs inconnus refusés, 400). Les routes marquées 🔒 exigent `Authorization: Bearer <accessToken>`.

Chaque refus répond `{ statusCode, message }`, avec un seul message en français : ce qui s'est passé, puis comment corriger, séparés par « : » (ADR-0013). Exemple : `Ce QR a expiré : il ne vaut que quelques minutes. Demandez-en un nouveau au propriétaire.`

## Comptes

| Route | Corps | Réponse |
|---|---|---|
| `POST /auth/register` | `{ email, password }` (8 à 72 caractères) | 201 `{ accessToken, user: { id, email } }`. Le compte reçoit sa pièce d'essai (ADR-0012). |
| `POST /auth/login` (10/min) | `{ email, password }` | 201 `{ accessToken }`, 401 sinon |
| 🔒 `GET /auth/me` | — | `{ id, email, role: OWNER \| ISSUER, issuer: { id, name } \| null }` |
| 🔒 `DELETE /auth/me` (10/min) | `{ password }` | 204 : compte et e-mail effacés, pseudonymes devenus non rattachables. 403 si le mot de passe est faux (la session reste valide). 409 tant que le compte détient de vraies pièces ; ses pièces d'essai reviennent à Certis par une cession. |

## Catalogue

`GET /catalog` : sans compte. Les références de la maison de démonstration, fictive (ADR-0015) ; `source` pointe sur un domaine réservé, avec `brand`, `model`, `name`, `reference`, `movement`, `case`, `dial`, `bracelet` et `photo: { imageUrl, imageCutout }`. Le formulaire d'inscription s'en sert pour remplir la fiche.

## Clés publiques

`GET /.well-known/certis-keys` : JWKS (RFC 7517), sans compte. Chaque clé porte `kid` (empreinte RFC 7638), `alg: ES256` et `issuer` (identifiant de l'émetteur, ou `certis` pour la plateforme). Les clés retirées restent publiées. Une clé révoquée (ADR-0011) porte en plus `revokedAt` (date ISO) : toute signature datée de ce moment ou après est refusée.

## Émetteur 🔒

Réservé aux comptes `ISSUER` : tout autre compte reçoit 403, avant même la validation du corps (ADR-0003).

| Route | Rôle |
|---|---|
| `POST /assets` | Inscrit une pièce : `{ name, brand, model, reference, serial, movement?, case?, dial?, bracelet?, imageUrl?, imageCutout?, ownerEmail? }`. Signe le passeport et écrit le premier maillon (`MINT`). Sans `ownerEmail`, la pièce reste dans le stock de l'émetteur ; 404 si le compte n'existe pas. Le numéro de série n'est jamais stocké. `imageUrl` : une URL http(s), ou une photo servie par l'API (`/public/…`) ; `imageCutout` : photo détourée. |
| `POST /assets/:id/services` | `{ note }` : enregistre une révision (`SERVICE`), sur ses propres pièces seulement (403 sinon). |

## Propriétaire 🔒

Un utilisateur ne voit que ses pièces : la pièce d'autrui répond 404, comme une pièce inexistante.

| Route | Rôle |
|---|---|
| `GET /assets` | Ses pièces : identité, statut, photo, caractéristiques ; `trial: true` pour une pièce d'essai. |
| `GET /assets/:id` | Détail, émetteur et provenance ; `you: true` sur la cession qu'il a reçue. |
| `GET /assets/:id/history` | `{ passport, events, anchors }` : l'entrée du vérificateur indépendant (`tools/verify`). Chaque ancrage (ADR-0007) donne la tête ancrée (`seq`, `hash`), son chemin d'audit Merkle (`path`), la racine horodatée (`root`) et le jeton RFC 3161 (`token`, DER en base64). |
| `GET /assets/:id/verify` | `{ valid, problem? }` : passeport, chaîne et base concordent-ils ? |
| `POST /assets/:id/stolen` | Déclare la pièce volée (`STOLEN_REPORTED`) ; 409 si elle l'est déjà. |
| `POST /assets/:id/recovered` | Déclare la pièce retrouvée (`RECOVERED`) ; 409 si elle n'est pas déclarée volée. |

## Vérification par QR

1. 🔒 `POST /assets/:id/verifications` (30/min) : le propriétaire obtient `{ nonce, expiresAt }`, valable 60 s, une seule fois, pour cette pièce seulement.
2. `POST /assets/:id/authenticate` `{ nonce }` (30/min, sans compte).

Réponse 200 quand tout concorde :

```json
{
  "valid": true,
  "verifiedAt": "2026-10-24T08:42:00.000Z",
  "status": "ACTIVE",
  "trial": false,
  "imageCutout": true,
  "passport": {
    "v": 2, "type": "CertisPassport",
    "issuer": { "id": "…", "name": "Maison Orvène" },
    "validFrom": "2024-03-12T00:00:00.000Z",
    "credentialSubject": {
      "id": "…", "brand": "Maison Orvène", "model": "Méridienne", "name": "Méridienne Petite Seconde", "reference": "OR-1201",
      "specs": { "movement": "Calibre OR-21, remontage automatique", "case": "Acier poli et satiné, 39 mm", "dial": "Ardoise soleillé", "bracelet": "Cuir d’alligator brun, boucle ardillon" },
      "serialHash": "…", "image": "/public/watches/carrera.webp"
    }
  },
  "provenance": [
    { "type": "MINT", "at": "2024-03-12T00:00:00.000Z" },
    { "type": "SERVICE", "at": "2025-11-18T00:00:00.000Z", "note": "Remplacement de la pile du Calibre S" },
    { "type": "TRANSFER", "at": "2026-09-03T00:00:00.000Z" }
  ],
  "proof": { "passport": "eyJhbGciOiJFUzI1NiIs…", "events": [ "… maillons complets …" ], "anchors": [ "… ancrages …" ], "keys": "/.well-known/certis-keys" }
}
```

- `status: STOLEN` : le certificat est authentique, mais la pièce est déclarée volée.
- `trial: true` : une pièce d'essai, fictive (ADR-0012). L'app le dit avant tout le reste.
- Sinon : `{ "valid": false, "problem": "passport" | "chain" | "registry", "verifiedAt": "…" }`, sans aucune donnée de la pièce.
- Aucune identité : la chaîne ne porte que des pseudonymes par pièce.
- Erreurs : 403 si le QR appartient à une autre pièce ou sert à autre chose, 410 s'il a expiré ou déjà servi, 429 au-delà du quota.

3. `POST /assets/:id/serial-check` `{ nonce, serial }` (sans compte) : `{ match }`. Seulement après une vérification réussie avec ce même QR (403 sinon), 5 fois au plus en 10 minutes (429 ensuite).

## Invitation et remise (ADR-0017)

| Route | Rôle |
|---|---|
| 🔒 `POST /assets/:id/invitations` (30/min) | La maison qui détient la pièce invite son client : `{ email }` → `{ token, expiresAt, cardId }`. Le jeton n'est rendu qu'ici (7 jours) ; une nouvelle invitation remplace la précédente. 404 si la pièce n'est pas dans son stock. |
| `GET /invitations/:token` (10/min) | Sans compte : `{ email (masqué), house, issuedBy, piece, expiresAt }`. 404 inconnue, 410 expirée. |
| `POST /invitations/:token/accept` (10/min) | Sans compte : `{ password }` → `{ user, accessToken }`. Le compte prend l'e-mail invité, sans pièce d'essai. 409 si un compte existe déjà : la pièce l'attend dans sa collection. |
| `GET /cards/:id` (30/min) | Sans compte : la carte remise avec la pièce. `{ state: pending \| verified \| unconfirmed \| stolen, house, piece, stolenAt? }`, rien d'autre. |

Une pièce invitée apparaît dans `GET /assets` du client avec `pending: true`, et `GET /assets/:id` la montre, mais elle reste à la maison : ni QR de vérification ni cession avant la remise. La remise est une cession réservée (`recipientEmail`) ; `claim` répond alors `handover: true` et l'invitation est supprimée.

## Révision et partage (ADR-0018)

| Route | Rôle |
|---|---|
| 🔒 `POST /assets/:id/service-requests` | Le propriétaire demande une révision. 409 si une révision est déjà en cours, 423 si la pièce est déclarée volée. |
| 🔒 `GET /service-requests` | La maison : les demandes en cours sur ses pièces, avec l'e-mail du propriétaire. |
| 🔒 `POST /service-requests/:id/receive` | La maison reçoit la pièce en atelier. 409 si ce n'est pas l'étape. |
| 🔒 `POST /service-requests/:id/return` | `{ note }` : la maison rend la pièce ; un maillon `SERVICE` signé est écrit dans la même transaction. |
| 🔒 `POST /assets/:id/shares` (30/min) | `{ hours: 1 \| 24 \| 168, history }` → `{ id, token, expiresAt }`. Le propriétaire seul. |
| 🔒 `DELETE /assets/:id/shares/:shareId` | Le propriétaire arrête un partage. |
| `GET /shares/:token` (30/min) | Sans compte : la même vue que la vérification par QR, sans `provenance` ni `proof` quand l'histoire n'est pas partagée. 404 inconnu, 410 arrêté, expiré ou pièce cédée. |

`GET /assets/:id` donne au propriétaire `service` (la dernière demande et ses dates) et `shares` (les partages en cours).

## Cession en deux temps 🔒

1. `POST /assets/:id/transfer-offers` (30/min) `{ recipientEmail? }` : le propriétaire obtient `{ nonce, expiresAt }`, valable 5 min. Avec un e-mail, seul ce compte peut accepter (404 si le compte n'existe pas).
2. `POST /assets/:id/claim` `{ nonce }` : le destinataire accepte. La propriété change et un maillon `TRANSFER`, signé par la plateforme, est écrit dans la même transaction.

Erreurs : 403 (QR d'une autre pièce, offre réservée à quelqu'un d'autre), 409 (déjà propriétaire, ou la pièce a changé entre-temps), 410 (expiré ou déjà utilisé), 423 (pièce déclarée volée).

Le détail des attaques couvertes est dans `docs/security/THREAT_MODEL.md` et les tests de `backend/test/`.
