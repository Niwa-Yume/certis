# ADR-0012 — Essayer Certis : pièce d'essai, maison de démonstration, catalogue

- Statut : accepté
- Date : 2026-10-25
- Phase 7 ; complète l'ADR-0003 (émetteur) et l'ADR-0006 (effacement, révision S-01)
- Commits : `ded93d3` (tests rouges), `be03fbc` (API), `dcff509` (seed), `2027d19` (app)

## Contexte

Un compte neuf arrivait sur « Votre collection est vide » et ne pouvait rien essayer : seule une maison inscrit une pièce, et aucune n'avait de raison de le faire. Côté maison, le compte de démonstration n'avait pas de stock, et chaque inscription se tapait champ par champ.

## Décision

**Une pièce d'essai pour chaque nouveau compte.** Elle est inscrite à l'inscription du compte, par les vrais services : passeport signé, chaîne, empreinte du numéro de série. On peut donc tout essayer avec elle, comme avec une vraie pièce : vérification publique, cession, vol puis restitution.

- **Une montre qui n'existe pas, d'une marque qui n'existe pas** : « Certis · Pièce d'essai », référence `ESSAI-01`, numéro gravé `ESSAI-0001`, le même pour toutes. Une vraie référence (une Royal Oak, par exemple) aurait fait de chaque inscription un certificat « authentique » à montrer à un acheteur crédule.
- **Un émetteur dédié**, « Certis · pièces d'essai » (`Issuer.trial`), avec sa propre clé. L'API signale la pièce (`trial`) dans la collection et dans la vérification publique. Le rapport de l'acheteur s'ouvre sur un avertissement et affiche « Cette pièce est FICTIVE », jamais « AUTHENTIQUE ».
- **L'effacement (S-01) n'est pas bloqué** par la pièce d'essai. Un compte qui ne détient que des pièces d'essai les rend à un compte système (`essai@certis`), par une cession inscrite dans leur chaîne. Personne ne peut se connecter à ce compte : son mot de passe est aléatoire et inconnu, et son adresse, sans domaine de premier niveau, est refusée à l'inscription.
- **Si la pièce d'essai ne peut pas être créée**, le compte l'est quand même : elle n'est qu'une aide.

**Une maison de démonstration avec un stock.** L'« Atelier de démonstration » reste fictif : une instance publique ne doit pas montrer de certificat au nom d'une vraie maison (choix du propriétaire, 2026-10-25). Son stock compte une pièce par référence du catalogue, prête à être cédée à un client par un QR réservé.

- **En production**, le seed sans `--reset` ne crée que cette maison, avec `DEMO_ISSUER_PASSWORD`, obligatoire puisque le mot de passe par défaut est public. Il n'efface jamais rien, et les comptes de propriétaires de démonstration restent réservés au développement.

**Un catalogue de références réelles** (`GET /catalog`, public). Il compte 18 références, dont 9 Royal Oak (variantes de cadran, Jumbo, chronographe, 34 mm), Rolex, Patek Philippe, Vacheron Constantin, Omega et TAG Heuer. Elles ont été relevées le 2026-10-25 sur le site de chaque marque, et la source de chacune est gardée. Dans le formulaire d'inscription, la recherche remplit la fiche ; l'émetteur vérifie les champs et saisit le numéro de série.

## Ce que cela ne garantit pas

- **Le catalogue n'est pas exhaustif.** Il compte 18 références, pas « tous les modèles ». Il se tient à jour à la main, et une référence retirée par une marque reste vraie pour les pièces déjà vendues.
- **Les photos.** Seules trois références du catalogue ont une photo vérifiée ; les autres affichent « Sans photographie ».
- **La pièce d'essai se vérifie publiquement.** Le risque qu'on la présente comme une vraie montre est faible, puisque la marque est fictive et que le rapport le dit d'abord. Il ne disparaît pas pour autant.
- **Chaque inscription de compte coûte une inscription de pièce** : signature et maillon. Seule la limite générale (100 requêtes par minute et par IP) borne ce coût. Une limite propre à l'inscription reste à poser, réglée pour que les tests, qui créent des dizaines de comptes par minute, puissent la contourner.

## Options écartées

- **Un bouton « Recevoir une pièce d'essai »** : une étape de plus avant de voir quoi que ce soit, alors que la pièce est demandée « par défaut ».
- **Des comptes au nom de vraies maisons** : plus parlant en démo, mais une instance publique afficherait des certificats d'Audemars Piguet ou de Rolex qui n'en sont pas.
- **Effacer la pièce d'essai avec le compte** : le registre ne supprime rien (ADR-0006) ; la rendre par une cession garde la chaîne intacte.
