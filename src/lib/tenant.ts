import { headers } from 'next/headers';
import { prisma } from './prisma';
import { cached } from './redis';
import { CacheKeys, TTL } from './cache-keys';

export async function getTenantShop(requestHost?: string, includeUnapproved = false) {
  let host = requestHost;
  
  try {
    if (!host) {
      const headersList = await headers();
      host = headersList.get('host') || ''; // e.g. shop1.localhost:3000
    }
  } catch (err) {
    // Fallback if headers() cannot be read (e.g., in some static generation contexts)
    host = 'localhost';
  }

  // Extract subdomain robustly
  const hostParts = host.split(':');
  const domainAndSubdomains = hostParts[0];
  const domainParts = domainAndSubdomains.split('.');

  let subdomain: string | null = null;

  // Check if it is a local domain or single domain (like localhost or local)
  const localTLDs = ['localhost', 'local', 'test', 'dev', 'lan'];
  const tld = domainParts[domainParts.length - 1].toLowerCase();
  const isLocal = localTLDs.includes(tld) || domainAndSubdomains.toLowerCase() === 'localhost';

  if (isLocal) {
    // For local domains:
    // If the host is exactly "localhost" or "local" or any of localTLDs (without subdomain, e.g. "localhost" or "local:3000")
    // then there is no subdomain.
    if (domainParts.length > 1 && !localTLDs.includes(domainAndSubdomains.toLowerCase())) {
      subdomain = domainParts[0];
    }
  } else {
    // For production domains:
    // If parts are like shop1.platform.com, subdomain is shop1.
    if (domainParts.length >= 3) {
      subdomain = domainParts[0];
    }
  }

  // If there's no subdomain and it's a local domain, we don't return any shop
  if (isLocal && !subdomain) {
    return null;
  }

  // Try to find by customDomain first, then by subdomain
  const cacheKey = CacheKeys.shopSettings(subdomain ?? host);
  let shopSettings: any = null;

  try {
    shopSettings = await cached(
      cacheKey,
      TTL.SHOP_SETTINGS,
      async () => {
        try {
          return await prisma.shopSettings.findFirst({
            where: {
              OR: [
                { customDomain: host },
                { subdomain: subdomain || '' }
              ]
            },
            allowCrossTenant: true
          } as any);
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
                    { customDomain: host },
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
      customDomain: host,
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

  if (shopSettings && !includeUnapproved && (!shopSettings.isApproved || !shopSettings.isActive)) {
    return null; // Or throw a specific error to show "Store is inactive/pending approval"
  }

  return shopSettings;
}
