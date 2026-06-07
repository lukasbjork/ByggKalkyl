-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "gtin" TEXT;

-- CreateIndex
CREATE INDEX "Resource_gtin_idx" ON "Resource"("gtin");
