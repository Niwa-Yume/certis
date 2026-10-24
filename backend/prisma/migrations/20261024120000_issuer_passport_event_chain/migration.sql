-- Phase 3 : émetteurs et clés (ADR-0003), passeport (ADR-0004), empreinte du numéro de série
-- (ADR-0005), journal chaîné append-only (ADR-0006). Écrite à la main.
--
-- Les pièces v1 n'ont été attestées par aucun émetteur : elles ne peuvent pas recevoir de passeport.
-- Elles sont supprimées, avec leurs nonces et transferts ; en dev, `npm run db:reset` les recrée.
-- Il n'existe pas encore de base de production.
DELETE FROM "AuthNonce";
DELETE FROM "Transfer";
DELETE FROM "Asset";
DROP TABLE "Transfer";

CREATE TYPE "Role" AS ENUM ('OWNER', 'ISSUER');
CREATE TYPE "EventType" AS ENUM ('MINT', 'TRANSFER', 'SERVICE', 'STOLEN_REPORTED', 'RECOVERED');
ALTER TYPE "AssetStatus" ADD VALUE 'STOLEN';

CREATE TABLE "Issuer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IssuerKey" (
    "kid" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "publicJwk" JSONB NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    CONSTRAINT "IssuerKey_pkey" PRIMARY KEY ("kid"),
    CONSTRAINT "IssuerKey_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "User"
    ADD COLUMN "role" "Role" NOT NULL DEFAULT 'OWNER',
    ADD COLUMN "issuerId" TEXT,
    ADD CONSTRAINT "User_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Asset"
    DROP COLUMN "signature",
    ADD COLUMN "caliber" TEXT,
    ADD COLUMN "caseDescription" TEXT,
    ADD COLUMN "dial" TEXT,
    ADD COLUMN "bracelet" TEXT,
    ADD COLUMN "issuerId" TEXT NOT NULL,
    ADD COLUMN "passport" TEXT NOT NULL,
    ADD COLUMN "serialHash" TEXT NOT NULL,
    ADD COLUMN "imageCutout" BOOLEAN NOT NULL DEFAULT false,
    ADD CONSTRAINT "Asset_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuthNonce" ADD COLUMN "serialChecks" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" "EventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "kid" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "actorId" TEXT,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Event_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Deux écritures concurrentes ne peuvent pas créer deux suites au même maillon.
CREATE UNIQUE INDEX "Event_assetId_seq_key" ON "Event"("assetId", "seq");

-- Append-only imposé par la base, pas par la discipline du code. TRUNCATE (tests, seed) n'est pas concerné.
CREATE FUNCTION "event_append_only"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Event is append-only: % refused', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "event_append_only"
    BEFORE UPDATE OR DELETE ON "Event"
    FOR EACH ROW EXECUTE FUNCTION "event_append_only"();
