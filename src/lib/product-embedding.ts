import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getAiModel } from './ai-model-resolver';

export interface EmbeddingConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface EmbeddingProgress {
  isProcessing: boolean;
  totalToProcess: number;
  processedCount: number;
  failedCount: number;
  startedAt: string | null;
  lastError: string | null;
}

// Use global to persist state across hot-reloads in Next.js dev mode
const globalForEmbedding = global as unknown as {
  embeddingProgress?: EmbeddingProgress;
};

export const embeddingProgress: EmbeddingProgress = globalForEmbedding.embeddingProgress || {
  isProcessing: false,
  totalToProcess: 0,
  processedCount: 0,
  failedCount: 0,
  startedAt: null,
  lastError: null,
};

if (process.env.NODE_ENV !== 'production') {
  globalForEmbedding.embeddingProgress = embeddingProgress;
}

export function getEmbeddingProgress(): EmbeddingProgress {
  return embeddingProgress;
}

/**
 * Builds the text to embed for a product using only existing fields in schema.prisma.
 */
export function buildProductText(product: {
  title: string;
  description?: string | null;
  brand?: string | null;
  wholesaleUnit?: string | null;
  isWholesaleOnly?: boolean;
}): string {
  return [
    product.title,
    product.description?.slice(0, 500), // max 500 chars
    product.brand,
    product.isWholesaleOnly ? 'فقط عمده B2B' : null,
    product.wholesaleUnit,
  ]
    .filter(Boolean)
    .join(' | ');
}

/**
 * Fetches embedding configuration from SystemSetting.
 */
export async function getEmbeddingConfig(): Promise<EmbeddingConfig | null> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['ai_embedding_base_url', 'ai_embedding_api_key'],
        },
      },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));

    const baseUrl = map.get('ai_embedding_base_url') || '';
    const apiKey = map.get('ai_embedding_api_key') || '';
    const model = await getAiModel('embedding');

    if (!baseUrl || !apiKey || !model || !baseUrl.startsWith('http')) {
      return null;
    }

    return { baseUrl, apiKey, model };
  } catch (error) {
    console.error('[getEmbeddingConfig] Error fetching config:', error);
    return null;
  }
}

/**
 * Fetches embedding vector from the configured embedding service with retry and timeout.
 */
export async function fetchEmbedding(
  text: string,
  config: EmbeddingConfig,
  retries = 3,
  delay = 1000
): Promise<number[]> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/embeddings`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          input: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const backoff = delay * Math.pow(2, attempt);
        console.warn(`[fetchEmbedding] Rate limited (429). Retrying in ${backoff}ms (attempt ${attempt}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response format');
      }

      return embedding as number[];
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (attempt === retries) {
        throw error;
      }
      const backoff = delay * Math.pow(2, attempt);
      console.warn(`[fetchEmbedding] Attempt ${attempt} failed: ${error?.message || error}. Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw new Error('Failed to fetch embedding after retries');
}

/**
 * Generates and stores embedding for a single product.
 * Runs asynchronously and fails silently on error to avoid blocking the main flow.
 */
export async function embedProduct(productId: string, shopId: string): Promise<void> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, shopId },
      select: {
        title: true,
        description: true,
        brand: true,
        wholesaleUnit: true,
        isWholesaleOnly: true,
      },
    });

    if (!product) {
      console.warn(`[embedProduct] Product not found: ${productId} for shop: ${shopId}`);
      return;
    }

    const config = await getEmbeddingConfig();
    if (!config) {
      console.warn('[embedProduct] Embedding config is incomplete. Skipping embedding generation.');
      return;
    }

    const text = buildProductText(product);
    const embedding = await fetchEmbedding(text, config);

    // Store as pgvector using raw SQL
    const vectorStr = `[${embedding.join(',')}]`;
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Product"
      SET embedding = ${vectorStr}::vector,
          "embeddingUpdatedAt" = NOW()
      WHERE id = ${productId} AND "shop_id" = ${shopId}
    `);

    console.log(`[embedProduct] Successfully embedded product: ${productId}`);
  } catch (error: any) {
    console.error(`[embedProduct] Failed to embed product ${productId}:`, error?.message || error);
    throw error; // Propagate error to batch processor
  }
}

