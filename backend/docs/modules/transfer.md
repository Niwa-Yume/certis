# Module Transfer

Fichiers principaux:

- `src/transfer/transfer.controller.ts`
- `src/transfer/transfer.service.ts`

## Responsabilites

- Transferer la propriete d'un asset
- Garder une trace historique de chaque transfert
- Garantir la coherence cryptographique apres transfert

## Logique de transfert

Dans `transfer(assetId, toOwnerId)`:

1. Charger l'asset courant
2. Creer un enregistrement `Transfer`:
   - `fromOwnerId = asset.ownerId`
   - `toOwnerId = toOwnerId`
3. Recalculer `integrityHash` avec le nouveau `ownerId`
4. Mettre a jour l'asset (`ownerId`, `integrityHash`)
5. Executer le flux dans une transaction Prisma atomique

Ce flux preserve ce que vous avez valide:

- historique des proprietaires
- signature alignee avec le proprietaire courant
- verification toujours valide apres transfert

## Historique

`getHistory(assetId)` retourne la table `Transfer` pour l'asset, triee par:

- `createdAt: 'asc'`

=> lecture chronologique du premier au dernier transfert.

## Payload API

`POST /assets/:id/transfer`

```json
{
  "toOwnerId": "owner_002"
}
```

## Dependances

- `PrismaService`: lecture/ecriture transactionnelle simple
- `CryptoService`: re-signature apres changement de proprietaire

## Points d'attention

- Le module n'impose pas encore de regles metier sur `toOwnerId` (format, non-vide, etc.).

