# Glossaire

Un mot, un sens, partout : dans l'interface, le code et la base. Quand l'interface et le code divergent pour une raison historique, la colonne « Code et base » le dit. Le texte anglais de l'app suit la colonne « Anglais ».

| Terme | Anglais | Code et base | Sens |
|---|---|---|---|
| Maison | House | `Issuer` | L'entreprise horlogère qui inscrit ses pièces et signe leur passeport. La seule à pouvoir inscrire une pièce (ADR-0003). |
| Émetteur | Issuer | `Issuer`, rôle `ISSUER` | Une maison, vue comme signataire. À l'écran, on écrit « la maison » ; « émetteur » ne sert que dans les écrans métier. |
| Pièce | Piece, watch | `Asset` | Une montre précise, inscrite au registre. Jamais « actif » à l'écran. |
| Référence | Reference | `Asset.reference` | Le modèle tel que la maison le catalogue (une référence, plusieurs pièces). |
| Numéro de série | Serial number | `serialHash` | Le numéro gravé de la pièce. Jamais stocké en clair, seulement son empreinte (ADR-0005). Jamais demandé au client. |
| Passeport | Passport | `Asset.passport` | L'attestation signée par la maison : la pièce, sa référence, l'empreinte du numéro de série. Une JWS (ADR-0004). |
| Passeport vérifié | Verified passport | `GET /assets/:id/verify`, `/authenticate` | La signature de la maison et la chaîne concordent. Prouve l'enregistrement, pas l'objet physique : on n'écrit jamais « montre authentique ». |
| Propriétaire | Owner | `Asset.ownerId`, rôle `OWNER` | Le compte qui détient la pièce. |
| Collection | Collection | `GET /assets` | Les pièces d'un propriétaire. Pour une maison : son stock. |
| Fiche de vie | Life record | `GET /assets/:id` | Le récit d'une pièce : remise, révisions, cessions. Les preuves sont dans un volet dépliable. |
| Maillon | Link | `Event` | Une entrée de la chaîne d'une pièce, signée, qui pointe vers la précédente (ADR-0006). |
| Inscription | Registration | `MINT` | Le premier maillon : la maison inscrit la pièce. |
| Remise | Handover | (lot 4) | Le moment où la maison remet la pièce à son premier propriétaire et où le passeport devient actif. |
| Cession | Change of ownership | `TRANSFER`, `/transfer-offers`, `/claim` | Le passage d'un propriétaire à un autre. Jamais « transfert d'actif » à l'écran. |
| Révision | Service | `SERVICE` | Un entretien enregistré par la maison. |
| Déclaration de vol | Theft report | `STOLEN_REPORTED` | Le propriétaire déclare la pièce volée. À l'écran : « Déclarée volée le [date] par son propriétaire », un fait daté. La pièce ne peut plus être cédée. |
| Retrouvée | Recovered | `RECOVERED` | Le propriétaire lève sa déclaration de vol. |
| QR de vérification | Verification QR | `NoncePurpose.VERIFY` | Un code à durée limitée que le propriétaire présente pour qu'un tiers vérifie le passeport. |
| QR de cession | Transfer QR | `NoncePurpose.TRANSFER` | Un code à usage unique, lié à la pièce, qui permet à l'acheteur de recevoir la pièce. |
| Révocation | Revocation | `IssuerKey.revokedAt` | Une clé de maison déclarée compromise à une date : ce qu'elle a signé depuis n'est plus valable (ADR-0011). |
| Ancrage | Anchoring | `Anchor` | L'horodatage des têtes de chaîne par une autorité tierce (ADR-0007). |
| Pièce d'essai | Trial piece | `Issuer.trial` | Une pièce fictive donnée à chaque nouveau compte (ADR-0012). |
| Preuves | Proofs | `GET /assets/:id/history` | Le volet technique : signature, chaîne, ancrages. Jamais en premier. |
