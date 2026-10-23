# ADR-0008 — Hébergement : Render (API et web) + Neon (Postgres)

- Statut : proposé, à confirmer au premier déploiement
- Date : 2026-10-23
- Constats liés : AUDIT N10, N16
- Critères : coût minimal, production durable, performance suffisante, peu de maintenance

## Contexte

Certis doit rester en ligne pour être montré à des recruteurs et à la Fondation, sans budget. Le déploiement existant est sur Render (`render.yaml`). Faits vérifiés le 2026-10-23 :

- **Render, offre gratuite** ([docs](https://render.com/docs/free)) :
  - le service web s'endort après 15 min sans trafic et met environ 1 min à redémarrer ;
  - le disque est éphémère ;
  - **une base Postgres gratuite expire 30 jours après sa création**, puis est supprimée au bout de 14 jours de grâce ;
  - pas de *pre-deploy command* sur l'offre gratuite ([docs](https://render.com/docs/deploys)).
- **Neon, offre gratuite** ([docs](https://neon.com/docs/introduction/plans)) :
  - 100 CU-heures par projet et par mois, 1 Go de stockage par projet ;
  - mise en veille après 5 min d'inactivité, non désactivable ;
  - « None of these limits delete your data ».
  - **Incertitude** : la page ne dit pas explicitement si un projet gratuit inactif finit par être supprimé.

## Options

| Option | Coût | Durabilité | Maintenance |
|---|---|---|---|
| A. Tout sur Render, Postgres gratuit | 0 | **Base supprimée après 30 + 14 jours** | Recréer la base et la seeder chaque mois |
| B. Render (API + web) + Neon gratuit | 0 | Aucune expiration annoncée | Un compte de plus |
| C. Render + Postgres payant | Payant (tarif non vérifié ici) | Bonne | Faible |

## Choix

**Option B.** C'est la seule option gratuite qui ne détruit pas la base à date fixe. Le code ne dépend pas du fournisseur : `DATABASE_URL` est une chaîne Postgres standard, donc passer à C plus tard ne demande que de changer une variable.

## Conséquences

- La première requête après une période d'inactivité est lente : réveil de Render (environ 1 min), puis réveil de Neon. Avant une démo, il faut appeler `/` une ou deux minutes à l'avance (à reprendre dans `DEMO_SCRIPT.md`).
- Utiliser la chaîne de connexion **directe** (non poolée) de Neon. Elle sert aussi à `prisma migrate deploy`, et à ce volume de trafic un pooler n'apporte rien.
- Les migrations s'exécutent au démarrage de l'API (`startCommand`), faute de *pre-deploy* sur l'offre gratuite. Elles sont idempotentes.
- Les images envoyées par les utilisateurs ne peuvent pas vivre sur le disque Render. Toute fonctionnalité d'upload exigera un stockage objet (backlog P4-05).
