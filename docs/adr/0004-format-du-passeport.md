# ADR-0004 — Format du passeport : JWS ES256 sur un JSON canonique

- Statut : accepté
- Date : 2026-10-24
- Constats liés : AUDIT S6, S10, N4

## Contexte

La signature v1 (Phase 2) couvrait les champs affichés **et le propriétaire**, avec la clé de la plateforme. Elle était donc refaite à chaque cession, et rien ne la rendait vérifiable hors de Certis. Il faut distinguer deux choses : ce que la maison atteste une fois pour toutes (la pièce), et ce qui change au fil du temps (le propriétaire, le statut), qui relève du journal (ADR-0006).

## Décision

**Le passeport est une JWS compacte (RFC 7515), algorithme ES256, signée par la clé de l'émetteur.** Son contenu est sérialisé en JSON canonique (JCS, RFC 8785), comme en Phase 2, pour que n'importe qui reconstruise les mêmes octets.

En-tête : `{"alg":"ES256","kid":"…","typ":"certis-passport+jws"}`.

Contenu, nommé comme un Verifiable Credential sans en être un :

```json
{
  "v": 2,
  "type": "CertisPassport",
  "issuer": { "id": "…", "name": "Atelier de démonstration" },
  "validFrom": "2026-03-12T10:00:00.000Z",
  "credentialSubject": {
    "id": "<assetId>",
    "brand": "TAG Heuer", "model": "Carrera", "name": "Carrera Calibre S", "reference": "CV7A12.BA0795",
    "specs": { "movement": "…", "case": "…", "dial": "…", "bracelet": "…" },
    "serialHash": "…",
    "image": "/public/watches/carrera.webp"
  }
}
```

- **Aucun propriétaire dans le passeport** : il ne change jamais, donc il n'est jamais re-signé. La propriété vit dans le journal.
- **Les champs affichés à l'acheteur sont lus dans le passeport vérifié**, pas dans les colonnes de la base. Modifier une colonne ne change rien à ce que voit l'acheteur ; modifier le passeport casse la signature.
- **`node:crypto` plutôt que la bibliothèque `jose`**, prévue au backlog. Un seul algorithme est accepté (ES256), donc pas de négociation d'algorithme, et la signature au format JWS (`r‖s`) s'obtient avec `dsaEncoding: 'ieee-p1363'`. Une dépendance de moins, et le vérificateur indépendant peut faire exactement la même chose sans rien installer.

## Options écartées

- **W3C Verifiable Credentials 2.0** : contextes JSON-LD, méthode DID et suite cryptographique, sans bénéfice visible pour l'acheteur ou la maison de ventes. Les noms de champs (`issuer`, `validFrom`, `credentialSubject`) permettent un emballage `application/vc+jwt` plus tard.
- **Garder la signature v1 de la plateforme** : elle ne dit pas *qui* atteste, et elle mélange la pièce et son propriétaire.

## Conséquences

- La colonne `signature` disparaît. Les pièces v1 ne peuvent pas être converties (aucun émetteur ne les a attestées) : la migration les supprime, et le seed les recrée. Aucune base de production n'existe encore.
- Le passeport est vérifiable avec la seule JWKS (test e2e).
