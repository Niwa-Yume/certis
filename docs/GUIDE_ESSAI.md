# Essayer Certis

Ce que l'on peut faire avec l'app, pas à pas, sur les sept écrans de la démo. Chaque refus dit ce qui s'est passé et comment corriger (ADR-0013) : les essais « qui échouent » font partie du parcours. Pour la version jouée en 3 minutes devant un public, voir [`DEMO.md`](../DEMO.md).

## Démarrer

- **En local** : `npm run dev` (ou `WEB_PORT=8091 npm run dev` si le port 8090 est pris), puis ouvrir l'adresse du web. Depuis un téléphone du même réseau, utilisez l'adresse que la commande affiche.
- **En ligne** : l'adresse de `certis-web` sur Render, une fois déployé (voir le README, section Déploiement).
- **Langue et thème** : ajoutez `?lang=en` à n'importe quelle adresse pour l'anglais. Le thème sombre suit le réglage du système.

Comptes de démonstration (locaux seulement ; mots de passe dans [`backend/prisma/seed.ts`](../backend/prisma/seed.ts)) :

| Compte | Ce qu'il a |
|---|---|
| `atelier@certis.demo` | La Maison Orvène (fictive), dont le visage est Claire Vasseur, conseillère horlogère. 3 pièces en stock, une par référence de son catalogue. |
| `certis@pro.com` | Une Équinoxe Phase de Lune, révisée. |
| `julien.castro@certis.local` | Une Méridienne Petite Seconde, révisée puis reçue par cession. |

Pour jouer le client et l'acheteur, utilisez une fenêtre privée ou un second navigateur.

## 1. Côté maison : inviter, puis remettre

Connecté avec `atelier@certis.demo` :

1. **Inscrire une pièce** (facultatif). « Inscrire une pièce », puis cherchez dans le catalogue (« Méridienne », « OR-1201 »). La fiche se remplit : vérifiez-la, puis saisissez un numéro de série. Sans e-mail de client, la pièce reste en stock.
2. **Inviter le client (écran 1).** Ouvrez une pièce du stock. Dans « Remise au client », saisissez l'e-mail du client, puis « Inviter le client ». Un QR et son lien apparaissent, valables 7 jours, ainsi que la carte de la pièce à imprimer.
3. **Remettre la pièce (écran 2).** Une fois que le client a créé son compte avec l'invitation, choisissez « Remettre la pièce ». Le QR qui apparaît est réservé à ce compte et valable 5 minutes.
4. **Recevoir et rendre une révision (écran 5).** Sur « Vos pièces », la file « Révisions en cours » montre les demandes des propriétaires. Choisissez « Recevoir en atelier », puis, une fois le travail fait, décrivez-le et « Rendre la pièce ». La révision entre dans l'histoire signée de la pièce.

## 2. Côté client : de l'invitation à la vie de la pièce

1. **L'invitation (écran 1).** Ouvrez le lien d'invitation. La page montre la montre, la maison, la personne qui l'a préparée et votre e-mail masqué. Choisissez un mot de passe, puis « Créer mon compte » : la pièce vous attend dans votre collection, marquée « Attendue ».
   - Si vous avez déjà un compte à cette adresse : « Me connecter », puis, de retour sur l'invitation, « Ajouter à ma collection ». C'est le jeton de l'invitation qui vous lie à la pièce, pas votre e-mail (ADR-0019).
2. **La remise (écran 2).** Ouvrez le QR de remise que la maison vous présente, puis « Accepter la pièce ». La carte du passeport se pose et « Passeport actif » s'inscrit : c'est le seul geste animé de l'app. Il ne bouge pas si votre appareil demande moins d'animations.
3. **La collection (écran 3).** La pièce en grand, son nom et son statut en un mot.
4. **La fiche de vie (écran 4).** Ouvrez la pièce. Vous y trouvez, dans cet ordre :
   - qui l'a émise ;
   - son histoire en phrases, puis sa chronologie ;
   - l'histoire de la référence, si la maison l'a écrite ;
   - la prochaine révision conseillée, et les liens de la maison s'il y en a ;
   - les caractéristiques ;
   - les preuves, repliées.
