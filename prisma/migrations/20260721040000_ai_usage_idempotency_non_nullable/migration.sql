-- AI-008 (Phase C) Hardening: Make idempotency columns non-nullable.

-- 1. Fill existing NULL values with robust defaults.
UPDATE "AiUsage"
SET "operation_type" = 'chat'
WHERE "operation_type" IS NULL;

UPDATE "AiUsage"
SET "attempt_index" = 0
WHERE "attempt_index" IS NULL;

UPDATE "AiUsage"
SET "idempotency_key" = COALESCE("request_id", "id")
WHERE "idempotency_key" IS NULL;

-- 2. Alter columns to NOT NULL.
ALTER TABLE "AiUsage"
    ALTER COLUMN "operation_type" SET NOT NULL,
    ALTER COLUMN "attempt_index" SET NOT NULL,
    ALTER COLUMN "idempotency_key" SET NOT NULL;
