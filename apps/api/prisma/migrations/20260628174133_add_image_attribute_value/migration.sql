-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "attributeValueId" TEXT;

-- CreateIndex
CREATE INDEX "product_images_attributeValueId_idx" ON "product_images"("attributeValueId");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "product_attribute_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
