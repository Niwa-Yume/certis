# Démonstration Certis — 10 minutes

Une seule pièce, de l'atelier au vol. Les étapes qui **changent l'état** passent par le script (`npm run demo -- next`), qui ne rate pas. L'interface montre les **moments que l'on doit voir** : la fiche du propriétaire, la vérification sur le téléphone de l'acheteur, l'alerte de vol.

Chaque étape a une durée cible et un repli. Si tout tombe, `npm run demo` raconte l'histoire entière dans le terminal en une minute.

## Avant la démo

**J-7**
- Vérifier qu'Expo Go accepte encore le SDK 54 (risque R1). Ce n'est pas bloquant : le téléphone de l'acheteur utilise son navigateur.

**J-1**
- Une répétition complète, chronométrée (journal en bas de page), en partant d'un ordinateur où rien ne tourne.

**H-30**
1. `npm run dev`, et noter l'adresse affichée : « Sur un téléphone du même réseau : http://192.168.x.x:8090 ».
2. `npm --prefix backend run db:reset` : base de démo propre.
3. `npm run demo -- 2` : la pièce est inscrite, vendue à la collection A. **Noter le numéro de série gravé** affiché à la fin.
4. Fenêtre 1 (projetée), sur l'adresse du réseau local : connexion `collection-a@certis.demo`, ouvrir la pièce.
5. Fenêtre 2 (navigation privée) : connexion `collection-b@certis.demo`. Elle servira à l'étape 5.
6. Terminal à la racine du dépôt, police agrandie, la sortie du point 3 visible.
7. Téléphone sur le même Wi-Fi : scanner une fois un QR de vérification pour s'assurer que l'appareil photo ouvre bien la page, puis le laisser expirer.

**H-2**
- Instance déployée seulement : `curl https://<api>/` pour réveiller Render (environ 1 min de démarrage à froid, risque R2). Sinon, rester en local.

Mot de passe des comptes de démo : `Demo2026!piece`. Émetteur : `atelier@certis.demo` (mot de passe dans `backend/prisma/seed.ts`).

## Déroulé

