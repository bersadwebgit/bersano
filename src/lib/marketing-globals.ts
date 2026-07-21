import { prisma } from '@/lib/prisma';

/**
 * Marketing global singletons. Stored as JSON in the key/value SystemSetting table
 * (hybrid CMS: globals live here, structured page content lives in MarketingPage/Section).
 *
 * All reads are resilient: on any DB failure or malformed JSON, honest defaults are returned
 * so the public site never crashes.
 */

export interface AnnouncementBarConfig {
  enabled: boolean;
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone: 'primary' | 'neutral' | 'success';
}

export interface ContactInfoConfig {
  phone: string;
  email: string;
  address: string;
  hours: string;
  supportUrl: string;
  mapEmbedUrl: string;
  responseSla: string;
}

export interface SocialLinksConfig {
  instagram: string;
  telegram: string;
  linkedin: string;
  x: string;
  youtube: string;
}

export interface LegalInfoConfig {
  companyName: string;
  enamadUrl: string;
  samandehiUrl: string;
  licenseNote: string;
}

export interface TrackingConfig {
  ga4Id: string;
  gtmId: string;
  clarityId: string;
  consentRequired: boolean;
}

export interface GlobalCtaConfig {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface MarketingGlobals {
  announcement: AnnouncementBarConfig;
  contact: ContactInfoConfig;
  social: SocialLinksConfig;
  legal: LegalInfoConfig;
  tracking: TrackingConfig;
  globalCta: GlobalCtaConfig;
}

export const MK_GLOBAL_KEYS = {
  announcement: 'mk_announcement',
  contact: 'mk_contact',
  social: 'mk_social',
  legal: 'mk_legal',
  tracking: 'mk_tracking',
  globalCta: 'mk_global_cta',
} as const;

const DEFAULTS: MarketingGlobals = {
  announcement: {
    enabled: false,
    text: '',
    ctaLabel: '',
    ctaHref: '',
    tone: 'primary',
  },
  contact: {
    // Honest defaults: no fabricated office address / phone published.
    phone: '',
    email: 'support@bersana.ir',
    address: '',
    hours: 'شنبه تا پنج‌شنبه، ۹ تا ۱۸',
    supportUrl: '/contact',
    mapEmbedUrl: '',
    responseSla: 'پاسخ‌گویی تیکت‌ها در ساعات کاری',
  },
  social: {
    instagram: '',
    telegram: '',
    linkedin: '',
    x: '',
    youtube: '',
  },
  legal: {
    companyName: 'برسانا',
    enamadUrl: '',
    samandehiUrl: '',
    licenseNote: '',
  },
  tracking: {
    ga4Id: '',
    gtmId: '',
    clarityId: '',
    consentRequired: false,
  },
  globalCta: {
    primaryLabel: 'ساخت فروشگاه رایگان',
    primaryHref: '/register',
    secondaryLabel: 'مشاهده دمو',
    secondaryHref: '/demo',
  },
};

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

export async function getMarketingGlobals(): Promise<MarketingGlobals> {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: Object.values(MK_GLOBAL_KEYS) } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      announcement: parse(map.get(MK_GLOBAL_KEYS.announcement), DEFAULTS.announcement),
      contact: parse(map.get(MK_GLOBAL_KEYS.contact), DEFAULTS.contact),
      social: parse(map.get(MK_GLOBAL_KEYS.social), DEFAULTS.social),
      legal: parse(map.get(MK_GLOBAL_KEYS.legal), DEFAULTS.legal),
      tracking: parse(map.get(MK_GLOBAL_KEYS.tracking), DEFAULTS.tracking),
      globalCta: parse(map.get(MK_GLOBAL_KEYS.globalCta), DEFAULTS.globalCta),
    };
  } catch (error) {
    console.error('[marketing-globals] read failed, using defaults', error);
    return DEFAULTS;
  }
}

export function getMarketingGlobalsDefaults(): MarketingGlobals {
  return DEFAULTS;
}
