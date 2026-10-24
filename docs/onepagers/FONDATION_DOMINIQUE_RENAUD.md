# Certis — une preuve de provenance ouverte, pour l'horlogerie indépendante

*Note d'une page à l'attention de la Fondation Dominique Renaud. Octobre 2026.*

**Pourquoi vous.** La Fondation se donne pour mission d'explorer « de nouvelles et futures représentations du temps » (traduction libre). Elle annonce une plateforme de science ouverte réunissant horlogers indépendants et ingénieurs ([site de la Fondation](https://www.fondationdominiquerenaud.org/en), consulté le 2026-10-24). La provenance d'une montre est une forme de temps : celle de l'objet qui passe de main en main. Certis propose de la rendre vérifiable par tous.

## Le problème
Sur le marché de l'occasion, la confiance repose sur des papiers qui se photocopient et sur la parole du vendeur. Les grandes maisons ont leurs propres dispositifs, fermés : programmes de revente certifiée, consortiums, prestataires. Les **indépendants** et les **pièces anciennes** n'ont rien d'équivalent ([vision marché](../market/MARKET_VISION.md), sections 3 et 7).

## Ce que Certis rend possible
- **La maison, ou l'expert qui a examiné la pièce, en signe le passeport** avec sa propre clé, publiée. Certis enregistre ; il n'atteste pas à la place de celui qui sait.
- **Chaque événement** (vente, révision, vol) est un maillon chaîné et signé. La base de données interdit de réécrire l'histoire.
- **N'importe qui vérifie** : l'acheteur sans compte, l'expert **sans Certis**, avec la clé publique et un [vérificateur libre d'une centaine de lignes](../../tools/verify).

## Ce qui relève de la science ouverte
| Principe | Dans Certis |
|---|---|
| Modèle de données ouvert | Passeport (JWS sur JSON canonique, RFC 8785) et chaîne d'événements décrits publiquement : [ADR-0004](../adr/0004-format-du-passeport.md), [ADR-0006](../adr/0006-journal-d-evenements-chaine.md) |
| Vérification indépendante | Une seconde implémentation, lisible d'un bout à l'autre, qui refait tout le calcul du serveur |
| Raisonnement public | Chaque décision et ses options écartées (ADR), chaque menace et ses limites ([modèle de menace](../security/THREAT_MODEL.md)) |
| Reproductibilité | Une commande lance tout ; les attaques sont rejouées en tests ; la démonstration se rejoue étape par étape |

## Ce qu'il manque, honnêtement
- **Une licence.** Le code est visible, mais sans licence il n'est pas réutilisable légalement. Pour un projet de science ouverte, c'est la première décision à prendre (Apache-2.0 est une option, pour sa concession de brevets).
- **Le lien physique.** Un QR prouve l'enregistrement, pas l'objet. La suite naturelle : une puce scellée par la maison. La faisabilité dans un boîtier métallique reste à établir.
- **La garde des clés.** Dans la démonstration, Certis garde les clés des émetteurs. En réel, chaque atelier garderait la sienne.

## Ce que je propose
1. **Éprouver le format avec deux ou trois horlogers indépendants** : leurs pièces, leurs clés, leurs contraintes.
2. **Ouvrir la discussion du format de passeport**, plutôt que de le figer seul.
3. **Une séance de l'Académie** sur la preuve numérique : ce qu'elle établit, et ce qu'elle n'établit pas.

Dépôt : [github.com/Niwa-Yume/certis](https://github.com/Niwa-Yume/certis) · Contact : *(à compléter)*
