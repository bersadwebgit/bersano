import { headers } from 'next/headers';
import { prisma } from './prisma';
import { cached } from './redis';
import { CacheKeys, TTL } from './cache-keys';

export function normalizeAndValidateHost(rawHost: string): string | null {
  if (!rawHost || typeof rawHost !== 'string') {
    return null;
  }

  let host = rawHost.trim().toLowerCase();

  // Remove protocol if present
  if (host.startsWith('http://')) {
    host = host.substring(7);
  } else if (host.startsWith('https://')) {
    host = host.substring(8);
  }

  // Remove port if present
  const portIndex = host.indexOf(':');
  if (portIndex !== -1) {
    host = host.substring(0, portIndex);
  }

  // Strip leading www.
  if (host.startsWith('www.')) {
    host = host.substring(4);
  }

  // Reject if empty
  if (!host) {
    return null;
  }

  // Reject IP address access (IPv4)
  const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(host)) {
    return null;
  }

  // Reject IPv6 address access (e.g. [::1])
  if (host.startsWith('[') && host.endsWith(']')) {
    return null;
  }

  // Reject numeric-only fragments or hosts
  if (/^\d+$/.test(host)) {
    return null;
  }

  // Reject unsafe characters (only allow alphanumeric, dots, hyphens, underscores)
  const safeHostRegex = /^[a-z0-9._-]+$/;
  if (!safeHostRegex.test(host)) {
    return null;
  }

  // Reject main domains and landing pages
  const mainDomains = ['bersana.ir', 'localhost', 'local', 'test', 'dev', 'lan'];
  if (mainDomains.includes(host)) {
    return null;
  }

  return host;
}

