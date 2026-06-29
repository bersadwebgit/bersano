import { headers } from 'next/headers';
import { prisma } from './prisma';
import { cached } from './redis';
import { CacheKeys, TTL } from './cache-keys';

export async function getTenantShop(requestHost?: string, includeUnapproved = false) {
  let host = requestHost;
  
  if (!host) {
    const headersList = await headers();
    host = headersList.get('host') || ''; // e.g. shop1.localhost:3000
  }

  // Extract subdomain robustly
  const hostParts = host.split(':');
  const domainAndSubdomains = hostParts[0];
  const domainParts = domainAndSubdomains.split('.');

  let subdomain = null;

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
  const shopSettings = await cached(
    cacheKey,
    TTL.SHOP_SETTINGS,
    () => prisma.shopSettings.findFirst({
      where: {
        OR: [
          { customDomain: host },
          { subdomain: subdomain || '' }
        ]
      },
      allowCrossTenant: true
    } as any)
  );

  if (shopSettings && !includeUnapproved && (!shopSettings.isApproved || !shopSettings.isActive)) {
    return null; // Or throw a specific error to show "Store is inactive/pending approval"
  }

  return shopSettings;
}
