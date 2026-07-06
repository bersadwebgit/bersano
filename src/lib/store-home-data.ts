import { prisma } from './prisma'
import { cached } from './redis'
import { CacheKeys, TTL } from './cache-keys'
import { getCachedCategories, getCachedHeroSlides, getCachedMenuItems, getCachedBrands } from './cached-queries'

const productListSelect = {
  id: true,
  title: true,
  type: true,
  categoryId: true,
  description: true,
  price: true,
  discount: true,
  imageUrl: true,
  stock: true,
  isSpecial: true,
  specialEndsAt: true,
  isActive: true,
  brand: true,
  createdAt: true,
  isWholesaleOnly: true,
  wholesalePrice: true,
  wholesaleUnit: true,
  moq: true,
}

const specialProductSelect = {
  ...productListSelect,
  orderItems: {
    select: {
      quantity: true
    }
  }
}

async function safeQuery<T>(promise: Promise<T>, fallback: T, queryName: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[WARN] [getStoreHomeData] Query failed: ${queryName}. Falling back to default. Error:`, error);
    return fallback;
  }
}

export async function getStoreHomeData(shopId: string) {
  return cached(
    CacheKeys.homeData(shopId),
    TTL.HOME_DATA,
    async () => {
      // Check if there are any real (non-demo) products in the shop
      const hasRealProducts = await prisma.product.count({
        where: { shopId, isDemo: false, isSampleData: false }
      }) > 0;

      const productFilter = {
        shopId,
        isActive: true,
        ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {})
      };

      const specialProductFilter = {
        shopId,
        isSpecial: true,
        isActive: true,
        ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {})
      };

      const bestSellersFilter = {
        shopId,
        isActive: true,
        ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {})
      };

      const discountedProductFilter = {
        shopId,
        isActive: true,
        OR: [
          { discount: { gt: 0 } },
          { isSpecial: true }
        ],
        ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {})
      };

      const reviewFilter = {
        shopId,
        showOnHomepage: true,
        status: 'approved' as const,
        ...(hasRealProducts ? { isDemo: false } : {})
      };

      const blogPostFilter = {
        shopId,
        status: 'published' as const,
        publishedAt: { lte: new Date() },
        ...(hasRealProducts ? { isDemo: false } : {})
      };

      const [
        products,
        slides,
        categories,
        menuItems,
        settings,
        specialProducts,
        bestSellers,
        discountedProducts,
        homepageReviews,
        blogPosts,
        dbBrands
      ] = await Promise.all([
        safeQuery(
          prisma.product.findMany({
            where: productFilter,
            select: productListSelect,
            orderBy: { createdAt: 'desc' },
            take: 20
          }),
          [],
          'products'
        ),
        safeQuery(getCachedHeroSlides(shopId), [], 'slides'),
        safeQuery(getCachedCategories(shopId), [], 'categories'),
        safeQuery(getCachedMenuItems(shopId), [], 'menuItems'),
        safeQuery(
          prisma.shopSettings.findUnique({
            where: { shopId },
            select: {
              headerConfig: true,
              specialDealsEnabled: true,
              specialDealsLimit: true,
              homePageType: true,
              customHomeConfig: true,
              wholesaleEnabled: true
            }
          }),
          null,
          'settings'
        ),
        safeQuery(
          prisma.product.findMany({
            where: specialProductFilter,
            select: specialProductSelect,
            orderBy: { createdAt: 'desc' },
            take: 8
          }),
          [],
          'specialProducts'
        ),
        safeQuery(
          prisma.product.findMany({
            where: bestSellersFilter,
            select: productListSelect,
            orderBy: {
              orderItems: {
                _count: 'desc'
              }
            },
            take: 8
          }),
          [],
          'bestSellers'
        ),
        safeQuery(
          prisma.product.findMany({
            where: discountedProductFilter,
            select: productListSelect,
            orderBy: [
              { discount: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 8
          }),
          [],
          'discountedProducts'
        ),
        safeQuery(
          prisma.review.findMany({
            where: reviewFilter,
            include: {
              user: { select: { name: true, avatarUrl: true } },
              product: { select: { title: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 12
          }),
          [],
          'homepageReviews'
        ),
        safeQuery(
          prisma.blogPost.findMany({
            where: blogPostFilter,
            orderBy: { publishedAt: 'desc' },
            take: 6,
            include: {
              category: true,
              author: {
                select: {
                  name: true,
                  avatarUrl: true,
                }
              },
              _count: {
                select: { comments: { where: { status: 'approved' } } }
              }
            }
          }),
          [],
          'blogPosts'
        ),
        safeQuery(getCachedBrands(shopId), [], 'dbBrands')
      ]);

      // Filter out demo slides if real products exist
      const finalSlides = hasRealProducts ? slides.filter(s => !s.isDemo) : slides;

      return {
        products,
        slides: finalSlides,
        categories,
        menuItems,
        settings,
        specialProducts,
        bestSellers,
        discountedProducts,
        homepageReviews,
        blogPosts,
        dbBrands
      };
    }
  );
}
