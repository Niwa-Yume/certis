# ADR-0016 — Fiche de vie : un récit, un visage, la maison ; les preuves en dernier

- Statut : accepté
- Date : 2026-11-25
- Lot 3 de l'expérience client (écrans 3 et 4)

## Contexte

La fiche d'une pièce s'ouvrait sur un grand mot (« CARRERA »), une loupe, puis trois onglets : Fiche, Provenance, Preuve. Le propriétaire lisait des données avant de lire une histoire, et rien ne disait qui, à la maison, avait émis le passeport. Dans la collection, les cartes d'une même rangée n'avaient pas la même hauteur.

## Décision

- **Collection (écran 3).** Une grande photo, le nom de la pièce, et son statut en un mot (Active, Volée, Essai). Le rouge est réservé à « volée ». Les cartes d'une rangée ont toutes la même hauteur : le titre occupe deux lignes, ni plus ni moins, et la référence est calée en bas de la carte. Le nom est coupé après le modèle : « Royal Oak » en droit, le reste en italique.
- **Fiche de vie (écran 4), dans cet ordre :**
  1. la photo, sur au moins la moitié du premier écran ;
  2. la marque, la référence, le statut et le nom ;
  3. la personne qui a émis le passeport ;
  4. le récit en phrases (« Inscrite par la maison le…, révisée…, a changé de propriétaire… »), puis la chronologie ;
  5. l'histoire de la référence ;
  6. la prochaine révision conseillée, cinq ans après la dernière intervention de la maison ;
  7. les liens de la maison ;
  8. les caractéristiques ;
  9. les preuves, repliées.

  Les onglets, le grand mot et la loupe disparaissent.
- **Un visage, hors du passeport.** Un compte de maison peut porter un nom affiché, un rôle et une photo (`User.displayName`, `title`, `photoUrl`). Chaque pièce retient qui l'a inscrite (`Asset.issuedById`). Le visage s'affiche sur la fiche et sur la vérification publique, mais il n'entre pas dans le passeport signé : changer de photo ne casse aucune signature. On le renseigne avec `issuer:grant`, au moyen de trois arguments facultatifs.
- **Ce que la maison raconte.** Une entrée de catalogue peut porter `story`, l'histoire de la référence, et la maison de démo peut porter des `links`. Le fichier local d'une maison réelle (ADR-0015) les fournit. La maison fictive n'en a pas.

## Conséquences

- Le nom et la photo d'un employé de la maison deviennent visibles de tout acheteur qui vérifie une pièce. C'est un choix de la maison, facultatif : sans `displayName`, rien ne s'affiche. Il entre dans l'analyse d'impact (docs/security/AIPD.md, à compléter).
- Si le compte de cette personne est supprimé, la fiche n'affiche plus de visage (`ON DELETE SET NULL`). Le passeport, lui, ne change pas.
- La règle des cinq ans pour la prochaine révision est une constante d'affichage, pas une promesse de la maison. La demande de révision arrive au lot 5.
- Un nom trop long est coupé à deux lignes dans la collection. Il reste entier sur la fiche.

## Options écartées

- **Le visage dans le passeport signé** : il faudrait réémettre toutes les pièces au moindre changement de photo, et une donnée personnelle se retrouverait figée dans une signature.
- **Des cartes de hauteur libre** : c'est l'incohérence relevée en revue.
