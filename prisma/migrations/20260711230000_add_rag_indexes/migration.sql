-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_trgm_title_idx" ON "Product" USING gin ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_shopid_embedding_idx" ON "Product" ("shop_id") WHERE "embedding" IS NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_embedding_hnsw" ON "Product" USING hnsw ("embedding" vector_cosine_ops);
