import { prisma } from '../../prisma';
import { normalizePersian } from './persian-normalizer';

export interface ResolvedEntity {
  id: string;
  type: 'product' | 'category' | 'order';
  name: string;
  score: number;
}

export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + substitutionCost
      );
    }
  }

  return d[m][n];
}

export function fuzzyScore(s1: string, s2: string): number {
  const norm1 = normalizePersian(s1);
  const norm2 = normalizePersian(s2);
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const ratio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    return 0.5 + ratio * 0.4;
  }
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 0.0;
  const dist = levenshteinDistance(norm1, norm2);
  const similarity = 1.0 - dist / maxLen;
  return similarity;
}

export async function resolveProduct(query: string, shopId: string): Promise<ResolvedEntity | null> {
  const normalizedQuery = normalizePersian(query);
  if (!normalizedQuery) return null;

  const directProduct = await prisma.product.findFirst({
    where: { id: query.trim(), shopId },
    select: { id: true, title: true },
  });

  if (directProduct) {
    return { id: directProduct.id, type: 'product', name: directProduct.title, score: 1.0 };
  }

  const products = await prisma.product.findMany({
    where: { shopId },
    select: { id: true, title: true },
  });

  let bestMatch: ResolvedEntity | null = null;
  let highestScore = 0;

  for (const p of products) {
    const score = fuzzyScore(p.title, normalizedQuery);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { id: p.id, type: 'product', name: p.title, score };
    }
  }

  return highestScore >= 0.4 ? bestMatch : null;
}

export async function resolveCategory(query: string, shopId: string): Promise<ResolvedEntity | null> {
  const normalizedQuery = normalizePersian(query);
  if (!normalizedQuery) return null;

  const directCategory = await prisma.category.findFirst({
    where: { id: query.trim(), shopId },
    select: { id: true, name: true },
  });

  if (directCategory) {
    return { id: directCategory.id, type: 'category', name: directCategory.name, score: 1.0 };
  }

  const categories = await prisma.category.findMany({
    where: { shopId },
    select: { id: true, name: true, slug: true },
  });

  let bestMatch: ResolvedEntity | null = null;
  let highestScore = 0;

  for (const c of categories) {
    const scoreName = fuzzyScore(c.name, normalizedQuery);
    const scoreSlug = fuzzyScore(c.slug || '', normalizedQuery);
    const score = Math.max(scoreName, scoreSlug);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { id: c.id, type: 'category', name: c.name, score };
    }
  }

  return highestScore >= 0.4 ? bestMatch : null;
}

export async function resolveOrder(query: string, shopId: string): Promise<ResolvedEntity | null> {
  const q = query.trim();
  if (!q) return null;

  const directOrder = await prisma.order.findFirst({
    where: { id: q, shopId },
    select: { id: true },
  });

  if (directOrder) {
    return { id: directOrder.id, type: 'order', name: `سفارش #${directOrder.id}`, score: 1.0 };
  }

  return null;
}
