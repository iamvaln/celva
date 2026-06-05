-- CreateEnum
CREATE TYPE "PaymentAccountType" AS ENUM ('CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK');

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "paymentAccountId" TEXT;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "storageLocation" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "paymentAccountId" TEXT;

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentAccountType" NOT NULL,
    "identifier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
