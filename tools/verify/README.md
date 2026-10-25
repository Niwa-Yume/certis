# Vérificateur indépendant

Vérifie un passeport Certis et toute sa chaîne d'événements **sans faire confiance au serveur** : pas de compte, pas d'appel à l'API, pas de dépendance. Node 20 ou plus suffit.

```bash
curl -s https://<api>/.well-known/certis-keys > jwks.json
# preuve.json : bouton « Télécharger la preuve » du rapport, ou GET /assets/:id/history pour le propriétaire
node tools/verify/verify.mjs preuve.json jwks.json
# avec une preuve gardée auparavant : ses ancrages doivent se retrouver dans la chaîne actuelle
node tools/verify/verify.mjs preuve.json jwks.json ancienne-preuve.json
```

Code de sortie 0 si tout concorde ; 1 et le premier maillon cassé sinon (par exemple `ALTÉRATION : événement seq 1 (TRANSFER) — le hash recalculé diffère du hash enregistré`, ou `CLÉ RÉVOQUÉE : …` quand la chaîne est intacte mais signée par une clé compromise).

## Ce qui est contrôlé

1. **Le passeport** : sa signature ES256, avec une clé publiée dans la JWKS, et qui appartient à l'émetteur nommé dans le passeport (ADR-0003, ADR-0004).
2. **Chaque événement** : numérotation continue, lien vers le hash précédent, hash recalculé sur le JSON canonique (RFC 8785), signature par une clé autorisée pour ce type (émetteur pour l'inscription et la révision, plateforme pour la cession, le vol et la restitution), et inscription liée à ce passeport précis (ADR-0006).
3. **Les ancrages** (ADR-0007) : pour chacun, le jeton d'horodatage RFC 3161 (signature CMS, certificats jusqu'à une racine de confiance, empreinte signée), le chemin d'audit jusqu'à la racine horodatée, et la présence de la tête ancrée dans la chaîne. Les ancrages des preuves antérieures passent les mêmes contrôles : une chaîne réécrite depuis ne les contient plus.
4. **La révocation** : si la JWKS donne une date `revokedAt` à une clé, tout ce qu'elle a signé à partir de cette date est refusé, passeport (`validFrom`) comme événement (`at`). Ce qu'elle a signé avant n'est accepté que si un ancrage le prouve antérieur à la révocation (ADR-0011, ADR-0007).

## L'autorité d'horodatage

La racine de confiance livrée est celle de FreeTSA, dans [`tsa-ca.pem`](tsa-ca.pem), téléchargée de `https://freetsa.org/files/cacert.pem` le 2026-10-25. Empreinte SHA-256 : `A6:37:9E:7C:EC:C0:5F:AA:3C:BF:07:60:13:D7:45:E3:27:BB:BA:A3:8C:0B:9A:F2:24:69:D4:70:1D:18:AA:BC`. Pour une autre autorité : `CERTIS_TSA_CA=racines.pem node tools/verify/verify.mjs …`.

Le jeton se vérifie aussi sans cet outil :

```bash
node -e 'const a=require("./preuve.json").anchors[0]; require("fs").writeFileSync("jeton.der", Buffer.from(a.token, "base64")); console.log(Buffer.from(a.root, "base64url").toString("hex"))' > racine.hex
openssl ts -verify -token_in -in jeton.der -digest "$(cat racine.hex)" -CAfile tools/verify/tsa-ca.pem
```

`openssl` ne contrôle que le jeton : le lien entre la racine et la chaîne, c'est le chemin d'audit, que `verify.mjs` recalcule.

## Ce qui ne l'est pas

- **La JWKS elle-même.** Le vérificateur fait confiance aux clés qu'on lui donne. Pour la démo, Certis les publie ; en production, chaque maison publierait les siennes sur son propre domaine (ADR-0003).
- **Une chaîne entièrement réécrite et re-signée**, vérifiée seule, par quelqu'un qui détient la clé plateforme et la clé de l'émetteur. Elle passerait, mais ses maillons ne seraient ancrés qu'à la date de la réécriture. Ce qui la trahit : une **preuve antérieure** donnée en troisième argument.
- **Le numéro de série** : son empreinte exige le secret de l'émetteur (ADR-0005).
- **L'autorité d'horodatage elle-même** : le vérificateur fait confiance aux racines qu'on lui donne, comme pour la JWKS.
