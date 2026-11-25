# Lot 6 : mesures de qualité et test de bout en bout

Mesures prises le 2026-11-25 sur le build de production (`expo export`), servi compressé en gzip comme sur Render, avec l'API locale.

## Test de bout en bout : 20 sur 20

`e2e/demo.spec.ts` joue la démo entière dans Chrome, avec trois sessions (la maison, son client, l'acheteur) :
1. invitation et compte en un geste ;
2. remise et activation en moins de 3 s ;
3. collection ;
4. fiche de vie ;
5. révision demandée, reçue, rendue ;
6. partage ouvert par un tiers ;
7. vérification par l'acheteur, puis cession guidée jusqu'à sa collection.

Chaque passage crée ses propres comptes.

| Passages | Mobile (360 px) | Ordinateur (1440 px) | Durée |
|---|---|---|---|
| `--repeat-each=10` | 10/10 | 10/10 | 138 s, environ 6,3 s par passage ([`e2e-10x.json`](e2e-10x.json)) |

À relancer : `cd e2e && npm ci && WEB_URL=http://localhost:8091 npm run test:10`, avec `npm run dev` lancé à la racine.

## Accessibilité (WCAG 2.2 AA, axe)

Les vérificateurs des lots 2 à 5 ont été relancés après les changements de ce lot. Ils couvrent les écrans 1 à 7 et la carte, les deux côtés (maison et client), en FR et en EN, en 360 et 1440 px, en clair et en sombre. Les captures sont gardées hors dépôt, parce qu'elles montrent les visuels de la maison locale.

| Lot | Captures | Violations axe | Défilement horizontal |
|---|---|---|---|
| 2 (écran 7) | 48 | 0 | aucun |
| 3 (écrans 3 et 4) | 32 | 0 | aucun |
| 4 (écrans 1 et 2, carte) | 40 | 0 | aucun |
| 5 (écrans 5 et 6) | 48 | 0 | aucun |

Accessibilité Lighthouse : 100 sur les cinq écrans publics mesurés.

## Performance (Lighthouse, mobile)

Lighthouse simule par défaut un « Slow 4G » (1,6 Mbit/s, 150 ms de latence) et un processeur ralenti 4 fois. Le brief dit « 4G ». Les deux profils sont donc mesurés ; le second est une 4G ordinaire (9 Mbit/s, 85 ms), avec le même processeur ralenti.

| Écran public | LCP, 4G | LCP, Slow 4G | CLS | TBT | Photo du premier écran |
|---|---|---|---|---|---|
| Accueil | 1,1 s | 3,7 s | 0,01 | 30 ms | 143 Ko |
| Invitation (écran 1) | 1,2 s | 3,8 s | 0,01 | 30 ms | 88 Ko |
| Vérification (écran 7) | 1,2 s | 6,2 s | 0,015 | 30 ms | 356 Ko (*) |
| Partage (écran 6) | 2,0 s | 6,2 s | 0,015 | 50 ms | 356 Ko (*) |
| Carte publique | 2,1 s | 6,1 s | 0,017 | 20 ms | 356 Ko (*) |

(*) Photo de la maison locale, chargée depuis un site tiers : seule image au-dessus de 300 Ko. Les visuels du dépôt font moins de 150 Ko. Les mesures supposent une pièce dont la photo est dans le dépôt ou convertie en WebP.

Le TBT (Total Blocking Time) sert ici d'estimation de l'INP : Lighthouse en navigation ne mesure pas d'interaction.

**Ce qui a été gagné.**
- Les polices sont réduites à l'alphabet latin, en WOFF2, et préchargées : 520 Ko de TTF chargés après le JS deviennent 102 Ko chargés en même temps que lui.
- La photo de l'accueil n'a plus de fondu d'entrée.
- Accueil : LCP de 5,1 s à 3,7 s en Slow 4G, et 1,1 s en 4G.

**Seuils atteints**
- En 4G : LCP sous 2,5 s, CLS sous 0,1, TBT sous 200 ms, sur les cinq écrans.

**Seuils non atteints**
- En Slow 4G, le LCP reste entre 3,7 et 6,2 s.
- Le reste du délai vient du framework : react-native-web, react-dom et expo-router pèsent 357 Ko compressés et s'exécutent avant tout affichage.
- La voie suivante est le pré-rendu statique d'Expo Router (`web.output: "static"`). Il change le routage sur Render, donc il est à décider avant d'être fait. Et il ne sert que les écrans sans données ; les écrans qui lisent l'API attendront toujours le JS.

Les rapports Lighthouse complets (HTML) sont gardés hors dépôt avec les captures.
