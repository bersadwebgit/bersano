import StoreContainer from '@/components/store/StoreContainer';
import BottomNav from '@/components/layout/BottomNav';
import HeroSlider from '@/components/store/HeroSlider';
import SpecialDeals from '@/components/store/SpecialDeals';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import StoryList from '@/components/stories/StoryList';
import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { ensureDemoProduct } from '@/lib/demo-product';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop();
  if (!shop) {
    return {
      title: "فروشگاه یافت نشد",
    };
  }

  const settings = await prisma.shopSettings.findUnique({
    where: { shopId: shop.shopId }
  });

  return {
    title: settings?.shopName || "فروشگاه من",
    description: settings?.description || "پلتفرم فروشگاهی چند مستاجره",
    icons: settings?.faviconUrl ? {
      icon: settings.faviconUrl,
      shortcut: settings.faviconUrl,
      apple: settings.faviconUrl,
    } : undefined,
  };
}

export default async function ShopPage() {
  const shop = await getTenantShop();
  
  if (!shop) {
    return notFound();
  }

  await ensureDemoProduct(shop.shopId);

  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  let isWholesaler = false;
  if (customerToken) {
    try {
      const verified = await jwtVerify(customerToken, key);
      const payload = verified.payload;
      const user = await prisma.user.findFirst({
        where: { id: payload.id as string, shopId: shop.shopId }
      });
      isWholesaler = !!user?.isWholesaler;
    } catch (err) {}
  }

  const [products, slides, categories, menuItems, settings, specialProducts, dbBrands] = await Promise.all([
    prisma.product.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.heroSlide.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { order: 'asc' }
    }),
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
    }),
    prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { headerConfig: true, specialDealsEnabled: true, specialDealsLimit: true, customHomeConfig: true, wholesaleEnabled: true }
    }),
    prisma.product.findMany({
      where: { shopId: shop.shopId, isSpecial: true, isActive: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.brand.findMany({
      where: { shopId: shop.shopId },
      orderBy: { name: 'asc' }
    })
  ]);

  let headerConfig = undefined;
  const footerConfig = await getFooterConfig();
  const specialDealsEnabled = settings?.specialDealsEnabled ?? false;
  if (settings?.headerConfig) {
    try {
      headerConfig = JSON.parse(settings.headerConfig);
    } catch (e) {
      // ignore
    }
  }

  let customHome = {
    showSlider: false,
    sliderDisplayLocation: 'both',
    showStories: true,
  };

  if (settings?.customHomeConfig) {
    try {
      customHome = { ...customHome, ...JSON.parse(settings.customHomeConfig) };
    } catch (e) {
      // ignore
    }
  }

  // Override customHome.brands with database brands if available
  const finalBrands = dbBrands && dbBrands.length > 0 
    ? dbBrands.map(b => ({ id: b.id, name: b.name, logoUrl: b.logoUrl || '' }))
    : ((customHome as any).brands || []);

  const showSliderInShop = customHome.showSlider && (customHome.sliderDisplayLocation === 'shop' || customHome.sliderDisplayLocation === 'both');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0">
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

      {showSliderInShop && slides.length > 0 && (
        <div className="w-full max-w-7xl mx-auto md:px-4 lg:px-8 mt-4">
          <HeroSlider slides={slides.filter(slide => slide.displayLocation === 'shop' || slide.displayLocation === 'both')} autoPlayInterval={5000} />
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full">
        {/* Main Content Area with Sidebar */}
        <Suspense fallback={<div className="p-8 text-center">در حال بارگذاری...</div>}>
          <StoreContainer 
            initialProducts={products} 
            initialCategories={categories} 
            showStories={customHome.showStories} 
            brands={finalBrands} 
            isWholesaler={isWholesaler}
            wholesaleEnabled={!!settings?.wholesaleEnabled}
          />
        </Suspense>
      </div>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      {/* Bottom Navigation (Hidden on Desktop) */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
