import { prisma } from './prisma'
import { cached } from './redis'
import { CacheKeys, TTL } from './cache-keys'

export async function getCachedCategories(shopId: string) {
  return cached(
    CacheKeys.categories(shopId),
    TTL.CATEGORIES,
    async () => prisma.category.findMany({
      where: { shopId, isActive: true },
      include: {
        children: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  );
}

export async function getCachedHeroSlides(shopId: string) {
  return cached(
    CacheKeys.heroSlides(shopId),
    TTL.HERO_SLIDES,
    async () => prisma.heroSlide.findMany({
      where: { shopId, isActive: true },
      orderBy: { order: 'asc' }
    })
  );
}

export async function getCachedMenuItems(shopId: string) {
  return cached(
    CacheKeys.menu(shopId),
    TTL.MENU,
    async () => prisma.menuItem.findMany({
      where: { shopId, isActive: true },
      orderBy: { order: 'asc' }
    })
  );
}

export async function getCachedBrands(shopId: string) {
  return cached(
    CacheKeys.brands(shopId),
    TTL.BRANDS,
    async () => prisma.brand.findMany({
      where: { shopId },
      orderBy: { name: 'asc' }
    })
  );
}

export async function getCachedProductDetail(shopId: string, productId: string) {
  return cached(
    CacheKeys.productDetail(shopId, productId),
    TTL.PRODUCT_DETAIL,
    async () => prisma.product.findFirst({
      where: { id: productId, shopId, isActive: true },
      include: {
        variants: true,
        category: {
          select: { id: true, name: true, slug: true }
        },
        categories: {
          select: { id: true, name: true, slug: true }
        },
        reviews: {
          where: { status: 'approved' },
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  );
}
