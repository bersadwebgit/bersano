import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { getTenantShop } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home, Store } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { parseFooterConfig } from '@/types/footer';
import WholesaleRequestForm from '@/components/WholesaleRequestForm';

export async function generateMetadata() {
  const shop = await getTenantShop(undefined, true);
  if (!shop) return { title: 'صفحه پیدا نشد' };

  return {
    title: `درخواست همکاری عمده - ${shop.shopName}`,
    description: `فرم درخواست عضویت در پنل همکاران عمده‌فروش فروشگاه ${shop.shopName}`,
  };
}

export default async function WholesaleRequestPage() {
  const shop = await getTenantShop(undefined, true);

  if (!shop) {
    return notFound();
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

      <main className="flex-grow container mx-auto max-w-2xl px-4 py-8 md:py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold">
          <Link href="/" className="hover:text-violet-600 transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            صفحه اصلی
          </Link>
          <ChevronLeft className="w-3 h-3" />
          <span className="text-slate-800 dark:text-slate-200 font-black">درخواست همکاری عمده</span>
        </div>

        {/* Content Container */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 md:p-8 flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl text-white shadow-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: shop.themeColor }}
            >
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">درخواست همکاری عمده (B2B)</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">فرم عضویت در باشگاه همکاران و خریداران عمده فروشگاه {shop.shopName}</p>
            </div>
          </div>

          {/* Form */}
          <WholesaleRequestForm themeColor={shop.themeColor} />
        </div>
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />
      <BottomNav />
    </div>
  );
}
