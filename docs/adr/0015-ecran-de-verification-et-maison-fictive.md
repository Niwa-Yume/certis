# ADR-0015 — Écran de vérification : une réponse d'abord, une maison fictive, des refus en anglais

- Statut : accepté
- Date : 2026-11-25
- Lot 2 de l'expérience client (écran 7)

## Contexte

L'écran de vérification annonçait « Cette pièce est AUTHENTIQUE ». Or le QR prouve l'enregistrement de la pièce par la maison, pas l'objet que l'acheteur tient en main. L'écran enchaînait ensuite une chorégraphie de plusieurs secondes, l'« anatomie d'un certificat », puis le cœur cryptographique : un novice devait lire longtemps avant de savoir quoi faire.

La démo montrait aussi des montres de marques réelles (photos, catalogue de 18 références, dont 9 Royal Oak). Enfin, la version anglaise affichait les refus de l'API en français.

## Décision

- **La réponse en une ligne, sous la photo.** Elle dit « Passeport vérifié », puis « Émis par [maison] », puis la date et l'heure de la vérification. La photo occupe 55 % de la hauteur sur mobile et la moitié gauche sur ordinateur. Viennent ensuite la référence et ce que prouve le passeport, en une phrase qui ne promet pas l'objet physique.
- **Pièce volée : l'alerte d'abord.** Le titre devient « Pièce déclarée volée », en rouge. Le fait suit, daté : « Déclarée volée le [date] par son propriétaire ». Le passeport en règle n'est mentionné qu'ensuite. Une coche verte en tête d'une pièce volée se lirait « tout va bien ».
- **L'histoire, puis la cession guidée.** Les maillons sont nommés comme un client les dit (« Révision par la maison », « Cession à un nouveau propriétaire »). La cession guidée tient en trois étapes. L'écran d'acceptation renvoie à la collection de l'acheteur.
- **Les preuves dans un volet fermé.** Il contient le n° d'inscription, la signature, la clé de la maison, le dernier maillon, le fichier de preuve et la comparaison du numéro gravé. La comparaison reste un outil de l'acheteur, jamais une saisie demandée au propriétaire. L'ancien rapport (`Report.tsx`, 553 lignes) est supprimé.
- **Rien n'est animé sur cet écran.** Le seul geste animé de l'app sera l'activation, à la remise (lot 4).
- **Maison Orvène, fictive.** Elle a trois références (Méridienne ardoise, Méridienne vert forêt, Équinoxe phase de lune), des calibres fictifs, et des visuels générés sans logo ni texte. Une recherche web, le 2026-11-25, n'a trouvé aucune marque horlogère de ce nom. Les liens du catalogue pointent sur `orvene.example`, un domaine réservé (RFC 2606). Le seed, le script de démo et les exemples du formulaire n'utilisent plus que cette maison.
- **Une démo aux couleurs d'une maison réelle, en local seulement.** `DEMO_HOUSE_FILE` (dans `backend/.env`) désigne un fichier `*.local.json` qui remplace la maison, son catalogue et les pièces du seed. Git l'ignore : les visuels et le nom d'une marque réelle restent hors du dépôt public, qui garde la maison fictive par défaut. C'est aussi la voie pour la version « aux couleurs d'une maison » du brief.
- **Les refus en anglais, sur demande.** L'app envoie `Accept-Language`, et un filtre d'exceptions remplace le message français par sa traduction, mot pour mot. La forme ne change pas : ce qui s'est passé, puis comment corriger. Sans en-tête anglais, rien ne change. Ce cas est couvert par un test.

## Conséquences

- Le texte reste côté serveur (ADR-0013), et chaque langue a sa table.
- Un nouveau refus sans traduction s'affiche en français dans la version anglaise : la table est à compléter en même temps que le message.
- Les erreurs de validation, champ par champ, restent en français. Le parcours de la démo n'en produit pas.
- Une base de production déjà seedée garde le nom de son ancienne maison : le seed ne réécrit rien sur une base existante. Il faut la renommer à la main, ou repartir d'une base vide.

## Options écartées

- **Garder « Authentique » et nuancer en petit** : c'est la promesse que Certis ne peut pas tenir.
- **Traduire les refus côté app, par code** : déjà écarté par l'ADR-0013.
- **Un QR unique pour vérifier et céder** : il faudrait changer la sémantique des nonces, qui fait partie du socle de confiance.
