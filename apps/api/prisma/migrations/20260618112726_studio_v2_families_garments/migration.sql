/*
  Warnings:

  - You are about to drop the column `modelId` on the `studio_fabrics` table. All the data in the column will be lost.
  - You are about to drop the column `basePrice` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `coverImage` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `delayLabel` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `material` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `studio_models` table. All the data in the column will be lost.
  - You are about to drop the column `fabricId` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `measurementMode` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `modelId` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `silhouetteHeight` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `silhouetteSize` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `sizeRef` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the column `skinToneIndex` on the `studio_requests` table. All the data in the column will be lost.
  - You are about to drop the `studio_gallery_items` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `familyId` to the `studio_fabrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `garmentId` to the `studio_models` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageKey` to the `studio_models` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudioModelAngle" AS ENUM ('FRONT', 'SIDE', 'BACK', 'DETAIL');

-- DropForeignKey
ALTER TABLE "studio_fabrics" DROP CONSTRAINT "studio_fabrics_modelId_fkey";

-- DropForeignKey
ALTER TABLE "studio_gallery_items" DROP CONSTRAINT "studio_gallery_items_modelId_fkey";

-- DropForeignKey
ALTER TABLE "studio_requests" DROP CONSTRAINT "studio_requests_fabricId_fkey";

-- DropForeignKey
ALTER TABLE "studio_requests" DROP CONSTRAINT "studio_requests_modelId_fkey";

-- DropIndex
DROP INDEX "studio_fabrics_modelId_sortOrder_idx";

-- DropIndex
DROP INDEX "studio_models_slug_key";

-- AlterTable
ALTER TABLE "studio_fabrics" DROP COLUMN "modelId",
ADD COLUMN     "familyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "studio_models" DROP COLUMN "basePrice",
DROP COLUMN "coverImage",
DROP COLUMN "delayLabel",
DROP COLUMN "material",
DROP COLUMN "name",
DROP COLUMN "shortDescription",
DROP COLUMN "slug",
ADD COLUMN     "angle" "StudioModelAngle",
ADD COLUMN     "caption" JSONB,
ADD COLUMN     "garmentId" TEXT NOT NULL,
ADD COLUMN     "imageKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "studio_requests" DROP COLUMN "fabricId",
DROP COLUMN "gender",
DROP COLUMN "measurementMode",
DROP COLUMN "modelId",
DROP COLUMN "silhouetteHeight",
DROP COLUMN "silhouetteSize",
DROP COLUMN "sizeRef",
DROP COLUMN "skinToneIndex";

-- DropTable
DROP TABLE "studio_gallery_items";

-- DropEnum
DROP TYPE "StudioGender";

-- DropEnum
DROP TYPE "StudioOrderMeasureMode";

-- CreateTable
CREATE TABLE "studio_fabric_families" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "coverImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_fabric_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_garments" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_garments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_request_fabrics" (
    "requestId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "studio_request_fabrics_pkey" PRIMARY KEY ("requestId","fabricId")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_fabric_families_slug_key" ON "studio_fabric_families"("slug");

-- CreateIndex
CREATE INDEX "studio_garments_familyId_sortOrder_idx" ON "studio_garments"("familyId", "sortOrder");

-- CreateIndex
CREATE INDEX "studio_request_fabrics_fabricId_idx" ON "studio_request_fabrics"("fabricId");

-- CreateIndex
CREATE INDEX "studio_fabrics_familyId_sortOrder_idx" ON "studio_fabrics"("familyId", "sortOrder");

-- CreateIndex
CREATE INDEX "studio_models_garmentId_sortOrder_idx" ON "studio_models"("garmentId", "sortOrder");

-- AddForeignKey
ALTER TABLE "studio_fabrics" ADD CONSTRAINT "studio_fabrics_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "studio_fabric_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_garments" ADD CONSTRAINT "studio_garments_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "studio_fabric_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_models" ADD CONSTRAINT "studio_models_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "studio_garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_request_fabrics" ADD CONSTRAINT "studio_request_fabrics_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "studio_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_request_fabrics" ADD CONSTRAINT "studio_request_fabrics_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "studio_fabrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
