-- AI-008 (Phase C): AiUsage enrichment — additive, forward-only, non-destructive.
-- All new columns are nullable and have no defaults, so existing rows are untouched and legacy
-- rows (operation_type IS NULL) keep counting toward the chat quota exactly as before.
-- The original "cost_usd" (double precision) column is intentionally preserved for backward
-- compatibility; "cost_usd_decimal" is the precise billing-grade currency column going forward.

-- AlterTable
ALTER TABLE "AiUsage"
    ADD COLUMN IF NOT EXISTS "operation_type"   TEXT,
    ADD COLUMN IF NOT EXISTS "resolved_model"   TEXT,
    ADD COLUMN IF NOT EXISTS "status"           TEXT,
    ADD COLUMN IF NOT EXISTS "cost_status"      TEXT,
    ADD COLUMN IF NOT EXISTS "cost_usd_decimal" DECIMAL(14,8),
    ADD COLUMN IF NOT EXISTS "request_id"       TEXT,
    ADD COLUMN IF NOT EXISTS "duration_ms"      INTEGER,
    ADD COLUMN IF NOT EXISTS "input_count"      INTEGER,
    ADD COLUMN IF NOT EXISTS "idempotency_key"  TEXT;

-- CreateIndex (idempotency guard for retry/resume; NULLs are allowed and not deduplicated)
CREATE UNIQUE INDEX IF NOT EXISTS "AiUsage_idempotency_key_key" ON "AiUsage"("idempotency_key");

-- CreateIndex (fast per-shop, per-operation monthly aggregation for quota/billing)
CREATE INDEX IF NOT EXISTS "AiUsage_shop_id_operation_type_month_key_idx"
    ON "AiUsage"("shop_id", "operation_type", "month_key");
