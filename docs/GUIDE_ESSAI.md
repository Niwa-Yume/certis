# Essayer Certis

Ce que l'on peut faire avec l'app, pas à pas : côté propriétaire, avec la pièce d'essai, puis côté maison, avec le stock de démonstration. Chaque refus dit ce qui s'est passé et comment corriger (ADR-0013) : les essais « qui échouent » font partie du parcours.

## Démarrer

- **En local** : `npm run dev`, puis http://localhost:8090. Depuis un téléphone du même réseau, utilisez l'adresse que la commande affiche.
- **En ligne** : l'adresse de `certis-web` sur Render, une fois déployé (README, Déploiement).

Comptes de démonstration (locaux seulement ; mots de passe dans [`backend/prisma/seed.ts`](../backend/prisma/seed.ts)) :

| Compte | Ce qu'il a |
|---|---|
| `atelier@certis.demo` | La maison de démonstration (fictive), avec 18 pièces en stock, une par référence du catalogue |
| `certis@pro.com` | Une collection de 2 pièces, avec provenance et révision |
| `julien.castro@certis.local` | Une pièce reçue par cession |

Vous pouvez aussi créer votre propre compte : il reçoit aussitôt sa pièce d'essai.

## 1. Avec la pièce d'essai (n'importe quel compte)

La pièce d'essai est une montre fictive, « Certis · Pièce d'essai », sans valeur. Elle passe par les mêmes contrôles qu'une vraie.

1. **Créer un compte.** La pièce apparaît dans « Vos pièces », marquée « Pièce d'essai ».
2. **La vérifier comme un acheteur.** Sur la pièce, choisissez « Présenter pour vérification », puis scannez le QR avec un téléphone, sans compte. Le rapport s'ouvre sur l'avertissement « Pièce d'essai » et affiche « Cette pièce est FICTIVE ».
3. **Comparer le numéro de série.** Dans le rapport, saisissez `ESSAI-0001` : il correspond. Essayez un autre numéro pour voir le refus.
4. **La céder.** Créez un second compte (une fenêtre privée suffit). Depuis le premier, choisissez « Céder la pièce » et saisissez l'e-mail du second. Scannez ensuite le QR en étant connecté avec le second compte. La pièce change de collection, et sa provenance l'enregistre.
5. **La déclarer volée, puis retrouvée.** Une fois déclarée volée, essayez de la céder : la cession est refusée, avec la raison. Une vérification affiche l'alerte à l'acheteur.
6. **Vérifier sans Certis.** Dans le rapport, téléchargez la preuve, puis lancez `node tools/verify/verify.mjs preuve.json http://localhost:3001/.well-known/certis-keys`.
7. **Supprimer le compte.** Un compte qui ne détient que sa pièce d'essai peut être supprimé : elle revient à Certis.

## 2. Côté maison

1. **Se connecter** avec `atelier@certis.demo`. Le stock compte 18 pièces : des variantes de Royal Oak, Rolex, Patek Philippe, Vacheron Constantin, Omega et TAG Heuer.
2. **Inscrire une pièce.** Choisissez « Inscrire une pièce », puis cherchez dans le catalogue (« Royal Oak noir », « 126610LN », « Nautilus »). La fiche se remplit : vérifiez-la, puis saisissez un numéro de série. Avec l'e-mail d'un client, la pièce est inscrite directement à son nom ; sans e-mail, elle reste en stock.
3. **Remettre une pièce du stock à un client.** Ouvrez la pièce, choisissez « Céder la pièce », saisissez l'e-mail du client, puis montrez-lui le QR. Il l'accepte depuis son compte.

## 3. Les refus à essayer

| Essai | Ce que l'app répond |
|---|---|
| S'inscrire avec un mot de passe de 5 caractères | Le champ et la règle à respecter |
| S'inscrire avec un e-mail déjà pris | Se connecter, ou prendre une autre adresse |
| Accepter un QR de cession réservé à quelqu'un d'autre | Se connecter avec l'e-mail indiqué par le vendeur, ou demander un nouveau QR |
| Réutiliser un QR, ou attendre qu'il expire | Demander un nouveau QR au propriétaire |
| Céder une pièce déclarée volée | La cession est bloquée jusqu'à ce que le propriétaire lève l'alerte |
| Inscrire une pièce pour un e-mail sans compte | Vérifier l'e-mail, ou laisser la pièce en stock |
| Supprimer un compte qui détient une vraie pièce | La céder d'abord |

## En ligne

Une instance déployée démarre vide. Pour y avoir la maison de démonstration et son stock, lancez le seed une fois avec les variables de production, plus `DEMO_ISSUER_PASSWORD`, un mot de passe à vous (README, Déploiement). Sur une base distante, il ne crée que la maison, n'efface rien, et refuse de tourner sans ce mot de passe. Chaque compte créé en ligne reçoit sa pièce d'essai.
