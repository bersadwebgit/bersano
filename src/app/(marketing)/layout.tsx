import { getTenantShop } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import StickyMobileCTA from '@/components/layout/StickyMobileCTA';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shop = await getTenantShop(undefined, true);
  
  // If we are currently resolving a tenant subdomain/domain on this request,
  // we do NOT render the central platform marketing layout. We trigger a not-found
  // to avoid overlapping tenant routes with marketing pages.
  if (shop) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <MarketingHeader />
      <main className="flex-grow">{children}</main>
      <MarketingFooter />
      <StickyMobileCTA />
    </div>
  );
}
