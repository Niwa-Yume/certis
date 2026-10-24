# ADR-0005 — Numéro de série : empreinte HMAC, contrôle borné

- Statut : accepté
- Date : 2026-10-24
- Constats liés : AUDIT S10

## Contexte

Le numéro gravé sur le boîtier est le lien entre l'objet physique et son passeport : sans lui, un passeport authentique peut accompagner une contrefaçon. Mais le publier en clair aide les faussaires, qui reproduisent des numéros réels, et il n'a pas à être lisible par quiconque consulte le registre.

L'espace des numéros de série est petit : quelques millions de valeurs par référence. Une empreinte publique, même salée, se retrouve par force brute.

## Options

| Option | Vérifiable hors ligne | Résiste à la force brute | Coût |
|---|---|---|---|
| SHA-256 salé, sel public | Oui | Non : quelques millions d'essais | Nul |
| Sel public + KDF lente (scrypt, Argon2) | Oui | Seulement ralentie : ~50 ms × quelques millions reste à la portée d'une machine | Faible |
| **HMAC-SHA256 avec un secret de l'émetteur** | Non, il faut le détenteur du secret | Oui, sans le secret | Faible |

## Décision

**`serialHash = HMAC-SHA256(secret de l'émetteur, numéro normalisé)`**, encodé en base64url et inscrit dans le passeport signé.

- **Normalisation** : NFKC, majuscules, espaces et tirets retirés. « ab 12-345 » et « AB12345 » donnent la même empreinte.
- **Le numéro n'est stocké nulle part en clair** : ni en base, ni dans les réponses de l'API, ni dans les journaux (test e2e).
- **Contrôle par l'acheteur** : après une vérification réussie, il peut saisir le numéro qu'il lit sur la pièce. Le serveur répond seulement « correspond » ou « ne correspond pas ». Ce contrôle est lié au QR que le vendeur vient de présenter : **5 essais au plus, pendant 10 minutes**, comptés de façon atomique sur le nonce. Deviner un numéro exige donc la coopération répétée du propriétaire.
- **Secret de l'émetteur, pour la démo** : dérivé de la clé maîtresse par HKDF, avec l'identifiant de l'émetteur comme contexte. Pas de colonne ni de secret supplémentaire à gérer. En production, il appartient à la maison (ADR-0003).

## Conséquences

- Le contrôle du numéro de série n'est pas vérifiable hors ligne : c'est le prix de la résistance à la force brute, et il est assumé.
- Changer la clé maîtresse changerait les empreintes. La rotation de cette clé est hors périmètre et notée dans le modèle de menace.
