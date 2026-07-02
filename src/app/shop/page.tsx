import StoreContainer from '@/components/store/StoreContainer';
import { SidebarSkeleton, ProductGridSkeleton } from '@/components/store/Skeletons';
import BottomNav from '@/components/layout/BottomNav';
import HeroSlider from '@/components/store/HeroSlider';
import SpecialDeals from '@/components/store/SpecialDeals';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import StoryList from '@/components/stories/StoryList';
import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { getCachedCategories, getCachedMenuItems, getCachedBrands, getCachedHeroSlides } from '@/lib/cached-queries';
import { logPerf } from '@/lib/perf-logger';
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
  const startShop = performance.now();
  const shop = await getTenantShop();
  logPerf('shop.tenant_resolve', startShop);
  
  if (!shop) {
    return notFound();
  }

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

  const startData = performance.now();
  const productListSelect = {
    id: true,
    title: true,
    type: true,
    categoryId: true,
    description: true,
    price: true,
    discount: true,
    imageUrl: true,
    stock: true,
    isSpecial: true,
    specialEndsAt: true,
    isActive: true,
    brand: true,
    createdAt: true,
    isWholesaleOnly: true,
    wholesalePrice: true,
    wholesaleUnit: true,
    moq: true,
  };

  const [products, slides, categories, menuItems, settings, specialProducts, dbBrands] = await Promise.all([
    prisma.product.findMany({
      where: { shopId: shop.shopId, isActive: true },
      select: productListSelect,
      orderBy: { createdAt: 'desc' },
      take: 40
    }),
    getCachedHeroSlides(shop.shopId),
    getCachedCategories(shop.shopId),
    getCachedMenuItems(shop.shopId),
    prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { headerConfig: true, specialDealsEnabled: true, specialDealsLimit: true, customHomeConfig: true, wholesaleEnabled: true }
    }),
    prisma.product.findMany({
      where: { shopId: shop.shopId, isSpecial: true, isActive: true },
      select: productListSelect,
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    getCachedBrands(shop.shopId)
  ]);
  logPerf('shop.data_load', startData);

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

  logPerf('shop.total', startShop);

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
        <Suspense fallback={
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 pt-4">
            <div className="hidden lg:block">
              <SidebarSkeleton />
            </div>
            <div className="flex-1">
              <ProductGridSkeleton count={8} />
            </div>
          </div>
        }>
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
