# Lot 1 : tokens, thèmes et composants de base

Décision : [ADR-0014](../../adr/0014-tokens-maison-et-theme-sombre.md). Vocabulaire : [glossaire](../../glossaire.md).

## Vérification (2026-11-25)

- **Captures** : 8 vues × 360 et 1440 px × clair et sombre, soit 32 captures dans ce dossier. Elles couvrent l'accueil, la connexion, la collection (pleine, vide, hors ligne), la fiche, la vérification, et la vérification avec `?lang=en`.
- **Débordement horizontal** : aucun, sur les 32.
- **axe (WCAG 2.0, 2.1 et 2.2 AA)** : 0 violation sur les 32 ([`axe.json`](axe.json)).
- **Contraste** : tous les couples texte/fond des quatre palettes passent 4,5:1. Le plus faible, le texte secondaire sur une carte de nuit, est à 6,5:1.
- **Lighthouse, mobile, accueil, build de production** ([rapport](lighthouse-accueil.html)) :
  - accessibilité 100, bonnes pratiques 96, performance 64 ;
  - CLS 0, TBT 40 ms ;
  - **LCP 10,5 s : hors seuil (2,5 s).**

## Ce qui reste hors seuil, et où c'est traité

- **LCP.**
  - L'app attend ses polices avant d'afficher quoi que ce soit : 516 Ko de TTF.
  - Le bundle JS fait 1,26 Mo (360 Ko compressé). Le serveur de mesure local ne compresse pas ; Render, si.
  - Retirer Unbounded a déjà allégé les polices. Le reste, c'est-à-dire afficher avant les polices, découper le bundle et passer les photos en AVIF, est au lot 6, où les seuils sont des critères de fin.
- **Texte et marques réelles.**
  - Les écrans gardent leur texte et leurs données actuels (« AUTHENTIQUE », montres de marques réelles).
  - Ils sont repris dans les lots 2 à 5 : ce lot ne change que l'identité et les composants communs.
  - En anglais, seuls les composants communs et les dates sont traduits pour l'instant.
