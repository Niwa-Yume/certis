# ADR-0001 — Clé exposée dans l'historique : pas de réécriture

- Statut : accepté
- Date : 2026-10-23
- Constats liés : AUDIT S1, N0

## Contexte

Le commit `9de1082` a versionné `backend/.env`, qui contient une clé privée ECDSA. Ce commit est public dans deux dépôts : `Niwa-Yume/certis` et `Niwa-Yume/boilerplate-nest-react-reactBitsPro`. Le fichier ne contenait que des valeurs de **développement**, jamais utilisées en production (confirmé par le propriétaire du projet le 2026-10-23).

## Options

1. **Réécrire l'historique** (`git filter-repo`) dans les deux dépôts, puis faire un `push --force`. Cela casse les clones et les liens existants, y compris l'état que le jury a vu. Et cela n'efface pas les copies déjà faites (forks, caches) : une clé publiée doit de toute façon être considérée comme compromise.
2. **Rotation seule** : sortir le fichier du suivi, ne plus jamais réutiliser cette clé, et empêcher la récidive.

## Choix

**Option 2.** La réécriture coûte cher et ne protège rien de plus : la seule protection réelle contre une clé fuitée, c'est de ne plus s'y fier. Ici, la clé ne protégeait que des données de dev.

## Conséquences

- `backend/.env` n'est plus suivi, et `.gitignore` ignore de nouveau `.env` et `.env.*` (sauf `.env.example`).
- Chaque environnement génère ses propres secrets (`npm run dev` en local, `scripts/generate-secrets.mjs` pour la production). L'API refuse de démarrer sans eux (`readEnv`).
- L'ancienne clé reste lisible dans l'historique. Elle ne doit être utilisée nulle part : rien ne la référence plus.
