import type { Metadata } from 'next';

/**
 * Shared SEO/metadata builder for the platform marketing site.
 * Produces unique title/description, canonical, OpenGraph and Twitter data consistently.
 * Base URL is the brand domain; individual pages pass their own path.
 */

export const SITE_URL = 'https://bersana.ir';
export const SITE_NAME = 'برسانا';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface BuildMetadataInput {
  title: string;
  description: string;
  /** Absolute path beginning with '/', e.g. '/pricing'. Omit for home ('/'). */
  path?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
  /** Fully-formed title already includes brand suffix; skip auto-suffix when true */
  rawTitle?: boolean;
  keywords?: string[];
}

function absoluteUrl(path?: string): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function withBrand(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

export function buildMarketingMetadata(input: BuildMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const title = input.rawTitle ? input.title : withBrand(input.title);
  const image = input.image || DEFAULT_OG_IMAGE;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: url,
    },
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: input.type || 'website',
      siteName: SITE_NAME,
      title,
      description: input.description,
      url,
      locale: 'fa_IR',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
      images: [image],
    },
  };
}

/** Convenience for preview / admin routes that must never be indexed. */
export function noindexMetadata(title: string): Metadata {
  return {
    title: withBrand(title),
    robots: { index: false, follow: false },
  };
}
