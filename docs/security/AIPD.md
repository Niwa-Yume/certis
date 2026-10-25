# Analyse d'impact (AIPD) — brouillon technique

Version du 2026-10-24, après S-01. **Ce n'est pas un avis juridique.** C'est l'inventaire technique, tiré du code, qu'un juriste ou un délégué à la protection des données complétera avant que Certis traite les données de vraies personnes.

Cadres concernés :
- le RGPD, art. 35 ;
- la loi suisse sur la protection des données (LPD), art. 22 ;
- les lignes directrices 02/2025 de l'EDPB sur les registres immuables.

## Ce qui est traité

| Donnée | Où | Pourquoi | Durée |
|---|---|---|---|
| E-mail, empreinte bcrypt du mot de passe, rôle | `User` | Compte, connexion, rôle d'émetteur | Jusqu'à la suppression du compte |
| Lien entre le propriétaire et la pièce | `Asset.ownerId` | Le registre : qui détient quelle montre | Tant que la pièce est détenue |
| Émetteur et destinataire d'un QR, dates | `AuthNonce` | Vérification, cession réservée | **Pas de purge aujourd'hui** (à corriger) |
| Pseudonymes par pièce, dates | `Event.data` (append-only) | Provenance vérifiable | Permanente ; non rattachables après suppression du compte |
| Numéro de série | Nulle part : seulement une empreinte HMAC | Lier le passeport à l'objet | — |
| Racine de Merkle des têtes de chaîne (32 octets) | Autorité d'horodatage (FreeTSA), et `Anchor` | Ancrage (ADR-0007) | Permanente ; aucune donnée personnelle, ni identifiant de pièce |
| Jeton de session | Navigateur (`localStorage`), 1 h | Session | Expiration |
| Adresses IP | Journaux de l'hébergeur (Render) | Exploitation, limitation de débit | **Inconnue** : dépend de l'hébergeur |

Personnes concernées : propriétaires, comptes émetteurs (employés d'une maison), acheteurs qui vérifient. Les acheteurs n'ont pas de compte ; seule leur IP passe.

## Les risques pour les personnes

| Risque | Gravité | Mesures en place | Reste à faire |
|---|---|---|---|
| **Fuite de la table « qui possède quelle montre »** : elle désigne des cibles de vol | Élevée | Lecture réservée au propriétaire (404 sinon) ; aucune identité dans les réponses publiques ni dans le journal ; vérification publique conditionnée à un QR du propriétaire | Chiffrement de la base au repos chez l'hébergeur ; accès administrateur journalisé |
| Ré-identification des pseudonymes par l'opérateur, qui détient la clé HMAC | Moyenne | Pseudonymes par pièce, pas de collection reconstituable ; le compte supprimé rend le lien impossible (S-01) | Séparer la clé HMAC de la clé maîtresse en production |
| Prise de contrôle d'un compte | Moyenne | bcrypt, 10 tentatives par minute, mot de passe redemandé pour supprimer le compte | Second facteur pour les comptes émetteurs |
| Donnée personnelle écrite dans une note de révision, gravée dans la chaîne | Moyenne | Aucune | Consigne aux émetteurs ; avertissement dans le formulaire |
| Conservation sans fin des QR expirés | Faible | Usage unique, 60 s à 5 min | Purge planifiée |

## Droits des personnes

| Droit | État |
|---|---|
| Effacement | **Fait** (S-01) : `DELETE /auth/me` et « Supprimer mon compte ». Refusé tant que le compte détient des pièces. |
| Accès, portabilité | Partiel : ses pièces (`GET /assets`), leur provenance et leur preuve (`GET /assets/:id/history`). Pas d'export global du compte. |
| Rectification | À faire : changement d'e-mail. |
| Information | À faire : politique de confidentialité, mention du stockage local. |

## Avant toute donnée réelle

1. Validation de cette analyse par un juriste : base légale de chaque traitement, durées, information des personnes.
2. Région d'hébergement dans l'UE ou en Suisse (Render, Neon) et contrats de sous-traitance.
3. Purge des QR expirés ; durée de conservation des journaux de l'hébergeur.
4. Rectification de l'e-mail ; procédure manuelle pour un propriétaire qui ne peut plus céder ses pièces (décès, perte d'accès).
5. Procédure de notification de violation de données (72 h dans l'UE).