export async function getTenantShop(requestHost?: string, includeUnapproved = false) {
  let host = requestHost;
  let pathname = '';
  
  try {
    const headersList = await headers();
    if (!host) {
      host = headersList.get('x-forwarded-host') || headersList.get('host') || ''; // e.g. shop1.localhost:3000
    }
    pathname = headersList.get('x-pathname') || '';
  } catch (err) {
    // Fallback if headers() cannot be read (e.g., in some static generation contexts)
    if (!host) {
      host = 'localhost';
    }
  }

  // Bypass tenant resolution for static assets, next internal paths, and uploads
  if (pathname) {
    const isStaticOrInternal = 
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/static/') ||
      pathname.startsWith('/uploads/') ||
      pathname === '/uploads' ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml';
    if (isStaticOrInternal) {
      return null;
    }
  }

  // Normalize and validate host
  const normalizedHost = normalizeAndValidateHost(host);
  if (!normalizedHost) {
    return null;
  }

  const domainParts = normalizedHost.split('.');

  let subdomain: string | null = null;

  // Check if it is a local domain or single domain (like localhost or local)
  const localTLDs = ['localhost', 'local', 'test', 'dev', 'lan'];
  const tld = domainParts[domainParts.length - 1].toLowerCase();
  const isLocal = localTLDs.includes(tld) || normalizedHost === 'localhost';

  if (isLocal) {
    // For local domains:
    // If the host is exactly "localhost" or "local" or any of localTLDs (without subdomain, e.g. "localhost" or "local:3000")
    // then there is no subdomain.
    if (domainParts.length > 1 && !localTLDs.includes(normalizedHost)) {
      subdomain = domainParts[0];
      if (subdomain === 'www' && domainParts.length > 2) {
        subdomain = domainParts[1];
      }
    }
  } else {
    // For production domains:
    // If parts are like shop1.platform.com, subdomain is shop1.
    if (domainParts.length >= 3) {
      subdomain = domainParts[0];
      if (subdomain === 'www') {
        if (domainParts.length >= 4) {
          subdomain = domainParts[1];
        } else {
          subdomain = null; // www.bersana.ir has no subdomain
        }
      }
    }
  }

  // If there's no subdomain and it's a local domain, we don't return any shop
  if (isLocal && !subdomain) {
    return null;
  }

  // Try to find by customDomain first, then by subdomain
  const cacheKey = CacheKeys.shopSettings(subdomain ?? normalizedHost);
  let shopSettings: any = null;

  try {
    shopSettings = await cached(
      cacheKey,
      TTL.SHOP_SETTINGS,
      async () => {
        try {
          const res = await prisma.shopSettings.findFirst({
            where: {
              OR: [
                { customDomain: normalizedHost },
                { subdomain: subdomain || '' }
              ]
            },
            allowCrossTenant: true
          } as any);
          return res || { __isNotFound: true };
        } catch (err: any) {
          console.warn(`[WARN] [getTenantShop]: Standard query failed. Attempting fallback safe query. Error:`, err.message);
          
          // Check if error is P2022 (missing column) or other schema issue
          if (err.code === 'P2022' || err.message?.includes('column') || err.message?.includes('relation')) {
            try {
              // Select only core stable columns that are guaranteed to exist in basic schema
              const stableSelect = {
                id: true,
                shopId: true,
                shopName: true,
                subdomain: true,
                customDomain: true,
                description: true,
                logoUrl: true,
                faviconUrl: true,
                themeColor: true,
                currency: true,
                language: true,
                contactEmail: true,
                contactPhone: true,
                address: true,
                productType: true,
                isActive: true,
                isApproved: true,
                wholesaleEnabled: true,
                createdAt: true,
                updatedAt: true,
              };

              const fallbackSettings = await prisma.shopSettings.findFirst({
                where: {
                  OR: [
                    { customDomain: normalizedHost },
                    { subdomain: subdomain || '' }
                  ]
                },
                select: stableSelect,
                allowCrossTenant: true
              } as any);

              if (fallbackSettings) {
                // Return a reconstructed object filled with default values for missing/outdated columns
                return {
                  ...fallbackSettings,
                  telegramIntegrationToken: '',
                  telegramChatId: '',
                  telegramOrderNotificationsEnabled: false,
                  telegramNotificationStatuses: '["new_order","status_change"]',
                  baleIntegrationToken: '',
                  baleChatId: '',
                  baleOrderNotificationsEnabled: false,
                  baleNotificationStatuses: '["new_order","status_change"]',
                  googleAnalyticsId: '',
                  googleTagManagerId: '',
                  microsoftClarityId: '',
                  mahakEnabled: false,
                  aiMemory: '{}',
                  chatSettings: '{"enabled":true}',
                  smsConfig: '{"enabled":false}',
                };
              }
              return { __isNotFound: true };
            } catch (fallbackErr: any) {
              console.error(`[ERROR] [getTenantShop]: Fallback query also failed:`, fallbackErr.message);
            }
          }
          throw err; // Rethrow to let outer catch block return the mock safe object
        }
      }
    );
  } catch (err: any) {
    console.error(`[CRITICAL] [getTenantShop]: Unrecoverable DB failure. Returning mock safe config to prevent server crash. Error:`, err.message);
    
    // DB completely unreachable or severe crash -> return a hardcoded mock safe object
    shopSettings = {
      id: 'mock-shop-id',
      shopId: subdomain || 'mock-shop',
      shopName: 'فروشگاه من (حالت بازیابی)',
      subdomain: subdomain || 'localhost',
      customDomain: normalizedHost,
      description: 'این فروشگاه در حال حاضر به صورت موقت در حالت بازیابی امن قرار دارد.',
      themeColor: '#2563eb',
      currency: 'IRT',
      language: 'fa',
      isActive: true,
      isApproved: true,
      telegramIntegrationToken: '',
      telegramChatId: '',
      telegramOrderNotificationsEnabled: false,
      telegramNotificationStatuses: '["new_order","status_change"]',
    };
  }

  if (shopSettings && (shopSettings as any).__isNotFound) {
    return null;
  }

  if (shopSettings && !includeUnapproved && (!shopSettings.isApproved || !shopSettings.isActive)) {
    return null; // Or throw a specific error to show "Store is inactive/pending approval"
  }

  return shopSettings;
}
