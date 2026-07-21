-- Marketing CMS (platform brand website) — additive, non-destructive.
-- NOTE: RAG indexes (product_embedding_hnsw, product_trgm_title_idx) are intentionally
-- NOT touched here. They live outside the Prisma model layer (raw SQL) and must remain.

-- CreateTable
CREATE TABLE "MarketingPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "canonicalUrl" TEXT,
    "ogImage" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "structuredData" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL DEFAULT '{}',
    "themeVariant" TEXT NOT NULL DEFAULT 'surface',
    "anchorId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "label" TEXT,
    "isAutosave" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingRedirect" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "name" TEXT NOT NULL,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "mime" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audience" TEXT,
    "priceLabel" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT '',
    "annualPriceLabel" TEXT NOT NULL DEFAULT '',
    "badge" TEXT,
    "ctaText" TEXT NOT NULL DEFAULT 'شروع کنید',
    "ctaLink" TEXT NOT NULL DEFAULT '/register',
    "features" JSONB NOT NULL DEFAULT '[]',
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "packageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPage_slug_key" ON "MarketingPage"("slug");

-- CreateIndex
CREATE INDEX "MarketingPage_status_idx" ON "MarketingPage"("status");

-- CreateIndex
CREATE INDEX "MarketingPage_slug_status_idx" ON "MarketingPage"("slug", "status");

-- CreateIndex
CREATE INDEX "MarketingSection_pageId_idx" ON "MarketingSection"("pageId");

-- CreateIndex
CREATE INDEX "MarketingSection_pageId_order_idx" ON "MarketingSection"("pageId", "order");

-- CreateIndex
CREATE INDEX "MarketingRevision_pageId_idx" ON "MarketingRevision"("pageId");

-- CreateIndex
CREATE INDEX "MarketingRevision_pageId_createdAt_idx" ON "MarketingRevision"("pageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingRedirect_fromPath_key" ON "MarketingRedirect"("fromPath");

-- CreateIndex
CREATE INDEX "MarketingRedirect_enabled_idx" ON "MarketingRedirect"("enabled");

-- CreateIndex
CREATE INDEX "MediaAsset_type_idx" ON "MediaAsset"("type");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingAuditLog_entity_idx" ON "MarketingAuditLog"("entity");

-- CreateIndex
CREATE INDEX "MarketingAuditLog_createdAt_idx" ON "MarketingAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPlan_key_key" ON "MarketingPlan"("key");

-- CreateIndex
CREATE INDEX "MarketingPlan_isActive_order_idx" ON "MarketingPlan"("isActive", "order");

-- AddForeignKey
ALTER TABLE "MarketingSection" ADD CONSTRAINT "MarketingSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "MarketingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingRevision" ADD CONSTRAINT "MarketingRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "MarketingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPlan" ADD CONSTRAINT "MarketingPlan_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
