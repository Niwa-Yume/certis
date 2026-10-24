# API Certis

Base URL locale : `http://localhost:3001` (`npm run dev` à la racine).
Toutes les routes valident leur corps (champs inconnus refusés, 400). Les routes marquées 🔒 exigent `Authorization: Bearer <accessToken>`.

## Comptes

| Route | Corps | Réponse |
|---|---|---|
| `POST /auth/register` | `{ email, password }` (8 à 72 caractères) | 201 `{ accessToken, user: { id, email } }` |
| `POST /auth/login` (10/min) | `{ email, password }` | 201 `{ accessToken, user }`, 401 sinon |

## Montres du propriétaire 🔒

Un utilisateur ne voit que ses montres : la montre d'autrui répond 404, comme une montre inexistante.

| Route | Rôle |
|---|---|
| `POST /assets` | Inscrit une montre `{ name, brand, model, reference, imageUrl? }` et la signe. Le serveur fixe l'id, le statut et le propriétaire. |
| `GET /assets` | Liste les montres du propriétaire. |
| `GET /assets/:id` | Détail, signature comprise. |
| `GET /assets/:id/verify` | `{ valid }` : la signature correspond-elle aux données ? |
| `GET /assets/:id/history` | Transferts de la montre, du plus ancien au plus récent. |

## Vérification par QR

1. 🔒 `POST /assets/:id/verifications` (30/min) : le propriétaire obtient `{ nonce, expiresAt }`, valable 60 s, une seule fois, pour cette montre seulement.
2. `POST /assets/:id/authenticate` `{ nonce }` (30/min, sans compte) : l'acheteur consomme le nonce.

Réponse 200 quand la signature est valide :

```json
{
  "valid": true,
  "verifiedAt": "2026-10-24T08:42:00.000Z",
  "asset": {
    "id": "…", "name": "Carrera Calibre S", "brand": "TAG Heuer", "model": "Carrera",
    "reference": "CV7A12.BA0795", "imageUrl": null, "registeredAt": "2026-03-12T…"
  },
  "provenance": [
    { "event": "REGISTERED", "at": "2026-03-12T…" },
    { "event": "TRANSFERRED", "at": "2026-09-03T…" }
  ],
  "proof": { "algorithm": "ECDSA P-256 / SHA-256", "format": "JCS (RFC 8785) v1", "signature": "MEUCIQ…" }
}
```

Aucune identité n'est renvoyée. Si la signature ne correspond pas : `{ "valid": false, "verifiedAt": "…" }`, sans aucune donnée de la pièce.

Erreurs : 403 si le QR appartient à une autre montre ou sert à autre chose, 410 s'il a expiré ou déjà servi, 429 au-delà du quota.

## Transfert en deux temps 🔒

1. `POST /assets/:id/transfer-offers` (30/min) `{ recipientEmail? }` : le propriétaire obtient `{ nonce, expiresAt }`, valable 5 min. Avec un e-mail, seul ce compte peut accepter (404 si le compte n'existe pas).
2. `POST /assets/:id/claim` `{ nonce }` : le destinataire accepte. La montre change de propriétaire et est signée à nouveau, en une seule transaction.

Erreurs : 403 (QR d'une autre montre, offre réservée à quelqu'un d'autre), 409 (déjà propriétaire, ou la montre a changé de main entre-temps), 410 (expiré ou déjà utilisé).

Le détail des attaques couvertes est dans `docs/security/THREAT_MODEL.md` et `backend/test/transfer-attacks.e2e-spec.ts`.
