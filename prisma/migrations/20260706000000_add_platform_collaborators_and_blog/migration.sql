-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable (PlatformCollaborator)
CREATE TABLE IF NOT EXISTS "PlatformCollaborator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable (PlatformBlogCategory)
CREATE TABLE IF NOT EXISTS "PlatformBlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformBlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable (PlatformBlogTag)
CREATE TABLE IF NOT EXISTS "PlatformBlogTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PlatformBlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable (PlatformBlogPost)
CREATE TABLE IF NOT EXISTS "PlatformBlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "categoryId" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readingTime" INTEGER NOT NULL DEFAULT 0,
    "canonicalUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "focusKeyword" TEXT,
    "secondaryKeywords" TEXT,
    "geoSummary" TEXT,
    "keyTakeaways" TEXT,
    "entityList" TEXT,
    "topicClusters" TEXT,
    "faqSection" TEXT,
    "schemaType" TEXT NOT NULL DEFAULT 'Article',
    "structuredData" TEXT,
    "internalLinks" TEXT,
    "externalReferences" TEXT,
    "relatedPosts" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "nofollow" BOOLEAN NOT NULL DEFAULT false,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,

    CONSTRAINT "PlatformBlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable (PlatformBlogPostTag)
CREATE TABLE IF NOT EXISTS "PlatformBlogPostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PlatformBlogPostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable (SmsLog)
CREATE TABLE IF NOT EXISTS "SmsLog" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "messageId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable (ShopDomain)
CREATE TABLE IF NOT EXISTS "ShopDomain" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationType" TEXT NOT NULL DEFAULT 'TXT',
    "verificationToken" TEXT NOT NULL,
    "sslStatus" TEXT NOT NULL DEFAULT 'pending',
    "sslExpiresAt" TIMESTAMP(3),
    "redirectWww" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable (ShopSeedProfile)
CREATE TABLE IF NOT EXISTS "ShopSeedProfile" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "business_type" TEXT,
    "niche" TEXT,
    "target_audience" JSONB,
    "price_level" TEXT,
    "brand_tone" TEXT,
    "main_categories" JSONB,
    "product_rules" JSONB,
    "seo_keywords" JSONB,
    "content_topics" JSONB,
    "image_style" TEXT,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "seed_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSeedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable (ShopSeedJob)
CREATE TABLE IF NOT EXISTS "ShopSeedJob" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "phase" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "preview_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSeedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable (ProductNotificationRequest)
CREATE TABLE IF NOT EXISTS "ProductNotificationRequest" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "phone" TEXT NOT NULL,
    "is_notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductNotificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable (_SecondaryCategories)
CREATE TABLE IF NOT EXISTS "_SecondaryCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- AlterTable (Otp attempts)
ALTER TABLE "Otp" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable (Product embedding)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "embeddingUpdatedAt" TIMESTAMP(3);

-- CreateIndex (PlatformCollaborator)
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformCollaborator_email_key" ON "PlatformCollaborator"("email");

-- CreateIndex (PlatformBlogCategory)
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBlogCategory_slug_key" ON "PlatformBlogCategory"("slug");

-- CreateIndex (PlatformBlogTag)
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBlogTag_name_key" ON "PlatformBlogTag"("name");

-- CreateIndex (PlatformBlogPost)
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBlogPost_slug_key" ON "PlatformBlogPost"("slug");
CREATE INDEX IF NOT EXISTS "PlatformBlogPost_status_idx" ON "PlatformBlogPost"("status");
CREATE INDEX IF NOT EXISTS "PlatformBlogPost_publishedAt_idx" ON "PlatformBlogPost"("publishedAt");
CREATE INDEX IF NOT EXISTS "PlatformBlogPost_categoryId_idx" ON "PlatformBlogPost"("categoryId");

-- CreateIndex (PlatformBlogPostTag)
CREATE INDEX IF NOT EXISTS "PlatformBlogPostTag_postId_idx" ON "PlatformBlogPostTag"("postId");
CREATE INDEX IF NOT EXISTS "PlatformBlogPostTag_tagId_idx" ON "PlatformBlogPostTag"("tagId");

-- CreateIndex (SmsLog)
CREATE INDEX IF NOT EXISTS "SmsLog_shop_id_idx" ON "SmsLog"("shop_id");
CREATE INDEX IF NOT EXISTS "SmsLog_phone_idx" ON "SmsLog"("phone");
CREATE INDEX IF NOT EXISTS "SmsLog_createdAt_idx" ON "SmsLog"("createdAt");

-- CreateIndex (ShopDomain)
CREATE UNIQUE INDEX IF NOT EXISTS "ShopDomain_domain_key" ON "ShopDomain"("domain");
CREATE INDEX IF NOT EXISTS "ShopDomain_shop_id_idx" ON "ShopDomain"("shop_id");
CREATE INDEX IF NOT EXISTS "ShopDomain_domain_idx" ON "ShopDomain"("domain");

-- CreateIndex (ShopSeedProfile)
CREATE UNIQUE INDEX IF NOT EXISTS "ShopSeedProfile_shop_id_key" ON "ShopSeedProfile"("shop_id");
CREATE INDEX IF NOT EXISTS "ShopSeedProfile_shop_id_idx" ON "ShopSeedProfile"("shop_id");

-- CreateIndex (ShopSeedJob)
CREATE INDEX IF NOT EXISTS "ShopSeedJob_shop_id_idx" ON "ShopSeedJob"("shop_id");

-- CreateIndex (ProductNotificationRequest)
CREATE INDEX IF NOT EXISTS "ProductNotificationRequest_shop_id_idx" ON "ProductNotificationRequest"("shop_id");
CREATE INDEX IF NOT EXISTS "ProductNotificationRequest_product_id_idx" ON "ProductNotificationRequest"("product_id");
CREATE INDEX IF NOT EXISTS "ProductNotificationRequest_variant_id_idx" ON "ProductNotificationRequest"("variant_id");

-- CreateIndex (_SecondaryCategories)
CREATE UNIQUE INDEX IF NOT EXISTS "_SecondaryCategories_AB_unique" ON "_SecondaryCategories"("A", "B");
CREATE INDEX IF NOT EXISTS "_SecondaryCategories_B_index" ON "_SecondaryCategories"("B");

-- AddForeignKey / Constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBlogPost_categoryId_fkey') THEN
        ALTER TABLE "PlatformBlogPost" ADD CONSTRAINT "PlatformBlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlatformBlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBlogPostTag_postId_fkey') THEN
        ALTER TABLE "PlatformBlogPostTag" ADD CONSTRAINT "PlatformBlogPostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PlatformBlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBlogPostTag_tagId_fkey') THEN
        ALTER TABLE "PlatformBlogPostTag" ADD CONSTRAINT "PlatformBlogPostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PlatformBlogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_SecondaryCategories_A_fkey') THEN
        ALTER TABLE "_SecondaryCategories" ADD CONSTRAINT "_SecondaryCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_SecondaryCategories_B_fkey') THEN
        ALTER TABLE "_SecondaryCategories" ADD CONSTRAINT "_SecondaryCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