5. **Demander une révision (écran 5).** « Demander une révision ». La maison reçoit votre e-mail pour convenir du dépôt, et chaque étape dit ce qui se passe et quand.
6. **Partager (écran 6).** Rien n'est visible sans vous. Choisissez 1 heure, 24 heures ou 7 jours, cochez ou non « Montrer son histoire », puis « Créer le lien ». Le lien et son QR ouvrent l'écran 7. « Arrêter ce partage » le rend invalide tout de suite.
7. **Déclarer la pièce volée, puis retrouvée.** En bas de la fiche. Tant qu'elle est déclarée volée, la pièce ne peut pas changer de mains, et toute vérification l'affiche en rouge, avec la date.

## 3. Côté acheteur : vérifier, puis recevoir (écran 7)

1. **Vérifier.** Le propriétaire choisit « Présenter pour vérification ». Scannez le QR, sans compte (60 s, usage unique). La réponse tient en une ligne : « Passeport vérifié, émis par Maison Orvène », puis la pièce, ce que le passeport prouve, son histoire, et les étapes pour l'acheter.
2. **Comparer le numéro gravé.** Dans « Preuves », saisissez le numéro gravé sur le boîtier. Certis ne le conserve pas : il compare son empreinte, 5 fois au plus par QR.
3. **Recevoir la pièce.** Le propriétaire choisit « Céder la pièce » et saisit votre e-mail. Ouvrez le QR depuis votre compte, puis « Accepter la pièce ». Elle entre dans votre collection, avec toute son histoire.
4. **Vérifier sans Certis.** Dans les preuves de la fiche, téléchargez le fichier de preuve, puis lancez `node tools/verify/verify.mjs preuve.json http://localhost:3001/.well-known/certis-keys`.

## 4. La pièce d'essai

Tout compte créé hors invitation reçoit une pièce d'essai : une montre fictive, « Certis · Pièce d'essai », sans valeur, qui passe par les mêmes contrôles qu'une vraie (ADR-0012).
- Sa vérification affiche d'abord l'avertissement « Pièce d'essai ».
- Son numéro gravé, pour la comparaison, est `ESSAI-0001`.
- Un compte qui ne détient que sa pièce d'essai peut être supprimé : elle revient à Certis.

## 5. Les refus à essayer

| Essai | Ce que l'app répond |
|---|---|
| Créer un compte avec un mot de passe de 5 caractères | Le champ et la règle à respecter |
| Ouvrir une invitation expirée (plus de 7 jours) | Demander une nouvelle invitation à la maison |
| Accepter une invitation pour un e-mail qui a déjà un compte | Se connecter, puis rouvrir l'invitation |
| Remettre une pièce avant que le client ait accepté l'invitation | Le client doit d'abord ouvrir l'invitation |
| Accepter un QR de cession réservé à quelqu'un d'autre | Se connecter avec l'e-mail indiqué par le vendeur, ou demander un nouveau QR |
| Réutiliser un QR, ou attendre qu'il expire | Demander un nouveau QR au propriétaire |
| Demander une seconde révision tant que la première est en cours | Suivre celle qui est en cours sur la fiche |
| Ouvrir un partage arrêté, expiré, ou d'une pièce cédée depuis | « Ce partage n'est plus valable » : demander un nouveau lien |
| Céder une pièce déclarée volée | La cession est bloquée jusqu'à ce que le propriétaire lève l'alerte |
| Supprimer un compte qui détient une vraie pièce | La céder d'abord |

## En ligne

Une instance déployée démarre vide. Pour y avoir la maison de démonstration et son stock, lancez le seed une fois avec les variables de production, plus `DEMO_ISSUER_PASSWORD`, un mot de passe à vous (voir le README, section Déploiement). Sur une base distante, il ne crée que la maison, n'efface rien, et refuse de tourner sans ce mot de passe.
