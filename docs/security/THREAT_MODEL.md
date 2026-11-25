# Modèle de menace (STRIDE allégé)

Version : 2026-10-25, après la Phase 7 (base : fin de Phase 3, branche `phase-3/domain-registry`). Périmètre : API NestJS, base PostgreSQL, app Expo (mobile et web), vérificateur `tools/verify`. Les tests cités se trouvent dans `backend/test/transfer-attacks.e2e-spec.ts` (lettres A à N), `backend/test/security-critical.e2e-spec.ts` et `backend/test/registry.e2e-spec.ts` (identifiants P3-xx, N3, N4, S9, S10).

## Ce qu'on protège

| Bien | Pourquoi c'est critique |
|---|---|
| Le lien montre → propriétaire | Le voler, c'est voler la montre « sur le papier » |
| Le passeport signé par l'émetteur | Il porte l'affirmation « cette maison atteste cette pièce » (ADR-0004) |
| La chaîne d'événements | Provenance, révisions, vol : ce qui fait la valeur d'occasion (ADR-0006) |
| Les clés des émetteurs et la clé maîtresse | Avec elles, on signe au nom d'une maison (ADR-0003) |
| Le numéro de série | Les faussaires reproduisent des numéros réels (ADR-0005) |
| Les nonces (QR) | Ce sont des capacités au porteur : vérifier, ou accepter un transfert |
| Les comptes, les e-mails, l'historique des propriétaires | Données personnelles et provenance |

## Acteurs

