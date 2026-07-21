-- AI-008 (Phase C) Hardening: Add attempt-level tracking columns and update unique constraint.

-- AlterTable
ALTER TABLE "AiUsage"
    ADD COLUMN IF NOT EXISTS "root_request_id"     TEXT,
    ADD COLUMN IF NOT EXISTS "attempt_index"      INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "provider_request_id" TEXT,
    ADD COLUMN IF NOT EXISTS "usage_known"        BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS "actual_cost"        DECIMAL(14,8),
    ADD COLUMN IF NOT EXISTS "estimated_cost"     DECIMAL(14,8),
    ADD COLUMN IF NOT EXISTS "error_code"         TEXT,
    ADD COLUMN IF NOT EXISTS "transport_mode"     TEXT;

-- Drop old single-column unique index if it exists
DROP INDEX IF EXISTS "AiUsage_idempotency_key_key";

-- Create new compound unique index for tenant-scoped, attempt-aware idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "AiUsage_shop_id_idempotency_key_operation_type_attempt_index_key"
    ON "AiUsage"("shop_id", "idempotency_key", "operation_type", "attempt_index");
