import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

export const getCachedCategories = (shopId: string) =>
  unstable_cache(
    () => prisma.category.findMany({
      where: { shopId, parentId: null },
      include: { children: true },
      orderBy: { name: 'asc' }
    }),
    [`categories-${shopId}`],
    { revalidate: 1800, tags: [`categories-${shopId}`] }
  )()

export const getCachedHeroSlides = (shopId: string) =>
  unstable_cache(
    () => prisma.heroSlide.findMany({
      where: { shopId, isActive: true },
      orderBy: { order: 'asc' }
    }),
    [`hero-${shopId}`],
    { revalidate: 3600, tags: [`hero-${shopId}`] }
  )()

export const getCachedProductDetail = (shopId: string, productId: string) =>
  unstable_cache(
    () => prisma.product.findFirst({
      where: { id: productId, shopId, isActive: true },
      include: { variants: true, category: true }
    }),
    [`product-${shopId}-${productId}`],
    { revalidate: 600, tags: [`product-${shopId}-${productId}`] }
  )()
