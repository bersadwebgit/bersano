// Aggregates real shop signals used by the AI content calendar planner.
// Everything is tenant-scoped by shopId and uses standard Prisma client APIs.

import { prisma } from '@/lib/prisma';

const SUCCESSFUL_ORDER_STATUSES = ['paid', 'shipped', 'delivered'];
const DEMO_VISITOR_PREFIX = 'vis_seed_'; // marks auto-seeded demo traffic rows

export interface CalendarSignals {
  topSellers: { id: string; title: string; unitsSold: number; price: number; categoryId: string | null }[];
  lowStockProducts: { id: string; title: string; stock: number }[];
  unsoldProducts: { id: string; title: string }[];
  catalog: {
    products: { id: string; title: string; price: number; discount: number; categoryId: string | null; brand: string | null; stock: number }[];
    categories: { id: string; name: string; slug: string }[];
  };
  traffic: {
    isDemoData: boolean;
    windowDays: number;
    pageViews: number;
    uniqueVisitors: number;
    conversionRate: number; // percentage
    sources: { source: string; percent: number }[];
    topEntryPages: { url: string; views: number }[];
  };
  existingPosts: { title: string; status: string; viewCount: number; tags: string[] }[];
}

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export async function gatherCalendarSignals(shopId: string): Promise<CalendarSignals> {
  const now = new Date();
  const windowDays = 30;
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [
    topSellingItems,
    activeProducts,
    lowStockRaw,
    categories,
    pageViews,
    successfulOrdersCount,
    posts,
  ] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        shopId,
        order: { status: { in: SUCCESSFUL_ORDER_STATUSES } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    }),
    prisma.product.findMany({
      where: { shopId, isActive: true, isDemo: false },
      select: { id: true, title: true, price: true, discount: true, categoryId: true, brand: true, stock: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.product.findMany({
      where: { shopId, isActive: true, isDemo: false, stock: { lte: 5 } },
      select: { id: true, title: true, stock: true },
      orderBy: { stock: 'asc' },
      take: 10,
    }),
    prisma.category.findMany({
      where: { shopId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.pageView.findMany({
      where: { shopId, createdAt: { gte: windowStart } },
      select: { url: true, source: true, ip: true },
    }),
    prisma.order.count({
      where: { shopId, status: { in: SUCCESSFUL_ORDER_STATUSES }, createdAt: { gte: windowStart } },
    }),
    prisma.blogPost.findMany({
      where: { shopId, isDemo: false },
      select: { title: true, status: true, viewCount: true, tags: true },
      orderBy: { viewCount: 'desc' },
      take: 40,
    }),
  ]);

  // Resolve top-seller titles (groupBy returns only productId + aggregate).
  const topSellerIds = topSellingItems.map((t) => t.productId).filter(Boolean) as string[];
  const topSellerProducts = topSellerIds.length
    ? await prisma.product.findMany({
        where: { shopId, id: { in: topSellerIds } },
        select: { id: true, title: true, price: true, categoryId: true },
      })
    : [];
  const topSellerMap = new Map(topSellerProducts.map((p) => [p.id, p]));
  const topSellers = topSellingItems
    .map((item) => {
      const product = topSellerMap.get(item.productId as string);
      if (!product) return null;
      return {
        id: product.id,
        title: product.title,
        unitsSold: item._sum.quantity || 0,
        price: product.price,
        categoryId: product.categoryId,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Unsold = active, non-demo products that never appear in a successful order.
  const soldProductIds = new Set(
    (
      await prisma.orderItem.findMany({
        where: { shopId, order: { status: { in: SUCCESSFUL_ORDER_STATUSES } } },
        select: { productId: true },
        distinct: ['productId'],
      })
    ).map((o) => o.productId)
  );
  const unsoldProducts = activeProducts
    .filter((p) => !soldProductIds.has(p.id))
    .slice(0, 10)
    .map((p) => ({ id: p.id, title: p.title }));

  // ---- Traffic signals (filter out auto-seeded demo rows) ----
  const realViews = pageViews.filter((v) => !(v.ip || '').startsWith(DEMO_VISITOR_PREFIX));
  const isDemoData = realViews.length === 0 && pageViews.length > 0;
  const effectiveViews = realViews.length > 0 ? realViews : pageViews;

  const uniqueVisitorSet = new Set(effectiveViews.map((v) => v.ip || 'unknown'));
  const uniqueVisitors = uniqueVisitorSet.size;

  const sourceCounts = new Map<string, number>();
  for (const v of effectiveViews) {
    const s = v.source || 'Direct';
    sourceCounts.set(s, (sourceCounts.get(s) || 0) + 1);
  }
  const sources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, percent: effectiveViews.length ? Math.round((count / effectiveViews.length) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent);

  const urlCounts = new Map<string, number>();
  for (const v of effectiveViews) {
    const u = v.url || '/';
    urlCounts.set(u, (urlCounts.get(u) || 0) + 1);
  }
  const topEntryPages = Array.from(urlCounts.entries())
    .map(([url, views]) => ({ url, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const conversionRate = uniqueVisitors > 0 ? Math.round((successfulOrdersCount / uniqueVisitors) * 1000) / 10 : 0;

  return {
    topSellers,
    lowStockProducts: lowStockRaw.map((p) => ({ id: p.id, title: p.title, stock: p.stock })),
    unsoldProducts,
    catalog: {
      products: activeProducts.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        discount: p.discount || 0,
        categoryId: p.categoryId,
        brand: p.brand,
        stock: p.stock,
      })),
      categories,
    },
    traffic: {
      isDemoData,
      windowDays,
      pageViews: effectiveViews.length,
      uniqueVisitors,
      conversionRate,
      sources,
      topEntryPages,
    },
    existingPosts: posts.map((p) => ({
      title: p.title,
      status: p.status,
      viewCount: p.viewCount,
      tags: safeParseTags(p.tags),
    })),
  };
}
