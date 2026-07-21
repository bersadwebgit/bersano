/**
 * Platform marketing analytics event layer.
 * First-party, privacy-respecting: pushes to dataLayer / gtag when present.
 * No PII is ever sent — only funnel-stage metadata.
 */

export type MarketingEventName =
  | 'page_view'
  | 'hero_cta_click'
  | 'demo_click'
  | 'pricing_view'
  | 'plan_select'
  | 'register_start'
  | 'register_step_complete'
  | 'register_complete'
  | 'contact_submit'
  | 'blog_cta_click'
  | 'solution_cta_click'
  | 'comparison_cta_click'
  | 'faq_open'
  | 'video_play'
  | 'scroll_depth'
  | 'sticky_cta_click';

export interface MarketingEventParams {
  source_page?: string;
  cta_location?: string;
  campaign?: string;
  plan?: string;
  device_class?: 'mobile' | 'tablet' | 'desktop';
  value?: number | string;
  [key: string]: unknown;
}

const PII_KEYS = ['email', 'phone', 'name', 'password', 'otp', 'token'];

function stripPii(params: MarketingEventParams): MarketingEventParams {
  const clean: MarketingEventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (PII_KEYS.some((p) => k.toLowerCase().includes(p))) continue;
    clean[k] = v;
  }
  return clean;
}

export function deviceClass(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

let consentGranted = true; // updated by AnalyticsProvider based on config

export function setAnalyticsConsent(granted: boolean) {
  consentGranted = granted;
}

export function trackEvent(name: MarketingEventName, params: MarketingEventParams = {}) {
  if (typeof window === 'undefined') return;
  if (!consentGranted) return;

  const payload = stripPii({
    source_page: window.location?.pathname,
    device_class: deviceClass(),
    ...params,
  });

  try {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: name, ...payload });
    if (typeof w.gtag === 'function') {
      w.gtag('event', name, payload);
    }
  } catch {
    // analytics must never break the UI
  }
}
