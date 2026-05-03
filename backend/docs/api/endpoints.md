# API Backend Certis

Base URL locale par defaut: `http://localhost:3000`

## POST `/assets`

Cree un asset et calcule la signature ECDSA (`integrityHash`).

Payload JSON:

```json
{
  "name": "Rolex Submariner",
  "brand": "Rolex",
  "model": "Submariner",
  "reference": "126610LN",
  "ownerId": "owner_001"
}
```

Reponse (201): objet `Asset` cree.

## GET `/assets`

Liste tous les assets.

Reponse (200): tableau de `Asset`.

## GET `/assets/:id`

Recupere le detail d'un asset.

Reponse (200): objet `Asset`.

## GET `/assets/:id/verify`

Verifie l'integrite ECDSA de l'asset.

Reponse (200):

```json
{ "valid": true }
```

## GET `/assets/:id/nonce`

Genere un nonce a usage unique pour cet asset.

- Duree de validite: 30 secondes

Reponse (200):

```json
{
  "nonce": "uuid",
  "expiresAt": "2026-05-03T10:00:30.000Z"
}
```

## GET `/assets/:id/authenticate?nonce=...`

Consomme le nonce, puis verifie la signature de l'asset.

Reponse (200):

```json
{ "valid": true }
```

Erreurs metier possibles (actuellement levees en `Error`):

- `NONCE_NOT_FOUND`
- `NONCE_ALREADY_USED`
- `NONCE_EXPIRED`

## POST `/assets/:id/transfer`

Transfere la propriete a un nouveau proprietaire.

Payload JSON:

```json
{
  "toOwnerId": "owner_002"
}
```

Effets:

- creation d'un enregistrement `Transfer`
- mise a jour de `asset.ownerId`
- recalcul de `asset.integrityHash`

Reponse (201/200 selon config): objet `Asset` mis a jour.

## GET `/assets/:id/history`

Retourne l'historique de transfert d'un asset.

Reponse (200): tableau de `Transfer` trie par `createdAt` ascendant.

## Exemples cURL

```bash
# 1) Creer un asset
curl -X POST http://localhost:3000/assets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rolex Submariner",
    "brand": "Rolex",
    "model": "Submariner",
    "reference": "126610LN",
    "ownerId": "owner_001"
  }'

# 2) Lister
curl http://localhost:3000/assets

# 3) Verifier
curl http://localhost:3000/assets/<assetId>/verify

# 4) Generer un nonce
curl http://localhost:3000/assets/<assetId>/nonce

# 5) Authentifier (remplacer <nonce>)
curl "http://localhost:3000/assets/<assetId>/authenticate?nonce=<nonce>"

# 6) Transferer
curl -X POST http://localhost:3000/assets/<assetId>/transfer \
  -H "Content-Type: application/json" \
  -d '{"toOwnerId":"owner_002"}'

# 7) Historique
curl http://localhost:3000/assets/<assetId>/history
```

