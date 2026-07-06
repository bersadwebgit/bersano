-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "optionsJson" TEXT;
