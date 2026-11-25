# ADR-0019 — Corrections de l'audit de sécurité, run 1

- Statut : accepté
- Date : 2026-11-26
- Suite de l'audit ciblé des lots 2 à 6 (profil `quick`, revue de source). Le rapport est gardé hors dépôt.

## Contexte

L'audit a laissé trois pistes « à valider », sans constat confirmé : il ne pouvait pas exécuter le code. Chacune a d'abord été reproduite par un test qui échoue (commit `75cdd7b`), puis corrigée. Deux tests Playwright confirment la première : le lien forgé faisait bien passer la pièce à « volée », avec `/verify` sans aucun clic.

## Décision

1. **Le client encode l'identifiant qui vient d'un lien.**
   - Le défaut : `claim.tsx`, `verify.tsx` et `watch/[id].tsx` inséraient l'`id` décodé dans le chemin de l'API. Un `/` et un `?` redirigeaient la requête authentifiée vers une autre action du propriétaire : déclarer la pièce volée, lever l'alerte, ouvrir une révision.
   - La correction : l'`id` passe par `encodeURIComponent`, comme dans les autres écrans. La correction est au point où le défaut naît, dans le client. L'API n'a pas à deviner qu'un chemin a été fabriqué.
2. **L'invitation est liée au compte qui présente son jeton, pas à l'e-mail.**
   - Le défaut : l'inscription ne vérifie pas les e-mails. Inscrire l'adresse du client suffisait à voir sa pièce, à bloquer son compte et à devenir le destinataire réservé de la remise.
   - Désormais, `Invitation.acceptedUserId` enregistre le compte qui a présenté le jeton :
     - soit à la création du compte par `acceptInvitation` ;
     - soit par `POST /invitations/:token/link`, pour un compte existant, connecté et qui porte l'e-mail invité.
   - Seul ce compte voit la pièce attendue.
   - Une offre de remise à l'e-mail invité est refusée tant que l'invitation n'est pas acceptée par ce compte.
   - L'effacement d'un compte ne supprime que les invitations qu'il a acceptées.
3. **Une demande de révision ne vaut que pour le propriétaire actuel.**
   - Le défaut : après une cession, la demande ouverte de l'ancien propriétaire bloquait le nouveau et gardait son e-mail dans la file de la maison.
   - Désormais, la règle « une demande à la fois » s'applique par propriétaire. La file de la maison et ses étapes (réception, retour) ignorent les demandes d'un ancien propriétaire.
   - La demande n'est pas effacée : la maison garde trace de la montre qu'elle a en atelier. Elle ne peut seulement plus inscrire cette révision dans l'histoire du nouveau propriétaire.

## Conséquences

- **Risque résiduel.** Qui inscrit l'e-mail du client avant lui l'empêche encore de créer son compte avec cette adresse (409) : sans envoi d'e-mail, on ne peut pas prouver qui la possède. Mais il ne voit plus rien et ne peut plus recevoir la pièce. La maison réinvite avec une autre adresse. Le seul vrai remède est la vérification de l'e-mail, qui demande un fournisseur d'envoi : écarté au lot 0, à reprendre avant toute production.
- **Remise à une adresse déjà enregistrée.** Le client doit ouvrir l'invitation avec le QR en boutique, puis se connecter. La remise ne passe plus sur la seule foi de l'e-mail.
- **Vérification.** 77/77 tests e2e de l'API. Le parcours de démo et les deux tests du client, dans le navigateur, passent 10 fois de suite sur mobile et sur ordinateur (60/60).

## Options écartées

- **Refuser à l'API les chemins inattendus** (par exemple un corps présent sur une route qui n'en attend pas) : c'est un garde-fou de plus, pas la cause. La cause est l'encodage côté client.
- **Effacer les demandes de révision ouvertes à la cession** : la maison perdrait la trace d'une montre qu'elle a physiquement en atelier.
- **Vérifier l'e-mail à l'inscription** : c'est la vraie réponse au risque résiduel, mais elle demande un fournisseur d'envoi d'e-mails. Hors du périmètre de la démo.
