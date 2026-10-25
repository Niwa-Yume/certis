-- S-02 (ADR-0011) : révocation datée d'une clé d'émetteur compromise, distincte du retrait.
-- Retirée : remplacée, ce qu'elle a signé reste valide. Révoquée : ce qu'elle a signé depuis la date est refusé.
ALTER TABLE "IssuerKey" ADD COLUMN "revokedAt" TIMESTAMP(3);
