# ADR-0014 — Une identité par tokens : maison ou neutre, de jour ou de nuit

- Statut : accepté
- Date : 2026-11-25
- Lot 1 de l'expérience client

## Contexte

La démo s'adresse à deux publics : une petite maison horlogère, qui doit voir l'app à ses couleurs, et une fondation, qui doit voir une version neutre. Le brief demande aussi :
- un thème sombre avec la même hiérarchie ;
- deux familles de polices et quatre tailles par écran ;
- un seul accent métal ;
- des transitions de 200 à 400 ms, rien en boucle.

La direction « Registre » (ADR-0009) avait trois familles et demie de polices (Unbounded, Instrument Serif, Geist, Geist Mono) et deux accents (bleu sceau et or). Ses couleurs étaient des constantes importées par douze feuilles de style statiques.

## Décision

- **Des rôles, pas des teintes.** `theme/tokens.ts` nomme ce que fait une couleur : `paper` (fond), `card`, `ink` (texte), `slate` (texte secondaire), `deep` (vitrine sombre, bouton principal), `onDeep`, `mist`, `metal` (l'accent), `verified`, `refused`, `onSignal`. Le bleu sceau disparaît. Les mots mis en valeur prennent l'italique du serif, pas une couleur.
- **Deux jeux, choisis au build.** `EXPO_PUBLIC_THEME=neutral` donne la version Certis, sinon on a la version de la maison fictive. La maison ne change que la vitrine (`deep`) et le métal. Les composants ne savent pas quel jeu est actif.
- **Le thème sombre passe par des variables CSS.** Sur le web, `color.ink` vaut `var(--ink)`, et `prefers-color-scheme` change les valeurs. Le système bascule sans re-rendu, et les douze feuilles de style restent statiques. L'impression repasse en clair. Exception : le QR garde l'encre claire sur fond clair, de nuit aussi, parce que tous les lecteurs ne lisent pas un QR inversé.
- **Contraste vérifié.** Chaque couple texte/fond des quatre palettes passe 4,5:1. Le métal ne s'écrit que sur `deep`, jamais sur le fond clair (2,4:1).
- **Deux familles de polices.** Instrument Serif pour les titres, Geist pour l'interface. Geist Mono, de la même famille, ne sert qu'aux identifiants du volet Preuves. Unbounded est retirée du projet. Quatre tailles : 48 et 32 pour les titres, 16 pour le texte, 13 pour les légendes.
- **Grille de 8 px.** Marges de 24 px sur mobile, 40 sur tablette, 64 sur ordinateur.
- **Mouvement.** Toute entrée dure au plus 400 ms, en ease-out, et le rebond du sceau disparaît. L'indicateur d'attente ne tourne plus : le texte de l'écran dit ce qui se passe. Sous `prefers-reduced-motion`, les animations JS sont déjà coupées et les transitions CSS le sont aussi.
- **Six états communs.** Le composant `State` couvre chargement, vide, hors ligne, erreur, introuvable et révoqué : un titre qui dit ce qui se passe, puis quoi faire, puis un bouton-verbe facultatif. `stateOf()` déduit l'état d'un échec réseau.
- **Deux langues, sans bibliothèque.** `lib/i18n.ts` contient un objet par langue, et le type oblige l'anglais à avoir chaque clé du français. La langue vient de `?lang=` puis du système. Les dates suivent la langue.

## Conséquences

- Changer de maison, c'est changer deux valeurs par thème, sans toucher aux composants.
- Sur une app native, le thème reste clair. Il faudra brancher `useColorScheme` le jour où une app native sera publiée ; ce n'est pas le cas aujourd'hui.
- Les messages de refus de l'API (ADR-0013) restent en français. La version anglaise de la démo les affichera en français jusqu'à ce que l'API lise `Accept-Language`. C'est à faire dans le lot 2, avant la cession guidée.
- Les écrans existants reçoivent les nouveaux rôles par renommage mécanique. Leur mise en page et leur texte sont repris écran par écran dans les lots 2 à 5.

## Options écartées

- **Un fournisseur de thème React et des styles recalculés par rendu** : il faudrait réécrire les douze feuilles de style, pour le même résultat sur le web.
- **Une bibliothèque d'internationalisation** : c'est une dépendance pour une trentaine de clés.
- **Garder le bleu sceau comme second accent** : le brief n'en autorise qu'un, et le bleu disait « Certis » là où la maison doit parler.
