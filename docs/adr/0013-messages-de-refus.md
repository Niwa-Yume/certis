# ADR-0013 — Messages de refus : ce qui s'est passé, puis comment corriger

- Statut : accepté
- Date : 2026-10-25
- Phase 7
- Commits : `ded93d3` (tests rouges), `be03fbc` (API), `2027d19` (app)

## Contexte

Les refus de l'API mélangeaient trois registres :
- de l'anglais de framework : les erreurs de validation arrivaient en liste (« email must be an email ») ;
- du jargon interne : « Nonce expiré », « Asset … introuvable » ;
- des constats sans suite : « QR invalide pour cette montre ».

Chaque écran de l'app traduisait les codes HTTP à sa façon, et certains se rabattaient sur « impossible pour le moment ».

## Décision

**Un seul message par refus, en français, en deux temps** : ce qui s'est passé, puis comment corriger. Les deux parties sont séparées par « : ». Par exemple : « Ce QR a expiré : il ne vaut que quelques minutes. Demandez-en un nouveau au propriétaire. »

- **Validation** : une fabrique d'erreurs remplace la liste anglaise de `class-validator`. Elle nomme le champ tel que l'utilisateur le voit, et la règle à respecter (« Mot de passe : 8 caractères au moins »). Un champ inconnu est nommé : « Champ inconnu « role » : retirez-le de la requête. »
- **Débit et session** : la limite de débit et la session expirée ont aussi leur message (« Session absente ou expirée (elle dure une heure) : reconnectez-vous. »).
- **Pas d'indice sur autrui** : une pièce introuvable et la pièce d'autrui gardent la même réponse (AUDIT S8). Le message couvre les deux cas.
- **Côté app, un composant `Notice`** pour tout retour d'action. Il découpe le message en titre (ce qui s'est passé) et en détail (comment corriger), et prend l'un de trois tons : refus, succès, information. Un refus est annoncé aux lecteurs d'écran (`role="alert"`).
- **Une seule source pour le texte** : `explain()` reprend le message de l'API, et chaque écran ne garde qu'un repli pour les pannes réseau.
- **Vérifié par un test** : chaque refus testé est une chaîne en français, sans terme anglais ni interne, et en au moins deux propositions.

## Conséquences

- Le texte vit côté serveur : le changer ne demande pas de republier l'app.
- La vérification publique garde ses propres états, plein écran (« Vérification IMPOSSIBLE », « NON CONFIRMÉE ») : ils disent déjà quoi faire, et un acheteur sans compte ne doit pas lire un message destiné au propriétaire.

## Options écartées

- **Codes d'erreur traduits par l'app** : deux endroits à tenir à jour, et les clients tiers (vérificateur, négociants, S-05) n'en profiteraient pas.
- **Toasts éphémères** : un message qui disparaît avant d'être lu ne dit pas comment corriger ; le `Notice` reste à côté de l'action jusqu'à la suivante.
