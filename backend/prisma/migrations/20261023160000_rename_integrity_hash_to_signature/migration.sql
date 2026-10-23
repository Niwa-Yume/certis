-- Écrite à la main : `prisma migrate dev` génère DROP + ADD COLUMN, ce qui perdrait les données.
-- La colonne contient une signature ECDSA, pas un hash (AUDIT S6).
-- Les signatures existantes portent sur l'ancien payload et ne vérifient plus :
-- en dev, `npm run db:reset` ; il n'existe pas encore de base de production à re-signer.
ALTER TABLE "Asset" RENAME COLUMN "integrityHash" TO "signature";
