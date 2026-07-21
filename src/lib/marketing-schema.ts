import { SITE_URL, SITE_NAME } from './marketing-seo';

/**
 * Schema.org JSON-LD builders for the marketing site.
 * Only emit schema that matches visible content (no fake ratings/reviews/prices).
 */

export function organizationSchema(opts?: { logo?: string; sameAs?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    ...(opts?.logo ? { logo: opts.logo } : {}),
    ...(opts?.sameAs && opts.sameAs.length ? { sameAs: opts.sameAs.filter(Boolean) } : {}),
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'fa-IR',
  };
}

/**
 * SoftwareApplication for the platform. Only include offers when real, published prices exist.
 */
export function softwareApplicationSchema(opts?: {
  description?: string;
  hasFreeTier?: boolean;
}) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    inLanguage: 'fa-IR',
  };
  if (opts?.description) schema.description = opts.description;
  if (opts?.hasFreeTier) {
    // Represent only the honest, verifiable fact: a free tier exists.
    schema.offers = {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IRR',
    };
  }
  return schema;
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqSchema(items: Array<{ q: string; a: string }>) {
  if (!items?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function contactPageSchema(opts?: { email?: string; phone?: string }) {
  const contactPoint: Record<string, any> = { '@type': 'ContactPoint', contactType: 'customer support' };
  if (opts?.email) contactPoint.email = opts.email;
  if (opts?.phone) contactPoint.telephone = opts.phone;
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `تماس با ${SITE_NAME}`,
    url: `${SITE_URL}/contact`,
    ...(opts?.email || opts?.phone
      ? { mainEntity: { '@type': 'Organization', name: SITE_NAME, contactPoint } }
      : {}),
  };
}

export function aboutPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `درباره ${SITE_NAME}`,
    url: `${SITE_URL}/about`,
  };
}
