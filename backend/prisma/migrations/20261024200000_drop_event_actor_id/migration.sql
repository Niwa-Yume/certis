-- S-01 (lignes directrices 02/2025 de l'EDPB) : la table append-only ne doit contenir aucune identité
-- réelle, car le trigger la rend ineffaçable. Les maillons ne portent que des pseudonymes par pièce,
-- qui deviennent non rattachables quand le compte est supprimé.
-- La colonne n'était lue nulle part ; ALTER TABLE ne déclenche pas le trigger de ligne.
ALTER TABLE "Event" DROP COLUMN "actorId";
