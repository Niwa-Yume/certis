# Crypto, Nonce et Prisma

Fichiers principaux:

- `src/crypto/crypto.service.ts`
- `src/nonce/nonce.service.ts`
- `src/prisma/prisma.service.ts`
- `prisma/schema.prisma`

## Crypto (ECDSA)

`CryptoService`:

- lit `ECDSA_PRIVATE_KEY` et `ECDSA_PUBLIC_KEY` depuis l'environnement
- signe les payloads en `SHA256` + ECDSA (format Base64)
- verifie les signatures avec la cle publique

Le payload signe est une serialisation JSON de l'objet donne au service.

## Nonce (authentification)

`NonceService`:

- `generate(assetId)`
  - cree un UUID
  - stocke `expiresAt = now + 30_000ms`
  - retourne `{ nonce, expiresAt }`
- `consume(nonceValue)`
  - verifie existence
  - verifie non deja utilise
  - verifie non expire
  - marque `used = true` et `usedAt`

Erreurs metier possibles:

- `NONCE_NOT_FOUND`
- `NONCE_ALREADY_USED`
- `NONCE_EXPIRED`

## Prisma et modeles

### Asset

- Identite metier: `name`, `brand`, `model`, `reference`
- Integrite: `integrityHash`
- Proprietaire courant: `ownerId`
- Relations: `nonces`, `transfers`

### AuthNonce

- `nonceValue` unique
- `expiresAt`, `used`, `usedAt`
- relation obligatoire vers `Asset`

### Transfer

- `fromOwnerId`, `toOwnerId`, `createdAt`
- relation obligatoire vers `Asset`

## Risques/ameliorations conseillees

- Mapper les erreurs nonce vers des exceptions Nest (`BadRequestException`, etc.).
- Ajouter validation d'entree (DTO + `class-validator`).
- Etendre la couverture e2e sur des cas supplementaires (concurrence, claim invalide, erreurs DB).

