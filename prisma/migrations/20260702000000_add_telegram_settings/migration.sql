-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "telegram_integration_token" TEXT DEFAULT '';
ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT DEFAULT '';
ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "telegram_order_notifications_enabled" BOOLEAN DEFAULT false;
ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "telegram_notification_statuses" TEXT DEFAULT '["new_order","status_change"]';
