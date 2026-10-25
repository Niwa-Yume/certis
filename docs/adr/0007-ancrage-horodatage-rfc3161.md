# ADR-0007 — Ancrage externe : horodatage RFC 3161 des têtes de chaîne

- Statut : accepté
- Date : 2026-10-25
- Suite liée : S-04 (ancien P3-09) ; complète l'ADR-0006 et l'ADR-0011
- Commits : `5c9ad80` (tests rouges), `57d8e43` (correctif), `66fb1c9` (démo)

## Contexte

Deux risques résiduels du modèle de menace tenaient à la même cause : hors de Certis, rien n'attestait qu'un maillon existait à une date donnée.

- **N° 3, réécriture complète.** Un superutilisateur qui désactive le trigger, réécrit une chaîne et la re-signe avec les clés passe toutes les vérifications. Seule une copie antérieure de la tête de chaîne le trahissait, à condition de l'avoir gardée et comparée à la main.
- **N° 14, antidatage.** Avec une clé volée, on fabrique un fichier de preuve daté d'avant la révocation, et `tools/verify` l'acceptait : la date d'une signature est déclarée par le signataire.

## Décision

- **Ce qui est horodaté.** Les têtes de chaîne nouvelles depuis le dernier ancrage, réunies dans un arbre de Merkle (préfixes de la RFC 6962). Une tête couvre tous les maillons qui la précèdent, par `prevHash`. Seule la racine, 32 octets, part chez l'autorité : elle n'apprend ni les pièces, ni leur nombre.
- **Par qui.** Une autorité d'horodatage RFC 3161, FreeTSA par défaut (voir plus bas). `TSA_URL` permet d'en changer ; une valeur vide désactive l'ancrage. Le jeton renvoyé est une signature CMS (RFC 5652) de la racine et de la date.
- **Quand.** L'API ancre d'elle-même toutes les 10 minutes, s'il y a du nouveau. C'est moins que les 15 minutes après lesquelles Render endort l'instance (ADR-0008) : l'écriture qui réveille l'instance est ancrée avant qu'elle se rendorme. `npm run registry:anchor` ancre tout de suite (démo, exploitation). Une autorité injoignable ne bloque aucune écriture : l'ancrage est retenté au passage suivant.
- **Où.** Tables `Anchor` et `AnchorLeaf`, append-only par trigger comme le journal. Chaque preuve porte les ancrages de la pièce, qu'elle vienne de l'export du propriétaire, de la vérification publique ou du fichier téléchargé : tête ancrée, chemin d'audit, racine, jeton.
- **Vérification indépendante.** `tools/verify` reste sans dépendance. Pour chaque ancrage, il contrôle :
  - la signature du jeton ;
  - la chaîne de certificats jusqu'à une racine de confiance livrée avec l'outil (`tsa-ca.pem`, ou `CERTIS_TSA_CA`) ;
  - l'empreinte signée et le chemin d'audit ;
  - la présence de la tête ancrée dans la chaîne.

  Le même jeton se vérifie avec `openssl ts -verify`.
