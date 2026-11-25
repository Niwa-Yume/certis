# Démo de 3 minutes : une montre, de la remise à la revente

Une seule pièce, suivie par trois personnes : **la maison** (sur l'ordinateur), **son client** (sur un téléphone) et **un acheteur** (sur un second téléphone, ou sur l'ordinateur en fenêtre privée). Ce qu'on fait est en romain ; *ce qu'on dit est en italique*.

L'impression à laisser : *la maison reste présente dans la vie de ma montre*.

## Avant de commencer (5 minutes, hors chrono)

1. `npm run dev` à la racine (ou `WEB_PORT=8091 npm run dev` si le port 8090 est pris). Les téléphones utilisent l'adresse réseau que la commande affiche.
2. La maison :
   - un compte connecté sur l'ordinateur, émetteur de la maison : `npm --prefix backend run issuer:grant -- <e-mail> "<maison>" "<prénom nom>" "<rôle>"` ;
   - une pièce en stock, inscrite depuis « Inscrire une pièce ».
3. Téléphone du client : la page d'accueil ouverte, rien d'autre. Téléphone de l'acheteur : un compte déjà créé, connecté.
4. La maison : Audemars Piguet par défaut (`DEMO_HOUSE_FILE=demo-house.ap.json` dans `backend/.env`). Sans cette ligne, la Maison Orvène, fictive (ADR-0015).
5. Répétition : `cd e2e && WEB_URL=<adresse> npx playwright test` rejoue tout le parcours en 7 secondes. S'il passe, la démo passera.

## Le déroulé

| Temps | Écran | Ce qu'on fait | Ce qu'on dit |
|---|---|---|---|
| 0:00 | — | Montrer la pièce sur l'ordinateur, côté maison. | *Une maison vient de vendre cette montre. Aujourd'hui, le client repart avec la montre et une enveloppe de papiers. Voici ce qui change.* |
| 0:15 | **1. Invitation** | Saisir l'e-mail du client, « Inviter le client ». Le client scanne le QR. Il voit la montre, le nom et le rôle de la personne qui l'a préparée. Il choisit un mot de passe, puis « Créer mon compte ». | *Rien à saisir : ni numéro de série, ni clé. La maison l'attendait : un mot de passe, un bouton, et la pièce est déjà dans sa collection, marquée « Attendue ».* |
| 0:45 | **2. Remise** | « Remettre la pièce » ; le client scanne, puis « Accepter la pièce ». La carte se pose, un filet de métal la parcourt, « Passeport actif ». | *C'est le moment de la remise, pas une formalité. Le passeport devient actif devant lui, en une seconde. C'est le seul geste animé de l'application.* |
| 1:05 | **3. Collection** | « Voir ma collection ». | *La montre en grand, son nom, son statut en un mot.* |
| 1:15 | **4. Fiche de vie** | Ouvrir la pièce, faire défiler. | *Elle a une histoire : qui l'a émise, quand elle a été remise, l'histoire de la référence. La cryptographie existe, mais elle reste dans « Preuves », repliée.* |
| 1:35 | **5. Révision** | « Demander une révision ». Sur l'ordinateur, « Recevoir en atelier », puis « Rendre la pièce » avec une note. Recharger la fiche. | *On s'occupe de lui : chaque étape dit ce qui se passe et quand. Au retour, la révision entre dans l'histoire, signée par la maison.* |
| 2:00 | **6. Partage** | Choisir « 24 heures », laisser l'histoire masquée, « Créer le lien ». L'ouvrir sur l'autre téléphone. | *Rien n'est public sans lui. Il choisit la durée et ce qu'il montre ; ici, seulement « Passeport vérifié ». Il peut l'arrêter à tout moment.* |
| 2:20 | **7. Vérification et cession** | Le client : « Présenter pour vérification ». L'acheteur scanne et voit « Passeport vérifié, émis par la maison ». Le client : « Céder la pièce », saisit l'e-mail de l'acheteur. L'acheteur accepte, puis « Voir ma collection ». | *L'acheteur a une réponse claire en trois secondes. Attention : le passeport prouve l'enregistrement par la maison, pas l'objet qu'il tient ; il compare la référence. La cession est guidée, et la montre arrive dans sa collection, avec toute son histoire.* |
| 2:50 | — | Revenir à la fiche de l'acheteur. | *La maison est restée présente du premier jour à la revente. Et tout ce que vous avez vu se vérifie sans nous : un outil libre le refait avec la seule clé publique de la maison.* |

## Selon le public

- **Une maison** : insister sur les écrans 1, 2 et 5. Elle garde le lien avec le client après la vente, et la revente passe par elle.
- **Une fondation** : insister sur la phrase de l'écran 7, sur le volet « Preuves » et sur le vérificateur indépendant (`tools/verify`). C'est la rigueur d'architecte : chaque mot promet seulement ce que le système prouve.

## Si quelque chose casse

| Problème | Parade |
|---|---|
| Le téléphone n'atteint pas l'ordinateur | Ouvrir le lien affiché sous chaque QR, sur l'ordinateur, en fenêtre privée. |
| Un QR a expiré (5 minutes pour une cession) | « Générer un nouveau QR ». *Un QR ne sert qu'une fois : une capture d'écran ne vaut rien.* |
| L'animation ne se voit pas | Le téléphone demande moins d'animations : la carte apparaît immobile. C'est voulu (accessibilité). |
| L'API ne répond plus | Chaque écran le dit, avec quoi faire. Relancer `npm run dev`, puis rejouer depuis l'écran en cours. |
