# ADR-0009 — Direction visuelle : « Registre », version 6

- Statut : accepté (choix du propriétaire du projet, 2026-10-24)
- Constats liés : critique du jury J2 (« interface desktop très basique, visuels en dessous des standards du luxe »), AUDIT F1, N2
- Maquettes : canevas privé « Certis — directions visuelles », rangée « V6 »

## Contexte

Le jury a jugé l'interface desktop basique et les visuels en dessous des standards du luxe. Le design final revient au propriétaire du projet (règle de travail n° 9). Il a fallu six itérations :

| Version | Ce qui a été proposé | Retour |
|---|---|---|
| A, B, C | Atelier (classique), Registre (institution suisse), Nocturne (évolution sombre) | B retenu, mais « trop générique, pas au niveau du luxe » |
| B2 | Bleu sceau, guilloché, Bodoni | « Pas mal, mais tu peux mieux faire » |
| B3 | Codes « Awwwards » : titre géant, grain, bandeau défilant | « Pense à l'accessibilité et à la lisibilité » |
| B3 épuré | Un seul ornement, plus de décor | « Plat et sans vie » |
| B4 | Montre dessinée, chorégraphie d'ouverture | « Nul, montre générée, générique » |
| **V6** | **Fondée sur de vrais sites primés étudiés dans le navigateur, avec les vraies photos du projet** | **Retenue** |

Références étudiées le 2026-10-24 :
- [The Watch, 60fps](https://www.awwwards.com/sites/the-watch) (Site of the Day, 2026-08-17) ;
- [Cartier Watches & Wonders 2026](https://www.awwwards.com/sites/cartier-watches-wonders-2026) (Site of the Day, 2026-05-25) ;
- [Chanel J12](https://www.awwwards.com/sites/the-j12-watch) (Honorable Mention, 2026-03-24) ;
- [Amsterdam Vintage Watches](https://www.awwwards.com/sites/amsterdam-vintage-watches) (Honorable Mention, 2021-12-27).

## Décision

- **Palette.** Papier `#F4F1EA`, encre `#14161C`, bleu sceau `#14275C`, nuit `#0B1430` (section Preuve), or `#C9A66B`, brume `#AEB8D6`, ardoise `#5B5E66`, vert `#17603F`, rouge `#A3172A`. Tous les textes respectent le contraste WCAG AA. L'or n'est jamais utilisé comme texte sur le papier (2,0:1).
- **Typographie.** Unbounded, une grotesque large, pour les références, les grands mots et le logotype. Instrument Serif, en italique, pour les accents éditoriaux. Geist pour le texte, Geist Mono pour les identifiants techniques. Toutes sont libres (Google Fonts) et chargées via `@expo-google-fonts`.
- **La pièce d'abord.** La photographie réelle de la montre est le héros. On peut l'inspecter avec une loupe (survol sur desktop, appui maintenu sur mobile, bouton « Inspecter le cadran » au clavier).
- **Signature de Certis : l'anatomie du certificat.** Quatre couches (la pièce, le propriétaire, l'historique, la signature) sont éclatées en vue isométrique. Elles expliquent ce qui est vérifié.
- **Mouvement porteur de sens et limité :**
  - les entrées en scène (lettres qui se resserrent, montre qui monte) et le sceau qui se pose ;
  - le balayage de vérification ;
  - la provenance qui s'allume au défilement ;
  - aucune boucle, sauf l'indicateur de chargement ; rien si l'utilisateur a demandé à réduire les animations.
- **Un seul ornement**, le sceau. Le reste, c'est la photographie, la typographie et l'espace.
- **Lisibilité.**
  - Tailles : texte 16 px, secondaire 13 px minimum, interligne 1,5.
  - Langage : clair d'abord, détails techniques sur demande.
  - Résultats : trois états distincts (authentique, non confirmé, impossible), plus le chargement. Chaque résultat dit quoi faire ensuite.

## Options écartées

- **A, Atelier.** Ce sont les codes d'une maison, alors que Certis est un tiers de confiance. Le jury reprochait déjà la confusion entre le projet et une maison.
- **C, Nocturne.** Le sombre intégral imprime mal, et le rapport de vérification doit pouvoir être imprimé.
- **Les itérations intermédiaires (B2 à B4).** Soit du décor sans fonction, soit l'excès inverse (trop plat), soit une montre dessinée qui faisait faux.

## Conséquences

- **Front.**
  - De nouveaux tokens et des primitives d'interface partagées.
  - Des points de rupture (compact < 600 px, moyen < 1024 px, large au-delà) et un conteneur limité à 1 240 px.
  - Le rapport de vérification passe en deux colonnes sur desktop.
- **API.** La vérification publique doit renvoyer les données publiques de la pièce et une provenance horodatée sans identité. Sans cela, l'acheteur ne peut pas comparer le certificat à la pièce qu'il a sous les yeux.
- **Données.**
  - La fiche prévoit des champs (mouvement, boîtier, cadran, bracelet, papiers) qui n'existent pas encore dans le modèle : ils arrivent en Phase 3 et ne s'affichent que s'ils sont renseignés.
  - La photo de la Carrera était associée à une mauvaise référence. Corrigé en CV7A12.BA0795, d'après [WatchBase](https://watchbase.com/tag-heuer/carrera/cv7a12-ba0795).
  - En production, les photographies doivent venir de l'émetteur (Phase 3).
- **Compatibilité.**
  - Les effets liés au défilement n'existent que sur web.
  - Sur mobile natif, la loupe fonctionne à l'appui maintenu.
