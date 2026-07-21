import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Eye } from 'lucide-react';
import MarketingShell from '@/components/marketing/MarketingShell';
import SectionRenderer from '@/components/marketing/SectionRenderer';
import { getPageForPreview, verifyPreviewToken } from '@/lib/marketing-pages';
import { getMarketingPricingPlans } from '@/lib/marketing-cms';
import { noindexMetadata } from '@/lib/marketing-seo';
import type { PricingPlanView } from '@/components/marketing/sections/PricingTable';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return noindexMetadata(`پیش‌نمایش: ${slug}`);
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token || !(await verifyPreviewToken(token, slug))) {
    return notFound();
  }

  const page = await getPageForPreview(slug);
  if (!page) return notFound();

  const plans = await getMarketingPricingPlans();
  const pricingPlans: PricingPlanView[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    desc: p.desc,
    price: p.price,
    period: p.period,
    features: p.features,
    badge: p.badge,
    ctaText: p.ctaText,
    ctaLink: p.ctaLink,
    highlighted: p.highlighted ?? p.id === 'professional',
  }));

  return (
    <MarketingShell>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-[11px] font-black text-amber-950">
        <Eye className="h-4 w-4" aria-hidden="true" />
        حالت پیش‌نمایش — این نسخه ممکن است منتشر نشده باشد (وضعیت: {page.status})
      </div>
      <SectionRenderer sections={page.sections} pricingPlans={pricingPlans} />
    </MarketingShell>
  );
}
