import { redis, invalidatePattern } from './redis'
import { CacheKeys } from './cache-keys'
import { prisma } from './prisma'

export const Invalidate = {
  shopSettings: async (shopId: string) => {
    if (!redis) return
    try {
      const settings = await prisma.shopSettings.findUnique({
        where: { shopId },
        select: { subdomain: true, customDomain: true },
      })
      if (settings) {
        if (settings.subdomain) {
          await redis.del(CacheKeys.shopSettings(settings.subdomain))
        }
        if (settings.customDomain) {
          await redis.del(CacheKeys.shopSettings(settings.customDomain))
        }
      }
      await redis.del(CacheKeys.homeData(shopId))
    } catch (err) {
      console.warn('Failed to invalidate shop settings:', err)
    }
  },

  categories: async (shopId: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.categories(shopId))
      await redis.del(CacheKeys.homeData(shopId))
    } catch {}
  },

  product: async (shopId: string, productId: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.productDetail(shopId, productId))
      await redis.del(CacheKeys.homeData(shopId))
      await invalidatePattern(`shop:${shopId}:products:*`)
    } catch {}
  },

  products: async (shopId: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.homeData(shopId))
      await invalidatePattern(`shop:${shopId}:products:*`)
    } catch {}
  },

  heroSlides: async (shopId: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.heroSlides(shopId))
      await redis.del(CacheKeys.homeData(shopId))
    } catch {}
  },

  stories: async (shopId: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.stories(shopId))
    } catch {}
  },

  blogPost: async (shopId: string, slug: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.blogPost(shopId, slug))
      await redis.del(CacheKeys.homeData(shopId))
      await invalidatePattern(`shop:${shopId}:blog:list:*`)
    } catch {}
  },

  footerConfig: async (shopId: string) => {
    if (!redis) return
    try {
      await redis.del(CacheKeys.footerConfig(shopId))
      await redis.del(CacheKeys.homeData(shopId))
    } catch {}
  },

  /** Nuclear option — wipe entire shop cache (use on shop deletion or reset) */
  shop: async (shopId: string) => {
    await invalidatePattern(`shop:${shopId}:*`)
    // Also try invalidating settings if we can resolve them
    try {
      const settings = await prisma.shopSettings.findUnique({
        where: { shopId },
        select: { subdomain: true, customDomain: true },
      })
      if (settings) {
        if (settings.subdomain) {
          await redis.del(CacheKeys.shopSettings(settings.subdomain))
        }
        if (settings.customDomain) {
          await redis.del(CacheKeys.shopSettings(settings.customDomain))
        }
      }
    } catch {}
  },
}