/**
 * Batch embeds all products for a shop that do not have an up-to-date embedding.
 * Keeps backward compatibility but calls the robust background process under the hood.
 */
export async function batchEmbedShopProducts(
  shopId: string,
  batchSize = 20
): Promise<{ embedded: number; failed: number }> {
  const config = await getEmbeddingConfig();
  if (!config) {
    console.warn('[batchEmbedShopProducts] Embedding config is incomplete. Skipping batch embedding.');
    return { embedded: 0, failed: 0 };
  }

  const products = await prisma.product.findMany({
    where: {
      shopId,
      embeddingUpdatedAt: null,
    },
    select: { id: true },
    take: 1000, // safety limit per run
  });

  let embedded = 0;
  let failed = 0;

  console.log(`[batchEmbedShopProducts] Found ${products.length} products to embed for shop: ${shopId}`);

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (p) => {
        try {
          await embedProduct(p.id, shopId);
          embedded++;
        } catch {
          failed++;
        }
      })
    );

    // Rate limit: wait 800ms between batches
    if (i + batchSize < products.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return { embedded, failed };
}

/**
 * Starts the robust background embedding process for a specific shop or all shops.
 */
export async function startBackgroundEmbedding(shopId?: string, batchSize = 20): Promise<void> {
  if (embeddingProgress.isProcessing) {
    console.warn('[startBackgroundEmbedding] A background embedding process is already running.');
    return;
  }

  // Initialize progress
  embeddingProgress.isProcessing = true;
  embeddingProgress.processedCount = 0;
  embeddingProgress.failedCount = 0;
  embeddingProgress.startedAt = new Date().toISOString();
  embeddingProgress.lastError = null;

  try {
    const config = await getEmbeddingConfig();
    if (!config) {
      throw new Error('تنظیمات Embedding کامل نیست. لطفاً آدرس پایه و کلید API را بررسی کنید.');
    }

    // Find all products that need embedding
    const whereClause: any = {
      embeddingUpdatedAt: null,
    };
    if (shopId) {
      whereClause.shopId = shopId;
    }

    // Get total count of products to process
    const totalToProcess = await prisma.product.count({
      where: whereClause,
      allowCrossTenant: true,
    } as any);

    embeddingProgress.totalToProcess = totalToProcess;

    if (totalToProcess === 0) {
      embeddingProgress.isProcessing = false;
      return;
    }

    console.log(`[Background Embedding] Starting processing for ${totalToProcess} products...`);

    // Process in chunks of 100 products to avoid pulling too much into memory
    const chunkSize = 100;
    let hasMore = true;

    while (hasMore && embeddingProgress.isProcessing) {
      const products = await prisma.product.findMany({
        where: whereClause,
        select: { id: true, shopId: true },
        take: chunkSize,
        allowCrossTenant: true,
      } as any);

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      // Process this chunk in smaller batches (e.g., batchSize = 20)
      for (let i = 0; i < products.length; i += batchSize) {
        if (!embeddingProgress.isProcessing) break;

        const batch = products.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (p) => {
            try {
              await embedProduct(p.id, p.shopId);
              embeddingProgress.processedCount++;
            } catch (err: any) {
              embeddingProgress.failedCount++;
              console.error(`[Background Embedding] Failed to embed product ${p.id}:`, err?.message || err);
            }
          })
        );

        // Rate limit delay between batches (e.g., 800ms to be safe with rate limits)
        if (i + batchSize < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      // Small pause between chunks
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`[Background Embedding] Finished. Processed: ${embeddingProgress.processedCount}, Failed: ${embeddingProgress.failedCount}`);
  } catch (error: any) {
    console.error('[Background Embedding] Error in background process:', error);
    embeddingProgress.lastError = error?.message || String(error);
  } finally {
    embeddingProgress.isProcessing = false;
  }
}
