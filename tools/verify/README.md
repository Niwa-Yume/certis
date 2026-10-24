# Vérificateur indépendant

Vérifie un passeport Certis et toute sa chaîne d'événements **sans faire confiance au serveur** : pas de compte, pas d'appel à l'API, pas de dépendance. Node 20 ou plus suffit.

```bash
curl -s https://<api>/.well-known/certis-keys > jwks.json
# preuve.json : bouton « Télécharger la preuve » du rapport, ou GET /assets/:id/history pour le propriétaire
node tools/verify/verify.mjs preuve.json jwks.json
```

Code de sortie 0 si tout concorde ; 1 et le premier maillon cassé sinon (par exemple `ALTÉRATION : événement seq 1 (TRANSFER) — le hash recalculé diffère du hash enregistré`).

## Ce qui est contrôlé

1. **Le passeport** : sa signature ES256, avec une clé publiée dans la JWKS, et qui appartient à l'émetteur nommé dans le passeport (ADR-0003, ADR-0004).
2. **Chaque événement** : numérotation continue, lien vers le hash précédent, hash recalculé sur le JSON canonique (RFC 8785), signature par une clé autorisée pour ce type (émetteur pour l'inscription et la révision, plateforme pour la cession, le vol et la restitution), et inscription liée à ce passeport précis (ADR-0006).

## Ce qui ne l'est pas

- **La JWKS elle-même.** Le vérificateur fait confiance aux clés qu'on lui donne. Pour la démo, Certis les publie ; en production, chaque maison publierait les siennes sur son propre domaine (ADR-0003).
- **Une chaîne entièrement réécrite et re-signée** par quelqu'un qui détient la clé plateforme et la clé de l'émetteur. Elle passerait. Ce qui la trahit : la **tête de chaîne** affichée à la fin, comparée à une copie gardée auparavant (par l'acheteur, la maison de ventes, ou un ancrage externe, ADR-0007, reporté).
- **Le numéro de série** : son empreinte exige le secret de l'émetteur (ADR-0005).
