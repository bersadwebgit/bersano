import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import StickyMobileCTA from '@/components/layout/StickyMobileCTA';
import AnnouncementBar from '@/components/marketing/AnnouncementBar';
import AnalyticsProvider from '@/components/marketing/AnalyticsProvider';
import { getMarketingGlobals } from '@/lib/marketing-globals';

/**
 * Unified platform marketing shell: announcement bar, header, analytics,
 * skip link, footer and sticky mobile CTA. Server component.
 * Single source of truth so home / (marketing) / blog don't duplicate chrome.
 */
export default async function MarketingShell({ children }: { children: React.ReactNode }) {
  const globals = await getMarketingGlobals();

  return (
    <div className="flex min-h-screen flex-col bg-mk-surface">
      <a href="#main-content" className="mk-skip-link">
        رفتن به محتوای اصلی
      </a>
      <AnnouncementBar config={globals.announcement} />
      <MarketingHeader ctaLabel={globals.globalCta.primaryLabel} />
      <main id="main-content" className="flex-grow">
        {children}
      </main>
      <MarketingFooter contact={globals.contact} social={globals.social} legal={globals.legal} />
      <StickyMobileCTA label={globals.globalCta.primaryLabel} href={globals.globalCta.primaryHref} />
      <AnalyticsProvider
        ga4Id={globals.tracking.ga4Id}
        gtmId={globals.tracking.gtmId}
        clarityId={globals.tracking.clarityId}
        consentRequired={globals.tracking.consentRequired}
      />
    </div>
  );
}
