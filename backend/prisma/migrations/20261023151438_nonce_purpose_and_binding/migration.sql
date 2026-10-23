-- Les nonces existants n'ont ni finalité ni émetteur et expirent en quelques secondes :
-- on les purge plutôt que d'inventer des valeurs (édité à la main, AUDIT S2/S3/S4).
DELETE FROM "AuthNonce";

-- CreateEnum
CREATE TYPE "NoncePurpose" AS ENUM ('VERIFY', 'TRANSFER');

-- AlterTable
ALTER TABLE "AuthNonce" ADD COLUMN     "issuedById" TEXT NOT NULL,
ADD COLUMN     "purpose" "NoncePurpose" NOT NULL,
ADD COLUMN     "recipientId" TEXT;

-- AddForeignKey
ALTER TABLE "AuthNonce" ADD CONSTRAINT "AuthNonce_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthNonce" ADD CONSTRAINT "AuthNonce_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
