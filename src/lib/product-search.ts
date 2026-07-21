import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getEmbeddingConfig, fetchEmbedding } from './product-embedding';

export interface SearchOptions {
  shopId: string;
  query: string;
  maxResults?: number;
  isWholesaler?: boolean;
  includeWholesaleData?: boolean;
  adminMode?: boolean;
}

export interface ProductSearchResult {
  id: string;
  title: string;
  price: number;
  discount?: number | null;
  stock: number;
  isWholesaleOnly: boolean;
  imageUrl?: string | null;
  wholesalePrice?: number | null;
  wholesaleTiers?: string | null;
  moq?: number | null;
  wholesaleUnit?: string | null;
  score: number;
}

/**
 * Gets query embedding from the configured embedding service.
 */
async function getQueryEmbedding(query: string, shopId: string): Promise<number[]> {
  const config = await getEmbeddingConfig();
  if (!config) {
    throw new Error('Embedding config is incomplete');
  }
  // AI-008: RAG query embedding is a sub-call of an already-quota'd chat request, so it skips the
  // quota gate but is still cost-tracked/observed under the central system for this tenant.
  return await fetchEmbedding(query, config, {
    shopId,
    endpoint: 'embedding:rag',
    capability: 'embedding:rag',
    skipQuota: true,
    inputCount: 1,
  });
}

/**
 * Performs hybrid search: vector similarity (70%) + keyword trigram similarity (30%).
 * Strictly filters by shopId to prevent cross-tenant data leakage.
 */
/**
 * Performs hybrid search: vector similarity (70%) + keyword trigram similarity (30%),
 * and falls back/complements with a highly robust database keyword ILIKE search.
 * Strictly filters by shopId to prevent cross-tenant data leakage.
 */
export async function searchProducts(opts: SearchOptions): Promise<ProductSearchResult[]> {
  const {
    shopId,
    query,
    maxResults = 8,
    isWholesaler = false,
    includeWholesaleData = false,
    adminMode = false,
  } = opts;

  let results: ProductSearchResult[] = [];

  let vectorSearchUsed = false;
  let vectorSearchFallback = false;

  // 1. Try vector-based hybrid search
  try {
    const embedding = await getQueryEmbedding(query, shopId);
    const vectorStr = `[${embedding.join(',')}]`;

    // Conditional columns for wholesale data using Prisma.sql
    const wholesaleCols = includeWholesaleData
      ? Prisma.sql`, "wholesalePrice", "wholesaleTiers", moq, "wholesaleUnit"`
      : Prisma.empty;

    // Admin mode doesn't restrict to stock > 0
    const stockCondition = adminMode ? Prisma.empty : Prisma.sql`AND stock > 0`;

    // Hybrid search query using Prisma.sql
    results = await prisma.$queryRaw<ProductSearchResult[]>(Prisma.sql`
      SELECT 
        id, 
        title, 
        price, 
        discount, 
        stock, 
        "imageUrl",
        "isWholesaleOnly"
        ${wholesaleCols},
        (
          (1 - (embedding <=> ${vectorStr}::vector)) * 0.7 +
          similarity(title, ${query}) * 0.3
        ) AS score
      FROM "Product"
      WHERE
        "shop_id" = ${shopId}
        AND embedding IS NOT NULL
        ${stockCondition}
        AND (${isWholesaler} OR "isWholesaleOnly" = false)
      ORDER BY score DESC
      LIMIT ${maxResults}
    `);
    vectorSearchUsed = true;
  } catch (error: any) {
    console.warn('[searchProducts] Warning: Hybrid vector search failed, falling back to keyword search:', error?.message || error);
    vectorSearchUsed = false;
    vectorSearchFallback = true;
    results = [];
  }

  console.log('[searchProducts] Observability metadata:', JSON.stringify({
    vectorSearchUsed,
    vectorSearchFallback,
  }));

  // 2. Perform highly robust keyword fallback/complement
  try {
    const isStopWord = (w: string): boolean => {
      return /^(همه|محصول|محصولات|کالا|کالاها|رو|تا|به|با|از|در|یک|موجودی|اضافه|کاهش|افزایش|کم|کن|قیمت|تومان|ریال|تمن|تخفیف|تنوع|رنگ|سایز|بده|کنید|سفارش|فاکتور|برند|دسته|تنظیمات|داشته|باشه|باشند|بشه|باشد|شود|باید|شو|ویرایش|حذف|ایجاد|بساز|کنید|میخواهم|میخوام|خواهشمندم|لطفا|لطفاً|بر اساس|موجود|نام|عنوان|لیست|چاپ|پرینت|ها|های)$/.test(w) || /^[\u06F0-\u06F90-9]+$/.test(w);
    };

    const words = query
      .split(/[\s,،؛|()\-_\/]+/)
      .map(w => w.trim().replace(/['"']/g, ''))
      .filter(w => w.length >= 2 && !isStopWord(w.toLowerCase()));

    if (words.length > 0) {
      const keywordWhere: any = {
        shopId,
        AND: words.map(word => ({
          title: {
            contains: word,
            mode: 'insensitive',
          },
        })),
      };

      if (!adminMode) {
        keywordWhere.stock = { gt: 0 };
        keywordWhere.isWholesaleOnly = isWholesaler ? undefined : false;
      }

      const dbProducts = await prisma.product.findMany({
        where: keywordWhere,
        select: {
          id: true,
          title: true,
          price: true,
          discount: true,
          stock: true,
          imageUrl: true,
          isWholesaleOnly: true,
          wholesalePrice: includeWholesaleData,
          wholesaleTiers: includeWholesaleData,
          moq: includeWholesaleData,
          wholesaleUnit: includeWholesaleData,
        },
        take: maxResults,
      });

      const keywordResults: ProductSearchResult[] = dbProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        discount: p.discount ? Number(p.discount) : null,
        stock: p.stock,
        imageUrl: p.imageUrl,
        isWholesaleOnly: p.isWholesaleOnly,
        wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
        wholesaleTiers: p.wholesaleTiers as string | null,
        moq: p.moq ? Number(p.moq) : null,
        wholesaleUnit: p.wholesaleUnit as string | null,
        score: 0.9, // Assign a high default score for keyword matches
      }));

      // Merge results, prioritizing vector results and avoiding duplicates
      const merged = [...results];
      for (const kp of keywordResults) {
        if (!merged.some(p => p.id === kp.id)) {
          merged.push(kp);
        }
      }
      results = merged;
    }
  } catch (error: any) {
    console.error('[searchProducts] Error during keyword fallback search:', error?.message || error);
  }

  return results.slice(0, maxResults);
}

/**
 * Formats search results as a context string for the AI prompt.
 */
export function formatProductsForContext(
  products: ProductSearchResult[],
  isWholesaler = false
): string {
  if (products.length === 0) return 'محصولی پیدا نشد.';

  return products
    .map((p, i) => {
      let line = `${i + 1}. ${p.title} | موجودی: ${p.stock} | قیمت: ${p.price.toLocaleString('fa')} تومان`;

      if (p.discount && p.discount > 0) {
        line += ` | تخفیف: ${p.discount.toLocaleString('fa')} تومان`;
      }

      if (isWholesaler && p.wholesalePrice) {
        line += ` | قیمت عمده: ${p.wholesalePrice.toLocaleString('fa')} تومان`;
        if (p.moq) line += ` | حداقل سفارش: ${p.moq}`;
        if (p.wholesaleUnit) line += ` | واحد: ${p.wholesaleUnit}`;
      }

      return line;
    })
    .join('\n');
}
