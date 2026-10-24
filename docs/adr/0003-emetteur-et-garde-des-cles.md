# ADR-0003 — Émetteur, rôles et garde des clés

- Statut : accepté
- Date : 2026-10-24
- Constats liés : AUDIT N3 (« authentique » ne prouve rien), N4 (aucune vérification hors Certis), S10

## Contexte

Jusqu'ici, n'importe quel compte inscrit une montre en saisissant ses champs, et Certis signe le tout avec sa clé unique (N3). La signature prouve que l'enregistrement n'a pas été modifié, pas que la montre est authentique : on peut inscrire une « Nautilus 5711 » imaginaire et obtenir « authentique ». Et la clé publique n'est publiée nulle part (N4).

Dans le monde réel, seul celui qui a examiné la pièce peut en attester : la maison qui l'a fabriquée, ou un horloger qui l'a expertisée. Certis est un registre tiers, pas cette autorité.

## Décision

- **Deux rôles** : `OWNER` (par défaut) et `ISSUER`, rattaché à un `Issuer`. Seul un compte `ISSUER` inscrit une pièce (`POST /assets`) ou enregistre une révision. Un propriétaire reçoit ses pièces par cession. Le rôle est lu en base au moment de l'action, pas dans le jeton : retirer un rôle prend effet tout de suite.
- **Pas de framework RBAC ni de décorateur `@Roles()`** : deux routes seulement en ont besoin, et elles chargent de toute façon l'émetteur pour signer avec sa clé. Le contrôle vit là.
- **Une clé ECDSA P-256 par émetteur**, identifiée par son `kid` = empreinte JWK (RFC 7638). La clé plateforme existante (`ECDSA_PRIVATE_KEY`) reste distincte : **la maison signe ce qu'elle certifie** (inscription, révision), **la plateforme signe ce qu'elle constate** (cession, déclaration de vol, restitution).
- **Rotation** : une nouvelle clé remplace l'active, l'ancienne est marquée retirée mais **reste publiée**, pour que les passeports déjà émis restent vérifiables.
- **Publication** : `GET /.well-known/certis-keys`, au format JWKS (RFC 7517), public et sans compte. Chaque clé porte un membre `issuer` (identifiant de l'émetteur, ou `certis` pour la plateforme) : un vérificateur peut ainsi contrôler qu'une inscription a bien été signée par la maison que le passeport désigne, et non par une autre clé du registre.
- **Garde des clés pour la démo** : les clés privées des émetteurs sont générées et conservées par Certis, chiffrées en base (AES-256-GCM) par une clé maîtresse lue dans l'environnement (`KEY_ENCRYPTION_KEY`). Un vol de la base seule ne donne aucune clé.
- **L'émetteur de démonstration est fictif** (« Atelier de démonstration »), et affiché comme tel. Les montres du seed sont de vraies références, mais aucune maison réelle n'est présentée comme ayant signé quoi que ce soit.

## Cible, et ce qui n'est pas prétendu

En production, la clé d'une maison vit dans son HSM ou son KMS, et Certis ne connaît que la clé publique, publiée par la maison sur son propre domaine. Tant que Certis garde les clés, la séparation entre maison et plateforme est **logique, pas réelle** : un administrateur de Certis qui détient la clé maîtresse peut signer au nom d'un émetteur. Ce n'est pas présenté comme davantage (voir le modèle de menace).

## Options écartées

- **Clé unique de plateforme** (l'existant) : c'est précisément N3.
- **Clé dans une variable d'environnement par émetteur** : ne se met pas à l'échelle et rend la rotation manuelle.
- **Clés privées en clair en base** : une sauvegarde volée suffirait à signer au nom de toutes les maisons.

## Conséquences

- Nouvelle variable obligatoire `KEY_ENCRYPTION_KEY` (32 octets en base64), générée par `npm run dev` et par Render (`generateValue`).
- L'écran « Inscrire une pièce » n'existe plus que pour les comptes émetteurs.
- Un vérificateur indépendant n'a besoin que de la JWKS et des données de la pièce (ADR-0004, ADR-0006).
