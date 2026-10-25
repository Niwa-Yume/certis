# API Certis

Base URL locale : `http://localhost:3001` (`npm run dev` à la racine).
Toutes les routes valident leur corps (champs inconnus refusés, 400). Les routes marquées 🔒 exigent `Authorization: Bearer <accessToken>`.

## Comptes

| Route | Corps | Réponse |
|---|---|---|
| `POST /auth/register` | `{ email, password }` (8 à 72 caractères) | 201 `{ accessToken, user: { id, email } }` |
| `POST /auth/login` (10/min) | `{ email, password }` | 201 `{ accessToken }`, 401 sinon |
| 🔒 `GET /auth/me` | — | `{ id, email, role: OWNER \| ISSUER, issuer: { id, name } \| null }` |
| 🔒 `DELETE /auth/me` (10/min) | `{ password }` | 204 : compte et e-mail effacés, pseudonymes devenus non rattachables. 403 si le mot de passe est faux (la session reste valide). 409 tant que le compte détient des pièces. |

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
| `GET /assets` | Ses pièces : identité, statut, photo, caractéristiques. |
| `GET /assets/:id` | Détail, émetteur et provenance ; `you: true` sur la cession qu'il a reçue. |
| `GET /assets/:id/history` | `{ passport, events }` : l'entrée du vérificateur indépendant (`tools/verify`). |
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
  "imageCutout": true,
  "passport": {
    "v": 2, "type": "CertisPassport",
    "issuer": { "id": "…", "name": "Atelier de démonstration" },
    "validFrom": "2024-03-12T00:00:00.000Z",
    "credentialSubject": {
      "id": "…", "brand": "TAG Heuer", "model": "Carrera", "name": "Carrera Calibre S", "reference": "CV7A12.BA0795",
      "specs": { "movement": "TAG Heuer Calibre S", "case": "Acier, 43 mm, lunette tachymètre", "dial": "Noir", "bracelet": "Acier" },
      "serialHash": "…", "image": "/public/watches/carrera.webp"
    }
  },
  "provenance": [
    { "type": "MINT", "at": "2024-03-12T00:00:00.000Z" },
    { "type": "SERVICE", "at": "2025-11-18T00:00:00.000Z", "note": "Remplacement de la pile du Calibre S" },
    { "type": "TRANSFER", "at": "2026-09-03T00:00:00.000Z" }
  ],
  "proof": { "passport": "eyJhbGciOiJFUzI1NiIs…", "events": [ "… maillons complets …" ], "keys": "/.well-known/certis-keys" }
}
```

- `status: STOLEN` : le certificat est authentique, mais la pièce est déclarée volée.
- Sinon : `{ "valid": false, "problem": "passport" | "chain" | "registry", "verifiedAt": "…" }`, sans aucune donnée de la pièce.
- Aucune identité : la chaîne ne porte que des pseudonymes par pièce.
- Erreurs : 403 si le QR appartient à une autre pièce ou sert à autre chose, 410 s'il a expiré ou déjà servi, 429 au-delà du quota.

3. `POST /assets/:id/serial-check` `{ nonce, serial }` (sans compte) : `{ match }`. Seulement après une vérification réussie avec ce même QR (403 sinon), 5 fois au plus en 10 minutes (429 ensuite).

## Cession en deux temps 🔒

1. `POST /assets/:id/transfer-offers` (30/min) `{ recipientEmail? }` : le propriétaire obtient `{ nonce, expiresAt }`, valable 5 min. Avec un e-mail, seul ce compte peut accepter (404 si le compte n'existe pas).
2. `POST /assets/:id/claim` `{ nonce }` : le destinataire accepte. La propriété change et un maillon `TRANSFER`, signé par la plateforme, est écrit dans la même transaction.

Erreurs : 403 (QR d'une autre pièce, offre réservée à quelqu'un d'autre), 409 (déjà propriétaire, ou la pièce a changé entre-temps), 410 (expiré ou déjà utilisé), 423 (pièce déclarée volée).

Le détail des attaques couvertes est dans `docs/security/THREAT_MODEL.md` et les tests de `backend/test/`.
