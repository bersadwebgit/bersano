import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import CartClient from './CartClient';

export default async function CartPage() {
  const shop = await getTenantShop();
  if (!shop) return notFound();

  const [categories, menuItems, settings] = await Promise.all([
    prisma.category.findMany({
      where: { shopId: shop.shopId, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.menuItem.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { order: 'asc' }
    }),
    prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { headerConfig: true }
    })
  ]);

  let headerConfig = undefined;
  const footerConfig = await getFooterConfig();
  if (settings?.headerConfig) {
    try { headerConfig = JSON.parse(settings.headerConfig); } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-40 md:pb-0">
      <Header 
        shopName={shop.shopName} 
        logoUrl={shop.logoUrl} 
        menuItems={menuItems.map(item => ({
          id: item.id, title: item.title, url: item.url, color: item.color, icon: item.icon
        }))}
        categories={categories.map(cat => ({
          id: cat.id, name: cat.name, slug: cat.slug, icon: cat.icon, parentId: cat.parentId, children: cat.children
        }))}
        config={headerConfig}
      />
      <CartClient />
      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />
    </div>
  );
}