- **Preuves antérieures.** Passées en arguments supplémentaires, leurs ancrages doivent se retrouver dans la chaîne actuelle. C'est ce qui trahit une réécriture postérieure, avec une date que l'opérateur ne peut pas contester.
- **Révocation hors ligne** (complète l'ADR-0011). Le vérificateur n'accepte la signature d'une clé révoquée que si un ancrage la prouve antérieure à la révocation. Le serveur garde la règle de l'ADR-0011, puisqu'il date lui-même ses maillons.

## Le choix de l'autorité

Sources consultées le 2026-10-25. FreeTSA et DigiCert ont répondu à une requête de test, et leurs jetons ont été vérifiés par `openssl ts -verify` puis par `tools/verify`. Sectigo n'a pas été essayé.

| Autorité | Pour | Contre |
|---|---|---|
| [FreeTSA](https://freetsa.org/) | Se présente comme gratuite ; certificat de signature ECDSA P-384, valable pour les jetons émis jusqu'en février 2040 ; racine valable jusqu'en 2041 | Service d'une seule personne, sans engagement de disponibilité publié ; racine absente des magasins de confiance (vérifié sur macOS), donc livrée avec le vérificateur |
| [DigiCert](https://knowledge.digicert.com/generalinformation/INFO4231.html) | Racine présente dans les magasins de confiance courants (DigiCert Trusted Root G4, vérifié sur macOS) ; jeton RSA avec intermédiaire, accepté par le vérificateur | Conditions d'usage hors signature de code introuvables |
| [Sectigo](https://www.sectigo.com/resource-library/time-stamping-server) | Point d'accès eIDAS distinct (`/qualified`) | Demande 15 s entre deux requêtes scriptées ; conditions et gratuité du point qualifié non précisées sur la page |

**Décision : FreeTSA**, la seule des trois dont la gratuité est affirmée. Pour un registre réel, une autorité **qualifiée** eIDAS apporterait une présomption d'exactitude de la date et d'intégrité des données (règlement 910/2014, art. 41, § 2). Un horodatage non qualifié reste recevable comme preuve (§ 1). Le texte a été lu sur des copies secondaires ([gesetze.legal](https://gesetze.legal/eu/vo_eu_2014_910/41), [legislation.gov.uk](https://www.legislation.gov.uk/eur/2014/910/article/41/data.xht)), pas sur EUR-Lex : à confirmer avant de s'en prévaloir. Changer d'autorité ne demande que `TSA_URL`, et la racine dans `CERTIS_TSA_CA`.

## Ce que cela garantit, et ce que cela ne garantit pas

- **Un maillon ancré existait au plus tard à la date du jeton.** Personne, pas même l'opérateur avec toutes les clés, ne peut produire après coup une preuve plus ancienne.
- **Risque n° 3 réduit.** Quiconque a gardé une preuve antérieure détecte une réécriture. Sans preuve antérieure, la chaîne réécrite passe seule, mais ses maillons ne sont attestés qu'à partir de la date de la réécriture. Le vérificateur affiche cette date d'ancrage : un écart avec les dates des maillons se lit, il n'est pas jugé.
- **Risque n° 14 fermé hors ligne.** Un fichier antidaté avec une clé volée ne porte aucun ancrage antérieur à la révocation.
- **On fait confiance à l'autorité.** Une autorité qui antidaterait ruinerait la garantie. Deux autorités indépendantes réduiraient ce risque : non fait.
- **Fenêtre non ancrée.** Elle dure jusqu'à 10 minutes en marche normale, davantage si l'autorité est injoignable. Une pièce légitime signée dans cette fenêtre par une clé révoquée ensuite est refusée hors ligne ; c'est à réémettre (S-07).
- **Historique importé.** Les maillons datés du passé, comme ceux du seed, ne sont attestés qu'à partir de leur premier ancrage.
- **Pas d'affichage.** L'interface ne montre pas encore l'ancrage : seuls le fichier de preuve et le vérificateur l'exposent.
- **Échelle.** Un arbre par passage, et l'export recalcule le chemin d'audit à partir de toutes les feuilles de l'ancrage. À grande échelle, il faudrait un journal Merkle incrémental (RFC 9162).

## Options écartées

- **OpenTimestamps** : gratuit et sans compte, mais la confirmation dans Bitcoin n'est pas immédiate, et la vérification exige un client dédié et l'accès à la chaîne Bitcoin.
- **Un ancrage par maillon** : un appel réseau dans chaque écriture, au rythme que l'autorité tolère.
- **Workflow GitHub Actions planifié** (le plan initial de P3-09) : il exigerait dans GitHub les identifiants de la base de production, ou une route d'administration. L'API fait le même travail sans infrastructure ni secret de plus.
- **Publier la liste des têtes** : elle révélerait le nombre de pièces et leur activité. L'arbre de Merkle ne laisse rien filtrer.
- **Confier la vérification du jeton à `openssl`** : plus court, mais le vérificateur dépendrait d'un binaire externe. Il reste compatible avec lui.
