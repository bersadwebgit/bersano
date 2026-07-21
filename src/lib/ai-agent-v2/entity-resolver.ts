import { prisma } from '../prisma';

/**
 * Normalizes Persian text by converting Arabic characters to Persian,
 * removing diacritics, and normalizing spaces.
 */
export function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/‌/g, ' ') // Replace zero-width non-joiner (half-space) with regular space
    .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics (Fatha, Damma, Kasra, etc.)
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
}

export interface ResolvedEntity {
  id: string;
  type: 'product' | 'category' | 'order';
  name: string;
  score: number; // 0.0 to 1.0 match score
}

/**
 * Resolves a product by title, brand, or ID.
 */
export async function resolveProduct(query: string, shopId: string): Promise<ResolvedEntity | null> {
  const normalizedQuery = normalizePersianText(query);
  if (!normalizedQuery) return null;

  // 1. Direct ID match
  const directProduct = await prisma.product.findFirst({
    where: {
      id: query.trim(),
      shopId,
    },
    select: { id: true, title: true },
  });

  if (directProduct) {
    return {
      id: directProduct.id,
      type: 'product',
      name: directProduct.title,
      score: 1.0,
    };
  }

  // 2. Exact title match (normalized)
  const products = await prisma.product.findMany({
    where: { shopId },
    select: { id: true, title: true, brand: true },
  });

  let bestMatch: ResolvedEntity | null = null;
  let highestScore = 0;

  for (const p of products) {
    const normalizedTitle = normalizePersianText(p.title);
    
    // Exact match
    if (normalizedTitle === normalizedQuery) {
      return {
        id: p.id,
        type: 'product',
        name: p.title,
        score: 1.0,
      };
    }

    // Contains match
    if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
      const score = Math.min(normalizedTitle.length, normalizedQuery.length) / Math.max(normalizedTitle.length, normalizedQuery.length);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          id: p.id,
          type: 'product',
          name: p.title,
          score: score * 0.9, // Penalty for partial match
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Resolves a category by name, slug, or ID.
 */
export async function resolveCategory(query: string, shopId: string): Promise<ResolvedEntity | null> {
  const normalizedQuery = normalizePersianText(query);
  if (!normalizedQuery) return null;

  // 1. Direct ID match
  const directCategory = await prisma.category.findFirst({
    where: {
      id: query.trim(),
      shopId,
    },
    select: { id: true, name: true },
  });

  if (directCategory) {
    return {
      id: directCategory.id,
      type: 'category',
      name: directCategory.name,
      score: 1.0,
    };
  }

  // 2. Name matches
  const categories = await prisma.category.findMany({
    where: { shopId },
    select: { id: true, name: true, slug: true },
  });

  let bestMatch: ResolvedEntity | null = null;
  let highestScore = 0;

  for (const c of categories) {
    const normalizedName = normalizePersianText(c.name);

    if (normalizedName === normalizedQuery) {
      return {
        id: c.id,
        type: 'category',
        name: c.name,
        score: 1.0,
      };
    }

    if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      const score = Math.min(normalizedName.length, normalizedQuery.length) / Math.max(normalizedName.length, normalizedQuery.length);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          id: c.id,
          type: 'category',
          name: c.name,
          score: score * 0.9,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Resolves an order by ID or customer details.
 */
export async function resolveOrder(query: string, shopId: string): Promise<ResolvedEntity | null> {
  const q = query.trim();
  if (!q) return null;

  // 1. Direct ID match
  const directOrder = await prisma.order.findFirst({
    where: {
      id: q,
      shopId,
    },
    select: { id: true },
  });

  if (directOrder) {
    return {
      id: directOrder.id,
      type: 'order',
      name: `سفارش #${directOrder.id}`,
      score: 1.0,
    };
  }

  return null;
}
