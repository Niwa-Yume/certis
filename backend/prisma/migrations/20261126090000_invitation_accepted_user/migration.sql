-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "acceptedUserId" TEXT;

-- CreateIndex
CREATE INDEX "Invitation_acceptedUserId_idx" ON "Invitation"("acceptedUserId");