| Début | Durée | Étape | À l'écran | À dire | Repli |
|---|---|---|---|---|---|
| 0:00 | 1:00 | **Le problème** | Accueil de Certis | « Acheter une montre d'occasion, c'est croire des papiers qui se photocopient et un vendeur qu'on ne connaît pas. » | — |
| 1:00 | 0:45 | **Ce que Certis est, et n'est pas** | Accueil, section « Vous achetez une montre ? » | « La maison atteste la pièce, Certis enregistre chaque changement de mains, n'importe qui vérifie. Certis n'examine pas la montre : il ne remplace pas un expert. » | — |
| 1:45 | 1:15 | **1–2. Émission et vente** | Terminal (sortie de la préparation), puis fenêtre 1 : héros, Fiche (« Émise par »), Provenance (« Reçue par vous ») | « L'atelier a signé le passeport avec sa propre clé. Le revendeur a réservé l'offre à la collection A : un tiers qui tente de l'accepter est refusé. » | `npm run demo -- 2` (20 s), puis recharger la fenêtre 1 sur la nouvelle pièce |
| 3:00 | 1:45 | **3. Vérification en maison de ventes** | Fenêtre 1 : « Présenter pour vérification ». Le téléphone scanne : balayage, sceau, AUTHENTIQUE. Saisir le numéro de série : « Correspond au passeport » | « Pas de compte, pas d'application. Le QR ne sert qu'une fois et expire en 60 secondes : une capture d'écran ne sert à rien. Le numéro de série n'est stocké nulle part : on compare son empreinte. » | `npm run demo -- next` affiche le résultat et un lien « Rapport à ouvrir » sur l'ordinateur |
| 4:45 | 0:45 | **4. Révision** | Terminal : `npm run demo -- next 4`. Fenêtre 1 : recharger, onglet Provenance | « La révision s'inscrit dans la chaîne, signée par l'atelier, liée au maillon précédent. » | La sortie du terminal suffit |
| 5:30 | 0:45 | **5. Revente** | `npm run demo -- next`. Fenêtre 1 : recharger, la pièce a disparu. Fenêtre 2 : elle est là, « Reçue par vous » | « Le passeport n'a pas changé : c'est la cession qui est un nouveau maillon, signé par Certis. » | Sortie du terminal |
| 6:15 | 1:15 | **6. Vol** | `npm run demo -- next`. Fenêtre 2 : bandeau « Déclarée volée ». Téléphone : scanner le QR de la fenêtre 2 : DÉCLARÉE VOLÉE | « Le certificat reste authentique, et c'est précisément pour ça que l'alerte compte : l'acheteur sait quelle pièce ne pas acheter. » | Lien « Alerte à ouvrir » imprimé par le terminal |
| 7:30 | 0:45 | **7. Fraude** | `npm run demo -- next` : trois refus | « QR photographié avant le vol : refusé. QR fabriqué par le tiers : refusé. Lever l'alerte lui-même : refusé. Chaque refus dit pourquoi. » | — |
| 8:15 | 0:45 | **8. Preuve indépendante** | `npm run demo -- next` : sortie de `tools/verify` | « Un expert refait tout sans Certis, avec la clé publique et un outil libre. Si un administrateur réécrit une ligne, l'outil nomme le maillon cassé : c'est testé. Et l'histoire est horodatée par un tiers : même avec toutes les clés, on ne peut pas la réécrire à une date passée. » | — |
| 9:00 | 1:00 | **Limites et suite** | `docs/security/THREAT_MODEL.md`, risques résiduels | « Pour la démo, Certis garde les clés des maisons ; en vrai, elles resteraient chez elles. Un QR prouve l'enregistrement, pas l'objet : la suite, c'est une puce scellée par la maison. Et l'ancrage chez un tiers horodateur. » | — |

**Total : 10:00.** Si l'on prend du retard, on coupe d'abord l'étape 4 (la révision se voit dans la provenance de l'étape 8), puis la fenêtre 2 de l'étape 5.

## Replis généraux

| Problème | Repli |
|---|---|
| Wi-Fi absent ou isolé (réseau d'école) | Partage de connexion du téléphone. Brancher l'ordinateur dessus, relancer `npm run dev` (l'adresse change, 40 s), rouvrir les fenêtres. Sinon, vérifications sur l'ordinateur avec les liens imprimés par le terminal. |
| Le téléphone n'ouvre pas le QR | Ouvrir le lien imprimé par `npm run demo -- next` dans la fenêtre 1 : c'est le même rapport, en version desktop. |
| Expo Go indisponible | Sans effet : l'acheteur passe par le navigateur du téléphone. |
| Interface ou projecteur en panne | `npm run demo` : les huit étapes dans le terminal, à commenter. |
| Trop de connexions (limite de 10 par minute) | Se connecter avant la démo. Le script garde ses jetons une heure. |
| Instance déployée endormie | Rester en local : c'est la démo de référence. |

## Facultatif : l'app native sur Expo Go

Le web suffit à la démo. Pour montrer l'app native :
1. Créer `mobile/.env` avec `EXPO_PUBLIC_API_URL=http://<adresse du réseau local>:3001`.
2. Relancer `npm run dev`, puis scanner le QR d'Expo avec l'app Expo Go (SDK 54), sur le même Wi-Fi.
3. En cas d'échec du réseau local : `cd mobile && npx expo start --tunnel`.

Sur un réseau d'école qui isole les appareils, rester sur le partage de connexion du téléphone.

## Journal des répétitions (P5-03)

Critère : écart de ±1 min au plus à la troisième répétition. Chronométrer chaque segment et noter ce qui a coûté du temps.

| # | Date | Durée totale | Écart | Segment le plus long (prévu / réel) | Incident | Ajustement |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
