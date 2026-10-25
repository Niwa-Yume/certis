-- Phase 7 (ADR-0012) : émetteur des pièces d'essai.
ALTER TABLE "Issuer" ADD COLUMN "trial" BOOLEAN NOT NULL DEFAULT false;
