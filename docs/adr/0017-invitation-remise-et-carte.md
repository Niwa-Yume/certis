# ADR-0017 — Invitation, remise et carte : la maison attend son client, le passeport s'active devant lui

- Statut : accepté
- Date : 2026-11-25
- Lot 4 de l'expérience client (écrans 1 et 2)

## Contexte

Une maison ne pouvait inscrire une pièce qu'au nom d'un compte existant. Le client devait donc créer son compte seul, saisir son e-mail, puis attendre. Rien ne marquait la remise : le passeport existait déjà, et aucun objet ne l'accompagnait. Le brief demande :
- un compte créé en moins de 60 secondes, sans numéro de série, avec un seul bouton ;
- un passeport qui devient actif devant le client en moins de 3 secondes, animation comprise ;
- une carte physique avec un QR.

## Décision

- **Pas d'e-mail envoyé.** La maison montre l'invitation en boutique, sous forme de QR ou de lien (coupe acceptée au lot 0) : pas de fournisseur, pas de secret, pas de délivrabilité à gérer.
- **Invitation.** Elle est réservée à la maison qui détient la pièce dans son stock. Le jeton fait 256 bits, il n'est rendu qu'une fois, et la base n'en garde que l'empreinte (SHA-256). Il vaut 7 jours. Une nouvelle invitation remplace la précédente.
- **Écran 1.** Le client voit la pièce, la maison, la personne qui l'a préparée (ADR-0016) et son e-mail masqué. Il choisit un mot de passe, et un seul bouton crée son compte. Le compte prend l'e-mail invité, jamais un e-mail saisi, et ne reçoit pas de pièce d'essai.
- **La pièce attendue.** Elle apparaît dans la collection du client (« Attendue »), mais elle reste à la maison : ni QR de vérification ni cession avant la remise.
- **Remise (écran 2) : aucune nouvelle sémantique.** La maison émet une offre de cession réservée au compte du client (le mécanisme existant). Le client la scanne et l'accepte ; un maillon `TRANSFER` est signé. La réponse dit `handover: true` quand la pièce quitte le stock de sa maison, et l'e-mail invité est alors oublié.
- **Le seul geste animé signature de l'app.**
  1. La carte du passeport se pose (300 ms).
  2. Un filet de métal la parcourt (400 ms).
  3. « Passeport actif » s'inscrit (300 ms), avec une vibration de 30 ms.

  Le tout est joué une fois, en ease-out, et reste immobile sous `prefers-reduced-motion` (la vibration reste). Mesuré de bout en bout dans le navigateur, du geste à la fin de l'animation : 1,15 s.
- **Carte.** Un identifiant de 128 bits, créé avec la première invitation. Son QR mène à une page publique qui ne dit que l'état du passeport : pas encore activée, vérifié (émis par la maison), non confirmé, ou déclarée volée à une date. Elle ne montre ni propriétaire ni histoire : c'est le propriétaire qui la partage (lot 5). La maison l'imprime seule depuis la fiche.
- **Côté maison, un outil métier sobre.** Sur la fiche d'une pièce de son stock : l'e-mail du client, « Inviter le client », « Remettre la pièce », et la carte à imprimer.

## Conséquences

- La chaîne et le passeport ne changent pas : la remise est une cession, vérifiable par `tools/verify` comme les autres.
- Le modèle de menace compte quatre lignes de plus et un risque résiduel : une invitation photographiée par un tiers avant le client. Elle ne lui donne pas la pièce, qui reste réservée au moment de la remise.
- L'e-mail invité est une donnée personnelle détenue sans compte, jusqu'à la remise (7 jours au plus pour le jeton). Il est supprimé à la remise et à l'effacement du compte. Il entre dans l'analyse d'impact (AIPD).

## Options écartées

- **Un e-mail d'invitation** : il ajoute un fournisseur et des secrets, et le client est de toute façon en boutique.
- **Un jeton d'activation propre à la carte** : ce serait une deuxième capacité à protéger. La cession réservée fait déjà ce travail.
- **Inscrire la pièce au nom du client dès l'invitation** : le passeport serait actif avant la remise, ce qui ôte le moment au client.
