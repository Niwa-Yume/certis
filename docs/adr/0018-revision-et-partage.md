# ADR-0018 — Révision en trois étapes et partage choisi par le propriétaire

- Statut : accepté
- Date : 2026-11-25
- Lot 5 de l'expérience client (écrans 5 et 6)

## Contexte

Une révision n'existait que si la maison l'enregistrait d'elle-même. Le propriétaire ne pouvait ni la demander ni la suivre. Pour montrer sa pièce, il ne disposait que d'un QR de 60 secondes, à usage unique, qui montrait toute l'histoire. Le brief demande :
- une demande de révision dont chaque étape dit ce qui se passe et quand, et dont le retour s'inscrit dans l'histoire ;
- que rien ne soit public sans action explicite du propriétaire, par un lien ou un QR à durée limitée.

## Décision

- **Trois étapes fixes : demandée, en atelier, rendue** (coupe acceptée au lot 0). Pas de rendez-vous ni de planning.
  - Le propriétaire demande. Une seule demande à la fois, jamais pour une pièce déclarée volée.
  - La maison qui a émis la pièce la reçoit, puis la rend avec une note.
  - Le retour écrit, dans la même transaction, un maillon `SERVICE` signé (le mécanisme existant) : la révision entre dans l'histoire vérifiable.
- **Ce que dit chaque étape.**
  - Demande envoyée, à sa date : la maison vous contacte pour convenir du dépôt.
  - En atelier, depuis sa date : retour prévu vers une date, estimée à six semaines. C'est une constante d'affichage, pas un engagement de la maison.
  - Rendue, à sa date : inscrite dans son histoire.
- **L'e-mail du propriétaire va à la maison, et à elle seule**, parce qu'il a demandé la révision et que la phrase sous le bouton le lui dit. Aucune autre maison ne voit la demande.
- **Côté maison**, une file « Révisions en cours » sur la collection : recevoir en atelier, rendre la pièce avec ce qui a été fait.
- **Le partage est un objet distinct du QR de vérification.** Ce dernier garde sa sémantique : 60 secondes, usage unique, présenté en personne. Le partage est un jeton de 256 bits, dont la base ne garde que l'empreinte.
  - Durée de 1 heure, 24 heures ou 7 jours, rien d'autre.
  - Un seul choix : montrer l'histoire ou non. Sans histoire, le lien ne montre que la réponse de l'écran 7 (passeport vérifié, maison, statut de vol), sans chaîne ni fichier de preuve.
  - Le propriétaire l'arrête quand il veut ; il ne vaut plus non plus si la pièce change de mains.
  - La comparaison du numéro gravé reste réservée au QR présenté en personne.
- **La même vue publique pour les deux chemins.** `publicView` sert le QR et le partage, pour qu'un tiers lise toujours la même chose.

## Conséquences

- Le nonce de vérification, qui fait partie du socle, ne change pas. Le lot 0 prévoyait de lui ajouter des durées, mais un objet à part, révocable, ne touche pas au socle.
- La maison détient l'e-mail du client tant que la demande existe. Il entre dans l'analyse d'impact (AIPD), avec le visage (ADR-0016) et l'invitation (ADR-0017).
- Le délai de six semaines est indicatif. Le remplacer par la date annoncée par la maison demanderait un champ de plus.

## Options écartées

- **Allonger la durée du QR de vérification** : il deviendrait un lien public durable et réutilisable, sans révocation, ce qui va contre l'ADR-0002.
- **Un partage champ par champ** : coupé au lot 0. Un seul choix (l'histoire ou non) suffit à dire « je montre » ou « je prouve seulement ».
