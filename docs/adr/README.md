# Décisions d'architecture (ADR)

Une décision structurante = une ADR courte : le contexte, la décision, ses conséquences, les options écartées. Numérotées dans l'ordre où elles ont été prises. Le numéro 0010 est réservé à la licence du dépôt, pas encore décidée (backlog S-06).

| # | Décision | Statut | Date |
|---|---|---|---|
| [0001](0001-cle-exposee-pas-de-reecriture-historique.md) | Clé exposée dans l'historique : rotation, pas de réécriture | accepté | 2026-10-23 |
| [0002](0002-consommation-atomique-du-nonce.md) | Consommation atomique du nonce et garde optimiste sur le propriétaire | accepté | 2026-10-23 |
| [0003](0003-emetteur-et-garde-des-cles.md) | Émetteur, rôles et garde des clés | accepté | 2026-10-24 |
| [0004](0004-format-du-passeport.md) | Format du passeport : JWS ES256 sur un JSON canonique | accepté | 2026-10-24 |
| [0005](0005-numero-de-serie-en-empreinte.md) | Numéro de série : empreinte HMAC, contrôle borné | accepté | 2026-10-24 |
| [0006](0006-journal-d-evenements-chaine.md) | Journal d'événements chaîné, append-only imposé par la base | accepté | 2026-10-24 |
| [0007](0007-ancrage-horodatage-rfc3161.md) | Ancrage externe : horodatage RFC 3161 des têtes de chaîne | accepté | 2026-10-25 |
| [0008](0008-hebergement-render-neon.md) | Hébergement : Render (API et web) et Neon (Postgres) | proposé, à confirmer au premier déploiement | 2026-10-23 |
| [0009](0009-direction-visuelle-registre-v6.md) | Direction visuelle « Registre », version 6 | remplacée en partie par 0014 (couleurs, polices, mouvement) | 2026-10-24 |
| [0011](0011-revocation-datee-des-cles.md) | Révocation datée des clés d'émetteur | accepté | 2026-10-25 |
| [0012](0012-essayer-certis.md) | Essayer Certis : pièce d'essai, maison de démonstration, catalogue | accepté ; catalogue et maison repris par 0015 | 2026-10-25 |
| [0013](0013-messages-de-refus.md) | Messages de refus : ce qui s'est passé, puis comment corriger | accepté ; version anglaise ajoutée par 0015 | 2026-10-25 |
| [0014](0014-tokens-maison-et-theme-sombre.md) | Une identité par tokens : maison ou neutre, de jour ou de nuit | accepté | 2026-11-25 |
| [0015](0015-ecran-de-verification-et-maison-fictive.md) | Écran de vérification, maison fictive, refus en anglais | accepté | 2026-11-25 |
| [0016](0016-fiche-de-vie-et-visage-de-la-maison.md) | Fiche de vie : un récit, un visage, la maison ; les preuves en dernier | accepté | 2026-11-25 |
| [0017](0017-invitation-remise-et-carte.md) | Invitation, remise et carte | accepté ; liaison au compte précisée par 0019 | 2026-11-25 |
| [0018](0018-revision-et-partage.md) | Révision en trois étapes et partage choisi par le propriétaire | accepté ; révision rattachée au propriétaire actuel par 0019 | 2026-11-25 |
| [0019](0019-corrections-audit-securite-run-1.md) | Corrections de l'audit de sécurité, run 1 | accepté | 2026-11-26 |
