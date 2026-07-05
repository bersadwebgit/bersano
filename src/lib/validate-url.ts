import dns from 'dns';
import net from 'net';

// Strict allowlist of trusted domains for externally fetched assets (images, etc.)
const TRUSTED_DOMAINS = new Set([
  'images.pexels.com',
  'pexels.com',
  'api.pexels.com',
  'upload.wikimedia.org',
  'wikimedia.org',
  'commons.wikimedia.org',
  'images.unsplash.com',
  'unsplash.com',
  'api.unsplash.com',
  'shop-builder.ir',
  'bersana.ir',
]);

// Helper to check if an IPv4 address is private/reserved
function isPrivateIPv4(ipStr: string): boolean {
  const parts = ipStr.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [o1, o2, o3, o4] = parts;

  // 127.0.0.0/8 (Loopback)
  if (o1 === 127) return true;

  // 10.0.0.0/8 (Private)
  if (o1 === 10) return true;

  // 172.16.0.0/12 (Private)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (o1 === 192 && o2 === 168) return true;

  // 169.254.0.0/16 (Link-Local)
  if (o1 === 169 && o2 === 254) return true;

  // 0.0.0.0/8 (Current network)
  if (o1 === 0) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (o1 === 192 && o2 === 0 && o3 === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (o1 === 192 && o2 === 0 && o3 === 2) return true;

  // 198.18.0.0/15 (Benchmark testing)
  if (o1 === 198 && o2 >= 18 && o2 <= 19) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (o1 === 198 && o2 === 51 && o3 === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (o1 === 203 && o2 === 0 && o3 === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (o1 >= 224 && o1 <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (o1 >= 240) return true;

  return false;
}

// Helper to check if an IPv6 address is private/reserved
function isPrivateIPv6(ipStr: string): boolean {
  const normalized = ipStr.toLowerCase().trim();

  // ::1 (Loopback)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // :: (Unspecified)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // fc00::/7 (Unique Local)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 (Link-Local)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;

  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = ipStr.substring(ipStr.lastIndexOf(':') + 1);
    return isPrivateIPv4(ipv4Part);
  }

  return false;
}

/**
 * Resolves a hostname to an IP address asynchronously.
 */
async function resolveDns(hostname: string): Promise<string[]> {
  return new Promise((resolve) => {
    dns.resolve(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        // Fallback to lookup
        dns.lookup(hostname, { all: true }, (lookupErr, results) => {
          if (lookupErr || !results) {
            resolve([]);
          } else {
            resolve(results.map((r) => r.address));
          }
        });
      } else {
        resolve(addresses);
      }
    });
  });
}

/**
 * Hardened URL validation utility to prevent SSRF, XSS, and protocol-based attacks.
 * Validates both absolute and relative URLs, resolves DNS, and blocks private IP ranges.
 */
export async function validateUrl(urlStr: string): Promise<boolean> {
  if (!urlStr || typeof urlStr !== 'string') return false;

  const trimmed = urlStr.trim();

  // Allow relative uploads paths and general relative paths
  if (trimmed.startsWith('/uploads/') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    return true;
  }

  // Allow safe base64 images (EXCLUDING SVG data URLs)
  if (trimmed.startsWith('data:image/')) {
    const isSafeDataImage = trimmed.startsWith('data:image/png;base64,') ||
                            trimmed.startsWith('data:image/jpeg;base64,') ||
                            trimmed.startsWith('data:image/webp;base64,') ||
                            trimmed.startsWith('data:image/gif;base64,');
    return isSafeDataImage; // data:image/svg+xml is completely disallowed
  }

  // Block javascript: and other suspicious protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('gopher:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    
    // Only allow http: and https: protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check trusted domains allowlist
    let isTrustedDomain = false;
    for (const domain of TRUSTED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        isTrustedDomain = true;
        break;
      }
    }

    // In production, we strictly require trusted domains or resolve DNS to block private IPs
    if (process.env.NODE_ENV === 'production' && !isTrustedDomain) {
      return false;
    }

    // Resolve DNS and block private/local/reserved IP ranges
    const ips = await resolveDns(hostname);
    if (ips.length === 0) {
      return false; // DNS resolution failed
    }

    for (const ip of ips) {
      if (net.isIPv4(ip)) {
        if (isPrivateIPv4(ip)) return false;
      } else if (net.isIPv6(ip)) {
        if (isPrivateIPv6(ip)) return false;
      } else {
        return false; // Unknown IP format
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe fetch wrapper that prevents SSRF by validating the URL and re-checking after redirects.
 */
export async function safeFetch(
  urlStr: string,
  options: RequestInit = {},
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = urlStr;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const isValid = await validateUrl(currentUrl);
    if (!isValid) {
      throw new Error(`SSRF Blocked: Unsafe URL requested: ${currentUrl}`);
    }

    // Perform the fetch with manual redirect handling to intercept and validate redirect targets
    const response = await fetch(currentUrl, {
      ...options,
      redirect: 'manual',
    });

    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        return response; // No redirect location header, return response as is
      }

      // Resolve relative redirect URLs against the current URL
      const resolvedLocation = new URL(location, currentUrl).toString();
      currentUrl = resolvedLocation;
      redirectCount++;
      continue;
    }

    return response;
  }

  throw new Error('SSRF Blocked: Too many redirects');
}

/**
 * Sanitizes a URL string. Returns a safe URL or null if invalid/unsafe.
 */
export async function sanitizeUrl(urlStr: string): Promise<string | null> {
  if (await validateUrl(urlStr)) {
    return urlStr.trim();
  }
  return null;
}
