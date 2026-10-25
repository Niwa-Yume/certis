-- S-04 (ADR-0007) : ancrage des têtes de chaîne chez une autorité d'horodatage (RFC 3161).
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anchor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnchorLeaf" (
    "anchorId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "assetId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AnchorLeaf_pkey" PRIMARY KEY ("anchorId","index")
);

CREATE UNIQUE INDEX "AnchorLeaf_assetId_seq_key" ON "AnchorLeaf"("assetId", "seq");

ALTER TABLE "AnchorLeaf" ADD CONSTRAINT "AnchorLeaf_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only, comme le journal (ADR-0006) : un reçu d'horodatage ne se modifie ni ne s'efface.
CREATE FUNCTION "append_only"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % refused', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "anchor_append_only"
    BEFORE UPDATE OR DELETE ON "Anchor"
    FOR EACH ROW EXECUTE FUNCTION "append_only"();

CREATE TRIGGER "anchor_leaf_append_only"
    BEFORE UPDATE OR DELETE ON "AnchorLeaf"
    FOR EACH ROW EXECUTE FUNCTION "append_only"();
