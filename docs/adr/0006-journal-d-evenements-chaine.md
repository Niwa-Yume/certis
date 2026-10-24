# ADR-0006 — Journal d'événements chaîné, append-only imposé par la base

- Statut : accepté
- Date : 2026-10-24
- Constats liés : AUDIT S9 (le registre chaîné n'a jamais existé dans le code), N4, démo étape 7

## Contexte

Le « registre » promis n'a jamais été chaîné : l'ancienne table `Event` ne contenait ni hash ni lien, et elle a été supprimée en août 2026 (S9). La provenance affichée en Phase 4 vient de la table `Transfer`, que l'administrateur de la base peut modifier sans laisser de trace.

## Décision

**Une table `Event`, une chaîne par pièce.** Chaque événement porte :

- `seq` (0, 1, 2…) et `prevHash`, le hash de l'événement précédent (`null` pour le premier) ;
- `hash` = SHA-256 du JSON canonique (JCS) de `{v, assetId, seq, type, at, data, prevHash}`, en base64url ;
- une signature ES256 de ces mêmes octets, et le `kid` de la clé qui a signé.

| Type | Signé par | `data` |
|---|---|---|
| `MINT` | l'émetteur | émetteur, empreinte du passeport, premier propriétaire |
| `TRANSFER` | la plateforme | ancien et nouveau propriétaire |
| `SERVICE` | l'émetteur | note de révision |
| `STOLEN_REPORTED` | la plateforme | déclarant |
| `RECOVERED` | la plateforme | déclarant |

**Les propriétaires apparaissent sous pseudonyme** : `HMAC(clé dérivée, assetId:userId)`. Le pseudonyme est stable sur une même pièce (on voit qu'elle est revenue au même propriétaire) mais différent d'une pièce à l'autre (on ne peut pas reconstituer une collection). L'identifiant réel est conservé à part, hors du hash, pour les contrôles de droits.

**Garanties portées par la base, pas par la discipline du code :**
- un trigger refuse tout `UPDATE` et tout `DELETE` sur `Event` ;
- `UNIQUE (assetId, seq)` : deux écritures concurrentes ne peuvent pas créer deux suites au même maillon. La seconde échoue et l'action est refusée (409).

**Écriture dans la même transaction que le changement d'état** (propriétaire, statut) : l'un n'existe jamais sans l'autre.

**Vol et restitution** : `STOLEN_REPORTED` passe la pièce au statut `STOLEN`. Tant qu'elle y est, offres de cession et acceptations renvoient **423** avec un message explicite. Seul le propriétaire en titre peut déclarer le vol, puis la restitution (`RECOVERED`). La vérification publique reste possible et affiche l'alerte : c'est précisément là qu'elle protège l'acheteur.

**Le statut et le propriétaire en base sont des copies** : la vérification les recalcule depuis la chaîne et signale toute incohérence.

## Ce que cela ne garantit pas

Un superutilisateur PostgreSQL peut désactiver le trigger, réécrire la chaîne entière et la re-signer avec la clé plateforme. Le chaînage rend l'altération **détectable par quiconque a gardé une copie antérieure** (le vérificateur indépendant compare et signale le premier maillon cassé), il ne la rend pas impossible. Fixer la tête de chaîne chez un tiers horodateur est l'objet de l'ADR-0007 (ancrage), reporté.

## Options écartées

- **Événements signés par chaque acteur** : un propriétaire n'a pas de clé. Lui en donner une (clé d'appareil, WebAuthn) est un projet en soi.
- **Append-only applicatif** (aucune méthode de mise à jour dans le code) : un `UPDATE` SQL direct passerait sans bruit.
- **Verrou de ligne pour éviter les fourches** : la contrainte d'unicité donne la même garantie, sans SQL brut.

## Conséquences

- La table `Transfer` disparaît : la cession est un événement.
- Remettre la base de test à zéro passe par `TRUNCATE`, qui ne déclenche pas les triggers de ligne.
