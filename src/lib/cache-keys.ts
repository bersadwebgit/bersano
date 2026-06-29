export const TTL = {
  SHOP_SETTINGS: 3600,      // 1 hour
  CATEGORIES: 1800,         // 30 min
  PRODUCTS_LIST: 300,       // 5 min
  PRODUCT_DETAIL: 600,      // 10 min
  HERO_SLIDES: 3600,        // 1 hour
  STORIES: 600,             // 10 min
  BLOG_POST: 900,           // 15 min
  BLOG_LIST: 300,           // 5 min
  FOOTER_CONFIG: 3600,      // 1 hour
} as const

export const CacheKeys = {
  shopSettings:  (subdomainOrHost: string) => `shop:settings:${subdomainOrHost}`,
  categories:    (shopId: string) => `shop:${shopId}:categories`,
  productsList:  (shopId: string, page: number, filters?: string) =>
                   `shop:${shopId}:products:${page}:${filters ?? 'all'}`,
  productDetail: (shopId: string, productId: string) =>
                   `shop:${shopId}:product:${productId}`,
  heroSlides:    (shopId: string) => `shop:${shopId}:hero`,
  stories:       (shopId: string) => `shop:${shopId}:stories`,
  blogPost:      (shopId: string, slug: string) =>
                   `shop:${shopId}:blog:${slug}`,
  blogList:      (shopId: string, page: number) =>
                   `shop:${shopId}:blog:list:${page}`,
  footerConfig:  (shopId: string) => `shop:${shopId}:footer`,
}
