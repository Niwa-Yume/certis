# Modèle de menace (STRIDE allégé)

Version : 2026-10-23, fin de Phase 2 (branche `phase-2/transfer-security`). Périmètre : API NestJS, base PostgreSQL, app Expo (mobile et web). Les tests cités se trouvent dans `backend/test/transfer-attacks.e2e-spec.ts` (lettres A à N) et `backend/test/security-critical.e2e-spec.ts`.

## Ce qu'on protège

| Bien | Pourquoi c'est critique |
|---|---|
| Le lien montre → propriétaire | Le voler, c'est voler la montre « sur le papier » |
| La signature d'un passeport | Elle porte l'affirmation « cet enregistrement n'a pas été modifié » |
| Les nonces (QR) | Ce sont des capacités au porteur : vérifier, ou accepter un transfert |
| Les comptes, les e-mails, l'historique des propriétaires | Données personnelles et provenance |

## Acteurs

- Acheteur ou maison de ventes **sans compte**.
- Utilisateur inscrit, potentiellement **malveillant** : n'importe qui peut créer un compte.
- **Propriétaire** légitime.
- **Opérateur** Certis ou **administrateur** de la base.

## Menaces et contrôles

| STRIDE | Menace | Contrôle | Preuve |
|---|---|---|---|
| **S**poofing | JWT forgé avec un secret connu | Plus aucun fallback ; secret de 32 caractères minimum, sinon l'API refuse de démarrer | `src/config/env.spec.ts` |
| S | Force brute sur le login | 10 tentatives par minute et par IP | Test L |
| **T**ampering | Signature transplantée d'une montre identique | Payload v1 avec `assetId`, JCS (RFC 8785) | Test E, `canonical-json.spec.ts` |
| T | Le client fixe `id` ou `status` | Liste blanche des champs, 400 sur un champ inconnu | Test I |
| T | Modification directe d'une ligne en base | Détectée : la signature ne vérifie plus | Test E (même mécanisme) |
| **R**epudiation | « Je n'ai jamais cédé cette montre » | Ligne `Transfer` (émetteur de l'offre, destinataire, date), écrite dans la même transaction que le changement de propriétaire | Test « transfers a watch… » |
| **I**nformation disclosure | Lire la montre ou l'historique d'autrui (IDOR) | 404 si l'appelant n'est pas propriétaire | Test F (×3) |
| I | Nonce dans les logs d'accès de l'API | Nonce dans le corps des `POST`, plus jamais en query string | Test K |
| **D**enial of service | Spam de nonces ou de vérifications | 30 par minute et par IP (100 par minute en général) | Configuration (`@Throttle`) |
| **E**levation of privilege | Émettre un QR pour la montre d'autrui | Émission réservée au propriétaire | Test A |
| E | Nonce d'une autre montre utilisé pour réclamer | Nonce lié à l'actif | Test B |
| E | QR de vérification rejoué comme transfert | Nonce lié à une finalité (`VERIFY` ≠ `TRANSFER`) | Test C |
| E | Double claim concurrent | `UPDATE` conditionnel, `count === 1` (ADR-0002) | Test D |
| E | Propriété poussée sans consentement | Transfert direct supprimé : offre puis acceptation uniquement | Test H |
| E | Offre ciblée réclamée par un tiers | `recipientId` vérifié avant consommation | Test « reserves an offer… » |

## Risques résiduels assumés

1. **Clonage physique.** Un QR prouve qu'un compte contrôle l'enregistrement, pas que l'objet présenté est cette montre. Une copie de la montre avec le QR authentique passe. La réponse réaliste est une puce NFC à message dynamique authentifié, intégrée par la maison (backlog, section 0) : hors périmètre, documentée seulement.
2. **Compromission de la clé de signature.** Il n'y a aujourd'hui qu'une seule clé de plateforme, stockée en variable d'environnement. Avec elle, on peut re-signer n'importe quel enregistrement. Atténuations prévues en Phase 3 : une clé par émetteur avec `kid` et rotation, et la clé publique exposée pour une vérification indépendante.
3. **Administrateur de la base.** Celui qui a la base *et* la clé peut tout réécrire puis tout re-signer, et rien ne le détecte aujourd'hui. Prévu en Phase 3 : journal chaîné, vérificateur indépendant et ancrage externe. Cela détecte l'altération après coup, sans l'empêcher.
4. **`TRUST_PROXY_HOPS` sur Render.** La valeur 1 est une hypothèse : Render ne documente pas son nombre de proxies. Trop bas, le rate limit devient global (un attaquant bloque les connexions de tout le monde). Trop haut, l'IP est usurpable. **À vérifier au premier déploiement.**
5. **JWT en `localStorage` (web).** Une faille XSS permettrait de le voler. Il expire au bout d'une heure, sans révocation. Une CSP sur le front statique reste à poser.
6. **Nonce dans l'URL du front.** Le QR encode `/verify?id=…&nonce=…`. L'URL peut finir dans l'historique du navigateur ou dans des logs CDN. Le nonce est à usage unique et expire en 60 s (vérification) ou 5 min (transfert).
7. **Table `AuthNonce` sans purge.** Les nonces expirés s'accumulent. Le rate limit borne le rythme, mais une tâche de purge reste à prévoir.
8. **QR de vérification après une vente.** Un QR `VERIFY` émis par l'ancien propriétaire reste valide au plus 60 s après le transfert. Ce qu'il atteste (la signature) reste vrai ; le risque est jugé mineur.
