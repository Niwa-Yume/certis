# Documentation Backend Certis

Cette documentation couvre le backend NestJS de Certis (assets, signature ECDSA, nonce d'authentification et transferts de propriete).

## Navigation

- `docs/architecture.md` : vue d'ensemble technique et demarrage
- `docs/api/endpoints.md` : reference API complete (routes, payloads, reponses)
- `docs/modules/asset.md` : details du module Asset (creation, verification, auth)
- `docs/modules/transfer.md` : details du module Transfer (changement de proprietaire + historique)
- `docs/modules/security-and-auth.md` : crypto ECDSA, nonce, Prisma et points de securite

## Etat valide du backend

- Transfert enregistre avec `fromOwnerId` et `toOwnerId`
- Signature ECDSA recalculee automatiquement avec le nouveau `ownerId`
- Authentification toujours valide apres transfert
- Historique de propriete chronologique (`createdAt` ascendant)

