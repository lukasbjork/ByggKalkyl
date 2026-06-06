-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IFC', 'PDF', 'EXCEL', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('st', 'm', 'm2', 'm3', 'kg', 'h');

-- CreateEnum
CREATE TYPE "TakeoffSource" AS ENUM ('IFC', 'AI_PDF', 'MANUAL', 'EXCEL');

-- CreateEnum
CREATE TYPE "PriceProviderType" AS ENUM ('INTERNAL', 'FINFO', 'EDI');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'TAKEOFF', 'PRICED', 'CALCULATED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "namn" TEXT NOT NULL,
    "kund" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filnamn" TEXT NOT NULL,
    "typ" "DocumentType" NOT NULL,
    "lagringssokvag" TEXT NOT NULL,
    "storlekBytes" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "felmeddelande" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TakeoffItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "kod" TEXT,
    "benamning" TEXT NOT NULL,
    "mangd" DECIMAL(18,4) NOT NULL,
    "enhet" "Unit" NOT NULL,
    "lageskod" TEXT,
    "kalla" "TakeoffSource" NOT NULL,
    "konfidens" DECIMAL(4,3),
    "antagande" TEXT,
    "granskad" BOOLEAN NOT NULL DEFAULT false,
    "kopplatResourceId" TEXT,
    "kopplatTimeNormId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakeoffItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "leverantor" TEXT NOT NULL,
    "artikelnr" TEXT,
    "benamning" TEXT NOT NULL,
    "enhet" "Unit" NOT NULL,
    "bruttopris" DECIMAL(18,4) NOT NULL,
    "prisProvider" "PriceProviderType" NOT NULL DEFAULT 'INTERNAL',
    "varugrupp" TEXT,
    "uppdaterad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "leverantor" TEXT NOT NULL,
    "varugrupp" TEXT,
    "rabattProcent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeNorm" (
    "id" TEXT NOT NULL,
    "aktivitet" TEXT NOT NULL,
    "enhet" "Unit" NOT NULL,
    "timmarPerEnhet" DECIMAL(10,4) NOT NULL,
    "tradeId" TEXT NOT NULL,
    "kod" TEXT,
    "notering" TEXT,
    "exempel" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeNorm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "namn" TEXT NOT NULL,
    "timpris" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationSettings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "omkostnadProcent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "materialPaslagProcent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "riskProcent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "arbetsdagTimmar" DECIMAL(4,2) NOT NULL DEFAULT 8,

    CONSTRAINT "CalculationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationResult" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prisProvider" "PriceProviderType" NOT NULL DEFAULT 'INTERNAL',
    "prislage" TEXT,
    "totalMaterial" DECIMAL(18,2) NOT NULL,
    "totalArbete" DECIMAL(18,2) NOT NULL,
    "totalOmkostnad" DECIMAL(18,2) NOT NULL,
    "totalRisk" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "totalArbetstimmar" DECIMAL(18,2) NOT NULL,
    "arbetsdagTimmar" DECIMAL(4,2) NOT NULL,
    "tidPerYrke" JSONB NOT NULL,

    CONSTRAINT "CalculationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationLine" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "takeoffItemId" TEXT,
    "kod" TEXT,
    "benamning" TEXT NOT NULL,
    "byggdel" TEXT,
    "mangd" DECIMAL(18,4) NOT NULL,
    "enhet" "Unit" NOT NULL,
    "leverantor" TEXT,
    "nettoApris" DECIMAL(18,4),
    "materialkostnad" DECIMAL(18,2) NOT NULL,
    "yrke" TEXT,
    "timmarPerEnhet" DECIMAL(10,4),
    "arbetstimmar" DECIMAL(18,4) NOT NULL,
    "timpris" DECIMAL(10,2),
    "arbetskostnad" DECIMAL(18,2) NOT NULL,
    "radtotal" DECIMAL(18,2) NOT NULL,
    "saknarPris" BOOLEAN NOT NULL DEFAULT false,
    "saknarTidsnorm" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CalculationLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "TakeoffItem_projectId_idx" ON "TakeoffItem"("projectId");

-- CreateIndex
CREATE INDEX "TakeoffItem_sourceDocumentId_idx" ON "TakeoffItem"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "Resource_leverantor_idx" ON "Resource"("leverantor");

-- CreateIndex
CREATE INDEX "Resource_varugrupp_idx" ON "Resource"("varugrupp");

-- CreateIndex
CREATE INDEX "Resource_artikelnr_idx" ON "Resource"("artikelnr");

-- CreateIndex
CREATE INDEX "DiscountRule_leverantor_idx" ON "DiscountRule"("leverantor");

-- CreateIndex
CREATE INDEX "TimeNorm_tradeId_idx" ON "TimeNorm"("tradeId");

-- CreateIndex
CREATE INDEX "TimeNorm_kod_idx" ON "TimeNorm"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_namn_key" ON "Trade"("namn");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationSettings_projectId_key" ON "CalculationSettings"("projectId");

-- CreateIndex
CREATE INDEX "CalculationResult_projectId_idx" ON "CalculationResult"("projectId");

-- CreateIndex
CREATE INDEX "CalculationLine_resultId_idx" ON "CalculationLine"("resultId");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeoffItem" ADD CONSTRAINT "TakeoffItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeoffItem" ADD CONSTRAINT "TakeoffItem_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeoffItem" ADD CONSTRAINT "TakeoffItem_kopplatResourceId_fkey" FOREIGN KEY ("kopplatResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeoffItem" ADD CONSTRAINT "TakeoffItem_kopplatTimeNormId_fkey" FOREIGN KEY ("kopplatTimeNormId") REFERENCES "TimeNorm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeNorm" ADD CONSTRAINT "TimeNorm_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationSettings" ADD CONSTRAINT "CalculationSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationResult" ADD CONSTRAINT "CalculationResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationLine" ADD CONSTRAINT "CalculationLine_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "CalculationResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
