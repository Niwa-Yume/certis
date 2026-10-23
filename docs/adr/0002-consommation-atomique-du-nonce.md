# ADR-0002 — Consommation atomique du nonce et garde optimiste sur le propriétaire

- Statut : accepté
- Date : 2026-10-23
- Constats liés : AUDIT S5 (test e2e D), S3, S4
- Commits : `9fd0503` (test rouge), `90b0b35` (correctif)

## Contexte

L'ancien `claim` lisait le nonce (`findUnique`), vérifiait `used` en mémoire, puis faisait un `update` dont la clause `WHERE` ne portait que sur `nonceValue`. Sous *read committed*, le niveau par défaut de PostgreSQL, deux claims simultanés lisent tous les deux `used = false` et écrivent tous les deux.

**Mesuré** avec 20 claims concurrents et un seul nonce : **10 succès**, soit autant que de connexions dans le pool. Le même défaut existait sur le propriétaire de l'actif, lu avant d'être modifié.

## Options

| Option | Principe | Pour | Contre |
|---|---|---|---|
| A. `UPDATE` conditionnel | `updateMany({ where: { id, used: false, expiresAt: { gt: now } } })`, en exigeant `count === 1` | Une seule instruction, aucun SQL brut, aucune boucle de retry | Il faut relire le nonce pour donner un message d'erreur précis |
| B. Verrou de ligne | `SELECT … FOR UPDATE` puis contrôles | Pattern classique | Prisma ne l'expose pas : `$queryRaw`, donc du SQL dans le code métier |
| C. *Serializable* | Transaction en isolation *serializable* | Aucun raisonnement sur les verrous | Les échecs de sérialisation imposent une boucle de retry : plus de code, plus de latence |
| D. Contrainte d'unicité | Table de consommation avec `UNIQUE(nonceId)` | La garantie est portée par le schéma | Une table et une migration de plus pour ce qu'un `WHERE` suffit à exprimer |

## Choix

**Option A, appliquée deux fois dans la même transaction.**

1. **Nonce** : l'`UPDATE` exige `used = false` et `expiresAt > now`. PostgreSQL réévalue la clause `WHERE` sur la version la plus récente de la ligne après avoir obtenu son verrou : un seul appel concurrent obtient `count = 1`. Les autres reçoivent 410.
2. **Propriétaire** : `updateMany({ where: { id, ownerId: offer.issuedById } })` avec `count === 1`. Si la montre a changé de mains depuis l'émission de l'offre, la transaction est annulée (409), et la consommation du nonce avec elle.

Les contrôles de liaison (actif, finalité, destinataire) sont faits sur une lecture préalable. C'est sûr, parce que ces champs ne changent jamais après la création du nonce : seule la consommation a besoin d'être atomique.

## Conséquences

- Le test D (20 claims concurrents, exactement 1 succès) est passé 15 fois sur 15 en local.
- Pas de SQL brut et pas de retry : le code reste lisible et portable.
- La garantie dépend de la sémantique *read committed* de PostgreSQL. Un changement de SGBD imposerait de la revérifier. Le test D sert de garde-fou.
