# Module Asset

Fichiers principaux:

- `src/asset/asset.controller.ts`
- `src/asset/asset.service.ts`
- `src/asset/dto/create-asset.dto.ts`

## Responsabilites

- Creer un asset et signer ses donnees critiques
- Exposer les routes de lecture (`findAll`, `findOne`)
- Verifier l'integrite cryptographique (`verify`)
- Piloter l'authentification par nonce (`generateNonce`, `authenticate`)

## Signature de l'asset

Lors de la creation, la signature est calculee sur:

```ts
{ brand, model, reference, ownerId }
```

La valeur retournee par `CryptoService.sign()` est stockee dans `integrityHash`.

## Authentification nonce

Flux implementé:

1. `generateNonce(id)` verifie que l'asset existe
2. `NonceService.generate(id)` cree un nonce UUID avec expiration a 30s
3. `authenticate(id, nonce)` consomme le nonce (usage unique)
4. Puis `verify(id)` confirme l'integrite du payload signe

## Contrat CreateAssetDto

```json
{
  "name": "string",
  "brand": "string",
  "model": "string",
  "reference": "string",
  "ownerId": "string"
}
```

Note: aucun validateur (`class-validator`) n'est configure actuellement sur ce DTO.

## Dependances

- `PrismaService`: persistance
- `CryptoService`: signature / verification
- `NonceService`: nonce d'authentification

## Points d'attention

- Si les cles ECDSA sont absentes/mal formees, signature/verif echoueront.
- Les erreurs nonce sont levees sous forme d'`Error` metier brutes (`NONCE_*`).

