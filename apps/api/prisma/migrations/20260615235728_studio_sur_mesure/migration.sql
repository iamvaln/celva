-- CreateEnum
CREATE TYPE "StudioRequestType" AS ENUM ('ORDER', 'APPOINTMENT');

-- CreateEnum
CREATE TYPE "StudioRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StudioOrderMeasureMode" AS ENUM ('ATELIER', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "StudioAppointmentMode" AS ENUM ('ATELIER', 'VISIO');

-- CreateEnum
CREATE TYPE "StudioGender" AS ENUM ('FEMME', 'HOMME');

-- CreateTable
CREATE TABLE "studio_models" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "shortDescription" JSONB,
    "material" JSONB,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "delayLabel" JSONB NOT NULL,
    "coverImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_fabrics" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "swatchImage" TEXT,
    "photoImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_fabrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_gallery_items" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "caption" JSONB,
    "isTall" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_requests" (
    "id" TEXT NOT NULL,
    "type" "StudioRequestType" NOT NULL,
    "status" "StudioRequestStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerCity" TEXT,
    "gender" "StudioGender",
    "skinToneIndex" INTEGER,
    "silhouetteSize" TEXT,
    "silhouetteHeight" INTEGER,
    "modelId" TEXT,
    "fabricId" TEXT,
    "sizeRef" TEXT,
    "measurementMode" "StudioOrderMeasureMode",
    "appointmentMode" "StudioAppointmentMode",
    "appointmentDate" TIMESTAMP(3),
    "appointmentSlot" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "appSource" "AppSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_models_slug_key" ON "studio_models"("slug");

-- CreateIndex
CREATE INDEX "studio_fabrics_modelId_sortOrder_idx" ON "studio_fabrics"("modelId", "sortOrder");

-- CreateIndex
CREATE INDEX "studio_requests_status_createdAt_idx" ON "studio_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "studio_requests_type_status_idx" ON "studio_requests"("type", "status");

-- AddForeignKey
ALTER TABLE "studio_fabrics" ADD CONSTRAINT "studio_fabrics_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "studio_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_gallery_items" ADD CONSTRAINT "studio_gallery_items_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "studio_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_requests" ADD CONSTRAINT "studio_requests_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "studio_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_requests" ADD CONSTRAINT "studio_requests_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "studio_fabrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
