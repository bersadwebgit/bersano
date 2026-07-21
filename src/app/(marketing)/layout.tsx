import { getTenantShop } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';

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

  return <MarketingShell>{children}</MarketingShell>;
}