- Acheteur ou maison de ventes **sans compte**.
- Utilisateur inscrit, potentiellement **malveillant** : n'importe qui peut créer un compte.
- **Propriétaire** légitime.
- **Émetteur** (la maison, ou l'expert qui a examiné la pièce), seul habilité à inscrire.
- **Opérateur** Certis ou **administrateur** de la base.

## Menaces et contrôles

| STRIDE | Menace | Contrôle | Preuve |
|---|---|---|---|
| **S**poofing | JWT forgé avec un secret connu | Plus aucun fallback ; secret de 32 caractères minimum, sinon l'API refuse de démarrer | `src/config/env.spec.ts` |
| S | Force brute sur le login | 10 tentatives par minute et par IP | Test L |
| **T**ampering | Signature transplantée d'une montre identique | Payload v1 avec `assetId`, JCS (RFC 8785) | Test E, `canonical-json.spec.ts` |
| T | Le client fixe `id` ou `status` | Liste blanche des champs, 400 sur un champ inconnu | Test I |
| S | Un compte quelconque inscrit une « Nautilus » et obtient « authentique » | Inscription réservée aux émetteurs, contrôlée avant la validation du corps (ADR-0003) | N3 |
| S | Clé d'émetteur volée : faux passeport ou fausse révision au nom de la maison | Révocation datée, publiée dans la JWKS : ce qui est signé à partir de cette date est refusé, par le serveur comme par `tools/verify`, et la maison reçoit une nouvelle clé (ADR-0011) | S-02 (×4, `revocation.e2e-spec.ts`) |
| T | Passeport transplanté d'une montre identique | Le passeport porte l'identifiant de la pièce, et l'inscription l'empreinte du passeport | Test E, « passport does not match » |
| T | `UPDATE` ou `DELETE` direct sur un événement | Refusé par un trigger de la base | S9 « refuses to rewrite » |
| T | Propriétaire ou statut modifié en base | La vérification les recalcule depuis la chaîne : « registre incohérent » | P3-07 « disagrees with its chain » |
| T | Chaîne réécrite en contournant le trigger | Le premier maillon cassé est signalé, par le serveur comme par `tools/verify` | P3-08 |
| T | Chaîne réécrite **et re-signée** par qui détient toutes les clés | Têtes de chaîne horodatées par une autorité tierce (RFC 3161, ADR-0007) ; une preuve antérieure donnée au vérificateur trahit la réécriture | S-04 (`anchoring.e2e-spec.ts`) |
| S | Preuve antidatée, fabriquée avec une clé volée | Hors ligne, une clé révoquée ne vaut que pour ce qu'un ancrage prouve antérieur à sa révocation | S-04 |
| T | Deux écritures concurrentes forment une fourche | `UNIQUE (assetId, seq)` : une seule passe, l'autre reçoit 409 | S9 « never fork » |
| **R**epudiation | « Je n'ai jamais cédé cette montre » | Maillon `TRANSFER` signé par la plateforme, écrit dans la même transaction que le changement de propriétaire | S9 « every change of hands » |
| R | « Ce n'est pas nous qui avons inscrit cette pièce » | L'inscription est signée par la clé de l'émetteur, publiée avec son identifiant | N4 « passport verifies » |
| **I**nformation disclosure | Lire la montre ou l'historique d'autrui (IDOR) | 404 si l'appelant n'est pas propriétaire | Test F (×3) |
| I | Nonce dans les logs d'accès de l'API | Nonce dans le corps des `POST`, plus jamais en query string | Test K |
| I | Identité des propriétaires dans la provenance publique | Pseudonyme par pièce (HMAC), aucun identifiant ni e-mail dans les réponses | P3-07 |
| I | Identité réelle gravée dans le journal immuable | Aucune : le journal ne porte que des pseudonymes. Le compte s'efface (mot de passe exigé) et rend ses pseudonymes non rattachables. | S-01 (×4, `privacy.e2e-spec.ts`) |
| I | Numéro de série lisible ou devinable | Empreinte HMAC à secret d'émetteur ; contrôle limité à 5 essais en 10 min après une vérification | S10 (×2) |
| I | Clés privées des émetteurs dans une sauvegarde | Chiffrées (AES-256-GCM) par une clé maîtresse hors de la base | `crypto.service.ts` |
| **D**enial of service | Spam de nonces ou de vérifications | 30 par minute et par IP (100 par minute en général) | Configuration (`@Throttle`) |
| **E**levation of privilege | Émettre un QR pour la montre d'autrui | Émission réservée au propriétaire | Test A |
| E | Nonce d'une autre montre utilisé pour réclamer | Nonce lié à l'actif | Test B |
| E | QR de vérification rejoué comme transfert | Nonce lié à une finalité (`VERIFY` ≠ `TRANSFER`) | Test C |
| E | Double claim concurrent | `UPDATE` conditionnel, `count === 1` (ADR-0002) | Test D |
| E | Propriété poussée sans consentement | Transfert direct supprimé : offre puis acceptation uniquement | Test H |
| E | Offre ciblée réclamée par un tiers | `recipientId` vérifié avant consommation | Test « reserves an offer… » |
| E | Céder une montre déclarée volée | Offres et acceptations refusées (423) jusqu'à la restitution | P3-06 |
| E | Déclarer volée la montre d'autrui | Réservé au propriétaire en titre (404 sinon) | P3-06 « owner of record » |
| E | Un émetteur enregistre une révision sur la pièce d'un autre | Refusé (403) | « service on its own pieces » |
| S | Pièce d'essai présentée à un acheteur comme une vraie montre | Marque et référence fictives ; l'API la signale (`trial`), et le rapport dit « Pièce d'essai » puis « FICTIVE », jamais « AUTHENTIQUE » (ADR-0012) | P7 (`try-certis.e2e-spec.ts`) |
| E | Se connecter au compte système qui reprend les pièces d'essai | Adresse sans domaine de premier niveau, refusée à l'inscription ; mot de passe aléatoire, connu de personne | Conception (ADR-0012) |
| E | Seed lancé contre la production : comptes à mots de passe publics, base vidée | Toute base distante compte comme la production : maison de démonstration seule, `DEMO_ISSUER_PASSWORD` exigé, aucun effacement sans `--reset` | `cb4a805`, vérifié sur la base de test |
| S | Un tiers ouvre l'invitation d'un client et crée le compte à sa place | Jeton de 256 bits montré en boutique, seule son empreinte est gardée, 7 jours, 10 essais par minute ; le compte prend l'e-mail invité, jamais un e-mail saisi ; la pièce reste à la maison jusqu'à la remise, réservée à ce compte (ADR-0017) | H1, H2, H5 (`handover.e2e-spec.ts`) |
| I | L'invitation révèle l'e-mail du client | E-mail masqué à l'affichage (« c•••@domaine ») ; invitation supprimée à la remise et à l'effacement du compte | H1, H3 |
| E | Inviter un client pour la pièce d'autrui, ou une pièce déjà remise | Réservé à la maison qui détient la pièce dans son stock (404 sinon) | H4 |
| I | La carte publique trahit le propriétaire ou l'histoire | Elle ne dit que l'état (attendue, vérifié, non confirmé, déclarée volée) ; identifiant de 128 bits, 30 requêtes par minute | H7 |
| I | Un lien de partage expose la pièce au-delà de ce que voulait le propriétaire | Créé par lui seul ; 1 h, 24 h ou 7 jours ; sans histoire par défaut ; arrêtable ; caduc si la pièce change de mains ; jamais l'e-mail ni l'identifiant du propriétaire (ADR-0018) | P1 à P3 (`service-share.e2e-spec.ts`) |
| I | L'e-mail du propriétaire fuit vers une autre maison | Seule la maison qui a émis la pièce voit la demande de révision | S2 |
| T | Une révision inscrite sans que la pièce soit passée à l'atelier | Retour refusé tant que la pièce n'est pas reçue ; une seule demande ouverte ; jamais pour une pièce volée | S1, S3, S4 |
