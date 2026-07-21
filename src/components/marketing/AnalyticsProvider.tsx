'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { trackEvent, setAnalyticsConsent, type MarketingEventName } from '@/lib/analytics';

interface AnalyticsProviderProps {
  ga4Id?: string;
  gtmId?: string;
  clarityId?: string;
  consentRequired?: boolean;
}

const CONSENT_COOKIE = 'mk_consent';

function readConsentCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${CONSENT_COOKIE}=1`);
}

/**
 * Platform-safe analytics for the marketing site.
 * - Injects GA4/GTM/Clarity only when configured (and consent is granted, if required).
 * - Fires page_view on client navigations.
 * - Delegates CTA click + scroll-depth tracking (data-analytics-event attribute).
 */
export default function AnalyticsProvider({
  ga4Id,
  gtmId,
  clarityId,
  consentRequired = false,
}: AnalyticsProviderProps) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<boolean>(!consentRequired);
  const scrollFired = useRef<Set<number>>(new Set());
  const lastPath = useRef<string>('');

  // Resolve consent state from cookie on mount.
  useEffect(() => {
    if (!consentRequired) {
      setAnalyticsConsent(true);
      setConsent(true);
      return;
    }
    const has = readConsentCookie();
    setAnalyticsConsent(has);
    setConsent(has);
  }, [consentRequired]);

  // page_view on route change.
  useEffect(() => {
    if (!consent) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname || '';
    trackEvent('page_view', { source_page: pathname || '/' });
  }, [pathname, consent]);

  // Delegated click tracking for any element carrying data-analytics-event.
  useEffect(() => {
    if (!consent) return;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('[data-analytics-event]') as HTMLElement | null;
      if (!target) return;
      const name = target.getAttribute('data-analytics-event') as MarketingEventName | null;
      if (!name) return;
      trackEvent(name, {
        cta_location: target.getAttribute('data-analytics-location') || undefined,
        plan: target.getAttribute('data-analytics-plan') || undefined,
      });
    };
    document.addEventListener('click', handler, { capture: true });
    return () => document.removeEventListener('click', handler, { capture: true } as any);
  }, [consent]);

  // Scroll depth (25/50/75/100).
  useEffect(() => {
    if (!consent) return;
    scrollFired.current = new Set();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = (doc.scrollTop + window.innerHeight) / doc.scrollHeight;
      [25, 50, 75, 100].forEach((mark) => {
        if (scrolled * 100 >= mark && !scrollFired.current.has(mark)) {
          scrollFired.current.add(mark);
          trackEvent('scroll_depth', { value: mark });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [consent, pathname]);

  const acceptConsent = () => {
    document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setAnalyticsConsent(true);
    setConsent(true);
  };

  const enabled = consent && (!!ga4Id || !!gtmId || !!clarityId);

  return (
    <>
      {enabled && gtmId && (
        <Script id="mk-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      {enabled && ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="mk-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {enabled && clarityId && (
        <Script id="mk-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}

      {consentRequired && !consent && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="اطلاع‌رسانی حریم خصوصی"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-mk-line bg-mk-surface p-4 shadow-[var(--mk-shadow-lg)] sm:inset-x-auto sm:right-4"
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold leading-relaxed text-mk-muted">
              برای بهبود تجربه شما از ابزارهای تحلیلی استفاده می‌کنیم. هیچ اطلاعات شخصی حساسی ذخیره نمی‌شود.
            </p>
            <button
              type="button"
              onClick={acceptConsent}
              className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-primary-700"
            >
              موافقم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
