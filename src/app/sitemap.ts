import { MetadataRoute } from 'next';
import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let host = '';
  let protocol = 'https';

  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    host = headersList.get('host') || '';
    protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  } catch (error) {
    console.error('Error reading headers in sitemap:', error);
  }

  const baseUrl = `${protocol}://${host || 'localhost:3000'}`;

  // 1. Fetch current tenant shop
  let shop = null;
  try {
    shop = await getTenantShop(host || undefined, false);
  } catch (error) {
    console.error('Error fetching tenant shop in sitemap:', error);
  }

  // If the shop has disabled sitemap, return an empty list
  if (shop && !shop.sitemapEnabled) {
    return [];
  }

  // --- CASE A: MAIN SAAS PLATFORM SITEMAP ---
  if (!shop) {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/register`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    ];
  }

  // --- CASE B: TENANT STORE SITEMAP ---
  const shopId = shop.shopId;
  const sitemapItems: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Helper to fetch the latest updated date for shop-wide fallbacks
  const getLatestShopUpdate = async (): Promise<Date> => {
    try {
      const [latestProduct, latestPost] = await Promise.all([
        prisma.product.findFirst({
          where: { shopId, isActive: true },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
        prisma.blogPost.findFirst({
          where: { shopId, status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

      const dates = [
        shop.updatedAt,
        latestProduct?.updatedAt,
        latestPost?.updatedAt,
      ].filter((d): d is Date => !!d);

      if (dates.length > 0) {
        return new Date(Math.max(...dates.map(d => d.getTime())));
      }
    } catch (e) {
      console.error('Error getting latest shop update date:', e);
    }
    return now;
  };

  const latestShopUpdate = await getLatestShopUpdate();

  // 1. Homepage (/)
  sitemapItems.push({
    url: baseUrl,
    lastModified: latestShopUpdate,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // 2. Shop Listing Page (/shop)
  sitemapItems.push({
    url: `${baseUrl}/shop`,
    lastModified: latestShopUpdate,
    changeFrequency: 'daily',
    priority: 0.9,
  });

  // 3. Blog Listing Page (/blog)
  sitemapItems.push({
    url: `${baseUrl}/blog`,
    lastModified: latestShopUpdate,
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  // 4. Products (/product/[id])
  try {
    const products = await prisma.product.findMany({
      where: {
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    products.forEach((product) => {
      sitemapItems.push({
        url: `${baseUrl}/product/${encodeURIComponent(product.id)}`,
        lastModified: product.updatedAt,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error('Error adding products to sitemap:', error);
  }

  // 5. Categories (/category/[slug])
  try {
    const categories = await prisma.category.findMany({
      where: {
        shopId,
        isActive: true,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    categories.forEach((category) => {
      sitemapItems.push({
        url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
        lastModified: category.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error('Error adding categories to sitemap:', error);
  }

  // 6. Blog Posts (/blog/[slug])
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        shopId,
        status: 'published',
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    posts.forEach((post) => {
      sitemapItems.push({
        url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
        lastModified: post.updatedAt || post.publishedAt || now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('Error adding blog posts to sitemap:', error);
  }

  // 7. Shoppable Product Sets (/shoppable/[slug])
  if (shop.productSetsEnabled) {
    try {
      const sets = await prisma.productSet.findMany({
        where: {
          shopId,
          isActive: true,
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      sets.forEach((set) => {
        sitemapItems.push({
          url: `${baseUrl}/shoppable/${encodeURIComponent(set.slug)}`,
          lastModified: set.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      });
    } catch (error) {
      console.error('Error adding shoppable sets to sitemap:', error);
    }
  }

  return sitemapItems;
}
