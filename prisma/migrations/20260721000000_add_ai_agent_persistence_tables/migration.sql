-- CreateTable
CREATE TABLE IF NOT EXISTS "AiChangeSet" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "risk_analysis" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),
    "rollback_notes" TEXT,

    CONSTRAINT "AiChangeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiChangeStep" (
    "id" TEXT NOT NULL,
    "change_set_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "record_id" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiChangeStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiApproval" (
    "id" TEXT NOT NULL,
    "change_set_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiFeedback" (
    "id" TEXT NOT NULL,
    "change_set_id" TEXT NOT NULL,
    "user_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiPromptVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiChangeSet_shop_id_idx" ON "AiChangeSet"("shop_id");
CREATE INDEX IF NOT EXISTS "AiChangeSet_status_idx" ON "AiChangeSet"("status");
CREATE INDEX IF NOT EXISTS "AiChangeSet_created_at_idx" ON "AiChangeSet"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiChangeStep_change_set_id_idx" ON "AiChangeStep"("change_set_id");
CREATE INDEX IF NOT EXISTS "AiChangeStep_record_id_idx" ON "AiChangeStep"("record_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiApproval_change_set_id_idx" ON "AiApproval"("change_set_id");
CREATE INDEX IF NOT EXISTS "AiApproval_user_id_idx" ON "AiApproval"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiFeedback_change_set_id_idx" ON "AiFeedback"("change_set_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiPromptVersion_name_key" ON "AiPromptVersion"("name");
CREATE INDEX IF NOT EXISTS "AiPromptVersion_name_is_active_idx" ON "AiPromptVersion"("name", "is_active");

-- AddForeignKey / Constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiChangeStep_change_set_id_fkey') THEN
        ALTER TABLE "AiChangeStep" ADD CONSTRAINT "AiChangeStep_change_set_id_fkey" FOREIGN KEY ("change_set_id") REFERENCES "AiChangeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiApproval_change_set_id_fkey') THEN
        ALTER TABLE "AiApproval" ADD CONSTRAINT "AiApproval_change_set_id_fkey" FOREIGN KEY ("change_set_id") REFERENCES "AiChangeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiFeedback_change_set_id_fkey') THEN
        ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_change_set_id_fkey" FOREIGN KEY ("change_set_id") REFERENCES "AiChangeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
