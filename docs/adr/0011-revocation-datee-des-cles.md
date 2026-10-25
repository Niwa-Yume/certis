# ADR-0011 — Révocation datée des clés d'émetteur

- Statut : accepté
- Date : 2026-10-25
- Suite liée : S-02 (vision marché, section 9) ; complète l'ADR-0003
- Commits : `f05265b` (tests rouges), `4581ac7` (correctif)

## Contexte

L'ADR-0003 prévoit la **rotation** : une nouvelle clé remplace l'ancienne, qui reste publiée pour que les passeports déjà émis restent vérifiables. Rien ne traitait la **compromission**. Une clé volée restait valide pour tout ce qu'elle signait, y compris un faux passeport fabriqué par le voleur.

## Décision

- **Une date de révocation par clé** (`revokedAt`), publiée dans la JWKS comme membre de la clé, au même titre que `issuer`.
- **La règle** : une signature par une clé révoquée est refusée si la date signée (passeport : `validFrom` ; maillon : `at`) est égale ou postérieure à la date de révocation. Une date illisible compte comme postérieure. Ce que la clé a signé avant reste valide.
- **La date peut être passée.** Une compromission se découvre souvent après coup : on révoque à la date estimée de la fuite.
- **La même règle partout** : vérification du serveur, vérification publique, vérificateur indépendant (`tools/verify`).
- **Si la clé révoquée était active**, l'émetteur en reçoit aussitôt une nouvelle.
- **Commande d'exploitation** : `npm run issuer:revoke -- <kid> [date]`. Elle indique combien de passeports et de maillons sont désormais refusés. En cible, la maison révoque elle-même sa clé et le publie sur son domaine (ADR-0003).

## Ce que cela garantit, et ce que cela ne garantit pas

- **Dans le registre Certis, la règle est fiable.** Les dates des passeports et des maillons sont posées par le serveur au moment de l'écriture, et une clé révoquée ne signe plus rien. Un voleur qui n'a que la clé ne peut rien inscrire au registre.
- **Hors du registre, pas encore.** La date d'une signature est déclarée par le signataire. Avec la clé volée, on peut fabriquer un fichier de preuve antidaté, d'avant la révocation, que `tools/verify` accepterait. Seul un **ancrage horodaté** de la tête de chaîne chez un tiers (S-04, ADR-0007) prouvera qu'un maillon existait avant une date.
- **Le prix d'une révocation antidatée.** Les pièces légitimes inscrites par la maison entre la fuite et sa découverte deviennent « non confirmées ». C'est voulu : faute de pouvoir distinguer le vrai du faux dans cette fenêtre, on refuse. La maison doit ensuite les **réémettre**, opération qui n'existe pas encore (suite S-07).
- **La clé de la plateforme n'est pas couverte.** Elle vit dans une variable d'environnement, et la changer retirerait l'ancienne de la JWKS, donc invaliderait tous les maillons qu'elle a signés. La rotation de la clé plateforme reste à concevoir.

## Options écartées

- **Révocation totale**, qui invalide toutes les signatures de la clé, passées comprises : toutes les pièces de la maison devraient être réémises, même celles signées bien avant la fuite.
- **Liste de révocation séparée (CRL)** : un document de plus à publier, à signer et à mettre en cache, alors que la JWKS est déjà le point de vérité des clés.
- **Statut interrogé en ligne (à la OCSP)** : il rendrait la vérification indépendante dépendante de Certis, l'inverse du but (ADR-0004).
