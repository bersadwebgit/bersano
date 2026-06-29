import { MetadataRoute } from 'next';
import { getTenantShop } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  let host = '';
  let protocol = 'https';

  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    host = headersList.get('host') || '';
    protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  } catch (error) {
    console.error('Error reading headers in robots:', error);
  }

  const baseUrl = `${protocol}://${host || 'localhost:3000'}`;

  // Fetch current tenant shop
  let shop = null;
  try {
    shop = await getTenantShop(host || undefined, false);
  } catch (error) {
    console.error('Error fetching tenant shop in robots:', error);
  }

  // If shop has disabled robots.txt, we disallow all crawlers (standard SEO practice to disable indexing)
  if (shop && !shop.robotsEnabled) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      }
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/shop',
        '/product/',
        '/category/',
        '/blog/',
        '/shoppable/',
        '/login',
        '/register',
      ],
      disallow: [
        '/admin/',
        '/super-admin/',
        '/profile/',
        '/checkout/',
        '/cart',
        '/api/',
      ],
    },
    // Only include sitemap if sitemap is enabled
    sitemap: (shop && !shop.sitemapEnabled) ? undefined : `${baseUrl}/sitemap.xml`,
  };
}
