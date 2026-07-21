import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { getTenantShop } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home, HelpCircle, ChevronDown, ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { parseFooterConfig } from '@/types/footer';
import MarketingShell from '@/components/marketing/MarketingShell';
import PlatformFaq from '@/components/marketing/faq/PlatformFaq';
import { buildMarketingMetadata } from '@/lib/marketing-seo';

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop(undefined, true);
  if (!shop) {
    return buildMarketingMetadata({
      title: 'سوالات متداول درباره فروشگاه‌ساز برسانا',
      description:
        'پاسخ پرسش‌های رایج درباره ساخت فروشگاه اینترنتی، هوش مصنوعی و RAG، تعرفه‌ها، دامنه اختصاصی، پرداخت و پشتیبانی در برسانا.',
      path: '/faq',
    });
  }

  return {
    title: `پاسخ به پرسش‌های متداول - ${shop.shopName}`,
    description: shop.description || '',
  };
}

interface FaqItem {
  question: string;
  answer: string;
}

export default async function FaqPage() {
  const shop = await getTenantShop(undefined, true);

  if (!shop) {
    return (
      <MarketingShell>
        <PlatformFaq />
      </MarketingShell>
    );
  }

  // Parse FAQs from shop settings
  let faqs: FaqItem[] = [];
  try {
    if (shop.faqsConfig) {
      faqs = JSON.parse(shop.faqsConfig);
    }
  } catch (e) {
    console.error('Error parsing faqsConfig:', e);
  }

  const [categories, menuItems] = await Promise.all([
    prisma.category.findMany({
      where: { shopId: shop.shopId, isActive: true },
      include: {
        children: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.menuItem.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { order: 'asc' }
    })
  ]);

  const headerConfig = shop.headerConfig ? JSON.parse(shop.headerConfig) : undefined;
  const footerConfig = parseFooterConfig(shop.footerConfig);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col">
      <Header 
        shopName={shop.shopName} 
        logoUrl={shop.logoUrl} 
        menuItems={menuItems.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
          color: item.color,
          icon: item.icon
        }))}
        categories={categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          parentId: cat.parentId,
          children: cat.children?.map(child => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            parentId: child.parentId
          }))
        }))}
        config={headerConfig}
      />

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold">
          <Link href="/" className="hover:text-violet-600 transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            صفحه اصلی
          </Link>
          <ChevronLeft className="w-3 h-3" />
          <span className="text-slate-800 dark:text-slate-200 font-black">پرسش‌های متداول</span>
        </div>

        {/* Content Container */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 md:p-8 flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl text-white shadow-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: shop.themeColor }}
            >
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">پاسخ به پرسش‌های متداول</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">سوالات رایج مشتریان فروشگاه {shop.shopName}</p>
            </div>
          </div>

          {/* FAQs List */}
          {faqs && faqs.length > 0 ? (
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <details 
                  key={index} 
                  className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none outline-none">
                    <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 group-open:text-violet-600 dark:group-open:text-violet-400 transition-colors">
                      {faq.question}
                    </h3>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-300 shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 pt-1 border-t border-slate-50 dark:border-slate-800/40 text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center text-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">پرسش متداولی یافت نشد</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">هنوز پرسش و پاسخی برای این فروشگاه ثبت نشده است.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />
      <BottomNav />
    </div>
  );
}
