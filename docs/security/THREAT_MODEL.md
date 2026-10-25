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

## Risques résiduels assumés

1. **Clonage physique.** Un QR prouve qu'un compte contrôle l'enregistrement, pas que l'objet présenté est cette montre. Une copie de la montre avec le QR authentique passe. La réponse réaliste est une puce NFC à message dynamique authentifié, intégrée par la maison (backlog, section 0) : hors périmètre, documentée seulement.
2. **Garde des clés par Certis.** Pour la démo, Certis génère et conserve les clés des émetteurs, chiffrées par la clé maîtresse. Qui détient la base *et* la clé maîtresse peut signer au nom de n'importe quelle maison. La séparation entre maison et plateforme est donc logique, pas réelle. Cible : la clé de la maison dans son HSM, sa JWKS sur son propre domaine (ADR-0003).
3. **Réécriture complète de la chaîne.** Un superutilisateur qui désactive le trigger, réécrit une chaîne et la re-signe avec les deux clés la fait passer, seule, toutes les vérifications. Depuis l'ancrage (S-04, ADR-0007), une **preuve antérieure** gardée par l'acheteur ou la maison de ventes la trahit, et les maillons réécrits ne sont attestés qu'à la date de la réécriture. Sans preuve antérieure gardée par personne, la réécriture passe.
4. **`TRUST_PROXY_HOPS` sur Render.** La valeur 1 est une hypothèse : Render ne documente pas son nombre de proxies. Trop bas, le rate limit devient global (un attaquant bloque les connexions de tout le monde). Trop haut, l'IP est usurpable. **À vérifier au premier déploiement.**
5. **JWT en `localStorage` (web).** Une faille XSS permettrait de le voler. Il expire au bout d'une heure, sans révocation. Une CSP sur le front statique reste à poser.
6. **Nonce dans l'URL du front.** Le QR encode `/verify?id=…&nonce=…`. L'URL peut finir dans l'historique du navigateur ou dans des logs CDN. Le nonce est à usage unique et expire en 60 s (vérification) ou 5 min (transfert).
7. **Table `AuthNonce` sans purge.** Les nonces expirés s'accumulent. Le rate limit borne le rythme, mais une tâche de purge reste à prévoir.
8. **QR de vérification après une vente.** Un QR `VERIFY` émis par l'ancien propriétaire reste valide au plus 60 s après le transfert. Ce qu'il atteste (la signature) reste vrai ; le risque est jugé mineur.
9. **Rotation de la clé maîtresse.** Elle chiffre les clés des émetteurs et dérive les secrets HMAC (pseudonymes, numéros de série). La changer exige de rechiffrer les clés et de recalculer ces empreintes : non outillé.
10. **Contrôle du numéro de série en ligne.** Il exige le secret de l'émetteur, donc le serveur : il n'est pas vérifiable hors ligne. C'est le prix de la résistance à la force brute (ADR-0005).
11. **Vérification d'une pièce volée.** Elle reste possible et affiche l'alerte. Un voleur qui a aussi le compte du propriétaire peut déclarer la pièce retrouvée : la restitution n'exige pas de preuve. C'est une limite de la démo ; en réel, la restitution passerait par l'émetteur ou une autorité.
12. **Notes de révision en texte libre.** Elles sont signées et ineffaçables. Un émetteur qui y écrirait une donnée personnelle (un nom de client) la graverait dans la chaîne. Règle à donner aux émetteurs : décrire l'intervention, jamais la personne.
13. **Effacement conditionné.** Un propriétaire qui détient encore des pièces doit les céder avant de supprimer son compte. Le cas d'un propriétaire qui ne peut plus céder (décès, perte d'accès) n'est pas traité : il relèverait d'une procédure manuelle, à définir.
14. **Antidatage hors du registre.** Fermé par l'ancrage (S-04, ADR-0007) : hors ligne, une signature d'une clé révoquée n'est acceptée que si un ancrage la prouve antérieure à la révocation. Reste la fenêtre non ancrée (10 minutes en marche normale) : ce qui y a été signé avant la révocation est refusé hors ligne et doit être réémis (S-07).
15. **Réémission non outillée.** Une révocation antidatée rend « non confirmées » les pièces légitimes inscrites ou révisées pendant la fenêtre de compromission. C'est voulu, mais la maison doit pouvoir les réémettre avec sa nouvelle clé : non implémenté (S-07). `npm run issuer:revoke` en donne le nombre.
16. **Clé de la plateforme.** Elle signe cessions, vols et restitutions, et vit dans une variable d'environnement. Elle n'a ni révocation ni rotation : la changer la retirerait de la JWKS et invaliderait tous ses maillons.
17. **Confiance dans l'autorité d'horodatage.** FreeTSA est tenue par une seule personne, sans engagement de disponibilité. Une autorité qui antidaterait ruinerait l'ancrage ; une autorité injoignable retarde seulement l'ancrage suivant. Cible : une autorité qualifiée eIDAS, ou deux autorités indépendantes (ADR-0007).
18. **Coût d'une inscription.** Chaque compte créé reçoit une pièce d'essai signée : une signature et un maillon. Seule la limite générale (100 requêtes par minute et par IP) le borne. Une limite propre à l'inscription reste à poser (ADR-0012).
