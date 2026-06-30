import StoreContainer from '@/components/store/StoreContainer';
import { SidebarSkeleton, ProductGridSkeleton } from '@/components/store/Skeletons';
import BottomNav from '@/components/layout/BottomNav';
import HeroSlider from '@/components/store/HeroSlider';
import SpecialDeals from '@/components/store/SpecialDeals';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import StoryList from '@/components/stories/StoryList';
import ReviewsCarousel from '@/components/store/ReviewsCarousel';
import BlogCarousel from '@/components/store/BlogCarousel';
import BrandsCarousel from '@/components/store/BrandsCarousel';
import CategoryQuickAccess from '@/components/store/CategoryQuickAccess';
import FeaturedProductsTabs from '@/components/store/FeaturedProductsTabs';
import MiddleBanners from '@/components/store/MiddleBanners';
import ShoppableSection from '@/components/shoppable/ShoppableSection';
import SaaSLandingPage from '@/components/saas/SaaSLandingPage';
import ScrollReveal from '@/components/store/ScrollReveal';
import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { ensureDemoProduct } from '@/lib/demo-product';
import { notFound } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop(undefined, true);
  if (!shop) {
    return {
      title: "شاپ بیلدر | پلتفرم فروشگاه‌ساز ابری و هوشمند",
      description: "فروشگاه اینترنتی خود را در کمتر از ۶۰ ثانیه به صورت کاملاً رایگان و آنی بسازید و از همین امروز فروش خود را آغاز کنید.",
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

export default async function Home() {
  const shop = await getTenantShop(undefined, true);
  
  if (!shop) {
    return <SaaSLandingPage />;
  }

  // If shop is not approved or inactive, show the "Waiting for admin approval" panel!
  if (!shop.isApproved || !shop.isActive) {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    
    // Extract base domain robustly
    const hostParts = host.split(':');
    const domainAndSubdomains = hostParts[0];
    const port = hostParts[1] ? `:${hostParts[1]}` : '';

    const parts = domainAndSubdomains.split('.');
    const tld = parts[parts.length - 1].toLowerCase();

    // Handle local domains robustly
    const localTLDs = ['localhost', 'local', 'test', 'dev', 'lan'];
    let baseDomain = 'localhost:3000';

    if (localTLDs.includes(tld) || domainAndSubdomains.toLowerCase() === 'localhost') {
      const mainLocalDomain = localTLDs.includes(tld) ? tld : 'localhost';
      baseDomain = `${mainLocalDomain}${port}`;
    } else if (parts.length <= 2) {
      baseDomain = host;
    } else {
      const last = parts[parts.length - 1];
      const secondLast = parts[parts.length - 2];
      const isSLD = ['com', 'co', 'org', 'net', 'gov', 'edu'].includes(secondLast.toLowerCase());
      if (isSLD && parts.length >= 3) {
        baseDomain = `${parts[parts.length - 3]}.${secondLast}.${last}${port}`;
      } else {
        baseDomain = `${secondLast}.${last}${port}`;
      }
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black font-sans flex flex-col justify-center items-center p-6 text-center select-none" dir="rtl">
        <div className="max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800/80 space-y-6">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
            ⚠️
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-black text-slate-800 dark:text-white">فروشگاه در انتظار تایید یا غیرفعال است</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {!shop.isApproved 
                ? "فروشگاه شما با موفقیت ساخته شده و در صف تایید قرار دارد. به محض تایید توسط مدیر اصلی، فروشگاه شما فعال خواهد شد." 
                : "این فروشگاه موقتاً توسط مدیریت غیرفعال شده است."}
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <Link
              href={`http://${shop.subdomain}.${baseDomain}/admin/login`}
              className="inline-flex items-center justify-center w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98"
            >
              ورود به پنل مدیریت فروشگاه
            </Link>
          </div>
        </div>
      </div>
    );
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

  const [products, slides, categories, menuItems, settings, specialProducts, bestSellers, discountedProducts, homepageReviews, blogPosts, dbBrands] = await Promise.all([
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
      select: { headerConfig: true, specialDealsEnabled: true, specialDealsLimit: true, homePageType: true, customHomeConfig: true, wholesaleEnabled: true }
    }),
    prisma.product.findMany({
      where: { shopId: shop.shopId, isSpecial: true, isActive: true },
      include: {
        orderItems: {
          select: {
            quantity: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: {
        orderItems: {
          _count: 'desc'
        }
      },
      take: 8
    }),
    prisma.product.findMany({
      where: {
        shopId: shop.shopId,
        isActive: true,
        OR: [
          { discount: { gt: 0 } },
          { isSpecial: true }
        ]
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discount: true,
        imageUrl: true,
        stock: true,
        isSpecial: true,
        specialEndsAt: true
      },
      orderBy: [
        { discount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 8
    }),
    prisma.review.findMany({
      where: { shopId: shop.shopId, showOnHomepage: true, status: 'approved' },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        product: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    prisma.blogPost.findMany({
      where: {
        shopId: shop.shopId,
        status: 'published',
        publishedAt: { lte: new Date() }
      },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      include: {
        category: true,
        author: {
          select: {
            name: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: { comments: { where: { status: 'approved' } } }
        }
      }
    }),
    prisma.brand.findMany({
      where: { shopId: shop.shopId },
      orderBy: { name: 'asc' }
    })
  ]);

  const mappedSpecialProducts = specialProducts.map(product => {
    const soldCount = (product as any).orderItems?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    return {
      ...product,
      soldCount
    };
  });

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

  const homePageType = settings?.homePageType || 'custom';
  
  // If custom landing page is selected but disabled/inactive (e.g. settings are missing or customHomeConfig is disabled), we can fall back or show a message.
  // In our multi-tenant SaaS, if homePageType is 'custom', we check if customHome settings are active.
  
  let customHome = {
    heroTitle: 'خرید آنلاین، آسان و مطمئن',
    heroSubtitle: 'بهترین محصولات با بالاترین کیفیت و مناسب‌ترین قیمت',
    heroCtaText: 'مشاهده محصولات',
    heroCtaUrl: '/shop',
    showStories: true,
    showSlider: false,
    showHero: true,
    showCategoryQuickAccess: true,
    categoryQuickAccessLayout: 'row',
    sliderDisplayLocation: 'both',
    isLandingActive: true, // New field to enable/disable landing page
    inactiveReason: 'صفحه اصلی موقتاً غیرفعال شده است. لطفاً مستقیماً وارد فروشگاه شوید.',
    showReviews: true,
    showMiddleBanners: false,
    showWelcomeBanner: true,
    welcomeTitle: 'به فروشگاه رسمی {shopName} خوش آمدید',
    welcomeFeature1: 'ضمانت اصالت کالا',
    welcomeFeature2: 'پشتیبانی سریع',
    welcomeFeature3: 'ارسال به سراسر کشور',
    middleBanners: [],
    showBrands: false,
    brandsTitle: 'برندهای محبوب',
    brandsSubtitle: 'مجموعه‌ای از برترین برندها و همکاران تجاری ما',
    brands: [],
    reviewsTitle: 'نظرات مشتریان ما',
    reviewsSubtitle: 'ببینید خریداران قبلی درباره ما چه می‌گویند',
    reviewsLimit: 6,
    showBlog: false,
    blogTitle: 'آخرین مطالب وبلاگ',
    blogSubtitle: 'جدیدترین مقالات و آموزش‌های ما',
    blogLimit: 6,
    showFeatures: true,
    showShoppable: true,
    showCustomText: false,
    customTextTitle: 'درباره فروشگاه ما',
    customTextContent: '',
    customTextBoxes: [],
    features: [
      { id: '1', title: 'ارسال رایگان', desc: 'بالای مبلغ مشخص', icon: 'Truck', iconType: 'lucide' },
      { id: '2', title: 'ضمانت بازگشت کالا', desc: '۷ روز ضمانت بازگشت وجه', icon: 'RotateCcw', iconType: 'lucide' },
      { id: '3', title: 'پشتیبانی ۲۴ ساعته', desc: 'همیشه پاسخگوی شما هستیم', icon: 'PhoneCall', iconType: 'lucide' },
      { id: '4', title: 'پرداخت امن و آسان', desc: 'درگاه‌های بانکی معتبر', icon: 'CreditCard', iconType: 'lucide' }
    ],
    sectionOrder: [
      'stories',
      'slider',
      'shoppable',
      'specialDeals',
      'hero',
      'features',
      'categoryQuickAccess',
      'middleBanners',
      'featuredProducts',
      'blog',
      'reviews',
      'customText'
    ]
  };

  if (settings?.customHomeConfig) {
    try {
      customHome = { ...customHome, ...JSON.parse(settings.customHomeConfig) };
    } catch (e) {
      // ignore
    }
  }

  // Override customHome.brands with database brands if available
  if (dbBrands && dbBrands.length > 0) {
    customHome.brands = dbBrands.map(b => ({
      id: b.id,
      name: b.name,
      logoUrl: b.logoUrl || '',
      linkUrl: `/shop?brand=${encodeURIComponent(b.name)}`
    })) as any;
  }

  // If landing page is selected but marked as inactive, render a clean, beautiful fallback message with a CTA to shop page
  if (homePageType === 'custom' && !customHome.isLandingActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black font-sans flex flex-col justify-center items-center p-6 text-center select-none" dir="rtl">
        <div className="max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
            ⚠️
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-black text-slate-800 dark:text-white">صفحه اصلی موقتاً در دسترس نیست</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {customHome.inactiveReason || 'صفحه اصلی اختصاصی این فروشگاه توسط مدیر غیرفعال شده است.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98"
            >
              ورود مستقیم به فروشگاه
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedWelcomeTitle = (customHome.welcomeTitle || 'به فروشگاه رسمی {shopName} خوش آمدید')
    .replace('{shopName}', shop.shopName);

  const welcomeBanner = (customHome.showWelcomeBanner !== false) && (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-500/5 via-primary-500/10 to-primary-500/5 dark:from-primary-950/10 dark:via-primary-950/20 dark:to-primary-950/10 border border-primary-500/10 dark:border-primary-500/5 rounded-2xl py-3 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_2px_12px_color-mix(in_srgb,var(--primary)_3%,transparent)]">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2.5 relative z-10">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
          <p className="text-xs font-black text-gray-800 dark:text-gray-200">
            {formattedWelcomeTitle}
          </p>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 relative z-10">
          {customHome.welcomeFeature1 && (
            <span className="flex items-center gap-1">
              <span className="text-primary-500">✓</span> {customHome.welcomeFeature1}
            </span>
          )}
          {customHome.welcomeFeature1 && customHome.welcomeFeature2 && (
            <span className="h-3 w-[1px] bg-gray-200 dark:bg-gray-800" />
          )}
          {customHome.welcomeFeature2 && (
            <span className="flex items-center gap-1">
              <span className="text-primary-500">✓</span> {customHome.welcomeFeature2}
            </span>
          )}
          {customHome.welcomeFeature2 && customHome.welcomeFeature3 && (
            <span className="h-3 w-[1px] bg-gray-200 dark:bg-gray-800" />
          )}
          {customHome.welcomeFeature3 && (
            <span className="flex items-center gap-1">
              <span className="text-primary-500">✓</span> {customHome.welcomeFeature3}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Render Shop Page directly if type is 'shop'
  if (homePageType === 'shop') {
    const showSliderInShop = customHome.showSlider && (customHome.sliderDisplayLocation === 'shop' || customHome.sliderDisplayLocation === 'both');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0 relative overflow-hidden">
        {/* Ambient Glow Blobs (static — no perpetual animation for battery/repaint friendliness) */}
        <div className="absolute top-[15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-500/3 dark:bg-primary-500/2 blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-[50%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-500/3 dark:bg-primary-500/2 blur-[150px] pointer-events-none -z-10" />

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

        {welcomeBanner}

        {showSliderInShop && slides.length > 0 && (
          <div className="w-full max-w-7xl mx-auto md:px-4 lg:px-8 mt-4">
            <HeroSlider slides={slides.filter(slide => slide.displayLocation === 'shop' || slide.displayLocation === 'both')} autoPlayInterval={5000} />
          </div>
        )}

        {specialDealsEnabled && mappedSpecialProducts.length > 0 && (
          <SpecialDeals products={mappedSpecialProducts} limit={settings?.specialDealsLimit ?? 4} />
        )}

        {customHome.showMiddleBanners && customHome.middleBanners && customHome.middleBanners.length > 0 && (
          <div className="w-full max-w-7xl mx-auto px-4 lg:px-8">
            <MiddleBanners banners={customHome.middleBanners} />
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
              showShoppable={customHome.showShoppable} 
              brands={customHome.brands || []} 
              isWholesaler={isWholesaler}
              wholesaleEnabled={!!settings?.wholesaleEnabled}
            />
          </Suspense>
        </div>

        {/* Reviews Section */}
        {customHome.showReviews && homepageReviews && homepageReviews.length > 0 && (
          <ReviewsCarousel 
            reviews={homepageReviews.slice(0, customHome.reviewsLimit || 6).map(r => ({
              ...r,
              createdAt: r.createdAt.toISOString()
            }))} 
            title={customHome.reviewsTitle} 
            subtitle={customHome.reviewsSubtitle} 
          />
        )}

        {/* Brands Section */}
        {customHome.showBrands && customHome.brands && customHome.brands.length > 0 && (
          <BrandsCarousel 
            brands={customHome.brands}
            title={customHome.brandsTitle}
            subtitle={customHome.brandsSubtitle}
          />
        )}

        <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

        {/* Bottom Navigation (Hidden on Desktop) */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    );
  }

  // Otherwise, render Custom Home Page (Landing Page)
  const rawSectionOrder = customHome.sectionOrder || [
    'stories',
    'slider',
    'shoppable',
    'specialDeals',
    'hero',
    'features',
    'categoryQuickAccess',
    'middleBanners',
    'featuredProducts',
    'blog',
    'reviews',
    'customText'
  ];
  const sectionOrder = rawSectionOrder.includes('brands') ? rawSectionOrder : [...rawSectionOrder, 'brands'];

  const renderSection = (sectionKey: string) => {
    // Dynamically resolve custom text box sections
    if (sectionKey.startsWith('customText_')) {
      const boxId = sectionKey.replace('customText_', '');
      let boxes = (customHome as any).customTextBoxes || [];
      
      // Fallback/Migration for legacy single custom text box
      if (boxes.length === 0 && ((customHome as any).customTextTitle || (customHome as any).customTextContent)) {
        boxes = [{
          id: 'legacy-1',
          title: (customHome as any).customTextTitle || 'درباره فروشگاه ما',
          content: (customHome as any).customTextContent || '',
          imageUrl: (customHome as any).customTextImage || '',
          imagePosition: (customHome as any).customTextImagePosition || 'right',
          ctaText: (customHome as any).customTextCtaText || '',
          ctaUrl: (customHome as any).customTextCtaUrl || '',
          isActive: (customHome as any).showCustomText !== undefined ? (customHome as any).showCustomText : true
        }];
      }

      const box = boxes.find((b: any) => b.id === boxId);
      if (!(customHome as any).showCustomText || !box || !box.isActive || (!box.content && !box.imageUrl)) return null;

      const hasImage = box.imageUrl;
      const imagePos = box.imagePosition || 'right';
      const hasCta = box.ctaText && box.ctaUrl;

      return (
        <ScrollReveal key={sectionKey} animation="fade-in-up">
          <div className="py-12 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gray-50 dark:bg-gray-950 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800/50">
                <div className={`flex flex-col lg:flex-row gap-8 items-center ${imagePos === 'left' ? 'lg:flex-row-reverse' : ''}`}>
                  
                  {/* Text Content Area */}
                  <div className="flex-1 w-full space-y-4">
                    {box.title && (
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                        {box.title}
                      </h2>
                    )}
                    
                    {box.content && (
                      <div 
                        className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-line custom-html-content"
                        dangerouslySetInnerHTML={{ __html: box.content }}
                      />
                    )}

                    {hasCta && (
                      <div className="pt-2">
                        <Link
                          href={box.ctaUrl}
                          className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98"
                        >
                          {box.ctaText}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Image Area */}
                  {hasImage && (
                    <div className="w-full lg:w-2/5 shrink-0">
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                        <Image 
                          src={hasImage} 
                          alt={box.title || 'باکس متنی'} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              .custom-html-content a {
                color: var(--primary) !important;
                font-weight: 800 !important;
                text-decoration: underline !important;
              }
              .dark .custom-html-content a {
                color: var(--primary) !important;
              }
              .custom-html-content strong, .custom-html-content b {
                font-weight: 900 !important;
                color: inherit !important;
              }
            `}} />
          </div>
        </ScrollReveal>
      );
    }

    switch (sectionKey) {
      case 'stories':
        return customHome.showStories && (
          <ScrollReveal key="stories" animation="fade-in-up">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-4">
              <Suspense fallback={null}>
                <StoryList displayLocation="custom" />
              </Suspense>
            </div>
          </ScrollReveal>
        );
      case 'slider':
        return customHome.showSlider && (customHome.sliderDisplayLocation === 'custom' || customHome.sliderDisplayLocation === 'both') && slides.length > 0 && (
          <ScrollReveal key="slider" animation="fade-in" duration={600}>
            <div className="w-full max-w-7xl mx-auto md:px-4 lg:px-8 mt-4">
              <HeroSlider slides={slides.filter(slide => slide.displayLocation === 'custom' || slide.displayLocation === 'both')} autoPlayInterval={5000} />
            </div>
          </ScrollReveal>
        );
      case 'shoppable':
        return customHome.showShoppable && (
          <ScrollReveal key="shoppable" animation="fade-in-up">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-4">
              <Suspense fallback={null}>
                <ShoppableSection hasStories={customHome.showStories} />
              </Suspense>
            </div>
          </ScrollReveal>
        );
      case 'specialDeals':
        return specialDealsEnabled && mappedSpecialProducts.length > 0 && (
          <ScrollReveal key="specialDeals" animation="fade-in-up">
            <SpecialDeals products={mappedSpecialProducts} limit={settings?.specialDealsLimit ?? 4} />
          </ScrollReveal>
        );
      case 'hero': {
        const heroCategories = categories.filter(c => !c.parentId).slice(0, 5);
        return customHome.showHero && (
          <ScrollReveal key="hero" animation="fade-in-up">
            <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-gray-50 dark:from-primary-950/20 dark:via-black dark:to-black py-12 sm:py-16 lg:py-20 border-b border-gray-100 dark:border-gray-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-2xl mx-auto">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                    {customHome.heroTitle}
                  </h1>
                  <p className="mt-3 sm:mt-5 text-sm sm:text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    {customHome.heroSubtitle}
                  </p>
                  <div className="mt-6 sm:mt-8 flex items-center justify-center">
                    <Link
                      href={customHome.heroCtaUrl}
                      className="rounded-2xl bg-primary-600 px-6 sm:px-8 py-3 sm:py-4 text-sm font-black text-white shadow-lg hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all duration-200 hover:shadow-primary-500/20 active:scale-98"
                    >
                      {customHome.heroCtaText}
                    </Link>
                  </div>

                  {/* Quick category chips for fast discovery */}
                  {heroCategories.length > 0 && (
                    <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2">
                      {heroCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/category/${cat.slug}`}
                          className="px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-800/70 text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Decorative background blob */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-gradient-to-r from-primary-500/10 to-purple-500/10 blur-3xl rounded-full -z-10" />
            </section>
          </ScrollReveal>
        );
      }
      case 'features':
        return customHome.showFeatures && customHome.features && customHome.features.length > 0 && (
          <ScrollReveal key="features" animation="fade-in-up">
            <div className="py-12 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`grid grid-cols-2 md:grid-cols-${Math.min(customHome.features.length, 4)} gap-6 text-center`}>
                  {customHome.features.map((feat: any, idx: number) => (
                    <div key={feat.id || idx} className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800/50 hover:shadow-md transition-all duration-200">
                      {feat.iconType === 'emoji' && (
                        <div className="text-3xl mb-3">{feat.icon}</div>
                      )}
                      {feat.iconType === 'upload' && feat.icon && (feat.icon.startsWith('/') || feat.icon.startsWith('http')) ? (
                        <div className="relative w-10 h-10 mx-auto mb-3 flex items-center justify-center">
                          <Image src={feat.icon} alt={feat.title} fill className="object-contain" />
                        </div>
                      ) : feat.iconType === 'upload' ? (
                        <div className="flex justify-center mb-3">
                          <LucideIcons.Image className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                      ) : null}
                      {(!feat.iconType || feat.iconType === 'lucide') && (
                        <div className="flex justify-center mb-3">
                          {(() => {
                            const IconComponent = (LucideIcons as any)[feat.icon];
                            if (IconComponent) {
                              return <IconComponent className="w-8 h-8 text-primary-600 dark:text-primary-400" />;
                            }
                            return <LucideIcons.Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />;
                          })()}
                        </div>
                      )}
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">{feat.title}</h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-bold">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        );
      case 'categoryQuickAccess': {
        const isManual = (customHome as any).useSelectedCategoriesOnly && (customHome as any).homeCategories && (customHome as any).homeCategories.length > 0;
        let finalCategories = categories;
        if (isManual) {
          finalCategories = (customHome as any).homeCategories
            .map((hc: any) => {
              const found = categories.find(c => c.id === hc.id);
              if (found) {
                return {
                  ...found,
                  customImageUrl: hc.customImageUrl || null
                };
              }
              return null;
            })
            .filter(Boolean) as any;
        }

        return customHome.showCategoryQuickAccess && finalCategories.length > 0 && (
          <ScrollReveal key="categoryQuickAccess" animation="fade-in-up">
            <CategoryQuickAccess 
              categories={finalCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                icon: cat.icon,
                imageUrl: (cat as any).imageUrl,
                customImageUrl: (cat as any).customImageUrl,
                parentId: cat.parentId,
                children: cat.children?.map(child => ({
                  id: child.id,
                  name: child.name,
                  slug: child.slug,
                  icon: child.icon,
                  imageUrl: (child as any).imageUrl,
                  parentId: child.parentId
                }))
              }))}
              products={products.map(p => ({
                id: p.id,
                title: p.title,
                description: p.description,
                price: p.price,
                discount: p.discount,
                imageUrl: p.imageUrl,
                stock: p.stock,
                categoryId: p.categoryId,
                isWholesaleOnly: (p as any).isWholesaleOnly
              }))}
              currency={shop.currency === 'IRT' ? 'تومان' : 'ریال'}
              layoutType={(customHome.categoryQuickAccessLayout as 'list' | 'row') || 'row'}
              isManualSelection={isManual}
            />
          </ScrollReveal>
        );
      }
      case 'middleBanners':
        return customHome.showMiddleBanners && customHome.middleBanners && customHome.middleBanners.length > 0 && (
          <ScrollReveal key="middleBanners" animation="fade-in-up">
            <div className="w-full max-w-7xl mx-auto px-4 lg:px-8">
              <MiddleBanners banners={customHome.middleBanners} />
            </div>
          </ScrollReveal>
        );
      case 'featuredProducts':
        return (
          <ScrollReveal key="featuredProducts" animation="fade-in-up">
            <FeaturedProductsTabs 
              bestSellers={bestSellers}
              newestProducts={products.slice(0, 8)}
              discountedProducts={discountedProducts}
              currency={shop.currency === 'IRT' ? 'تومان' : 'ریال'}
              brands={customHome.brands || []}
            />
          </ScrollReveal>
        );
      case 'blog':
        return customHome.showBlog && blogPosts && blogPosts.length > 0 && (
          <ScrollReveal key="blog" animation="fade-in-up">
            <BlogCarousel
              posts={blogPosts.slice(0, customHome.blogLimit || 6).map(p => ({
                ...p,
                author: p.author ? {
                  name: p.author.name || 'مدیر سایت',
                  avatarUrl: p.author.avatarUrl
                } : null
              }))}
              title={customHome.blogTitle}
              subtitle={customHome.blogSubtitle}
            />
          </ScrollReveal>
        );
      case 'reviews':
        return customHome.showReviews && homepageReviews && homepageReviews.length > 0 && (
          <ScrollReveal key="reviews" animation="fade-in-up">
            <ReviewsCarousel 
              reviews={homepageReviews.slice(0, customHome.reviewsLimit || 6).map(r => ({
                ...r,
                createdAt: r.createdAt.toISOString()
              }))} 
              title={customHome.reviewsTitle} 
              subtitle={customHome.reviewsSubtitle} 
            />
          </ScrollReveal>
        );
      case 'brands':
        return customHome.showBrands && customHome.brands && customHome.brands.length > 0 && (
          <ScrollReveal key="brands" animation="fade-in-up">
            <BrandsCarousel
              brands={customHome.brands}
              title={customHome.brandsTitle}
              subtitle={customHome.brandsSubtitle}
            />
          </ScrollReveal>
        );
      case 'customText': {
        // Fallback for when sectionOrder still has 'customText' instead of 'customText_[ID]'
        let boxes = (customHome as any).customTextBoxes || [];
        
        if (boxes.length === 0 && ((customHome as any).customTextTitle || (customHome as any).customTextContent)) {
          boxes = [{
            id: 'legacy-1',
            title: (customHome as any).customTextTitle || 'درباره فروشگاه ما',
            content: (customHome as any).customTextContent || '',
            imageUrl: (customHome as any).customTextImage || '',
            imagePosition: (customHome as any).customTextImagePosition || 'right',
            ctaText: (customHome as any).customTextCtaText || '',
            ctaUrl: (customHome as any).customTextCtaUrl || '',
            isActive: (customHome as any).showCustomText !== undefined ? (customHome as any).showCustomText : true
          }];
        }

        const activeBoxes = boxes.filter((box: any) => box.isActive && (box.content || box.imageUrl));
        if (!(customHome as any).showCustomText || activeBoxes.length === 0) return null;

        return (
          <ScrollReveal key="customText" animation="fade-in-up">
            <div className="space-y-8 py-12 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {activeBoxes.map((box: any, index: number) => {
                  const hasImage = box.imageUrl;
                  const imagePos = box.imagePosition || 'right';
                  const hasCta = box.ctaText && box.ctaUrl;

                  return (
                    <div key={box.id || index} className="bg-gray-50 dark:bg-gray-950 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800/50">
                      <div className={`flex flex-col lg:flex-row gap-8 items-center ${imagePos === 'left' ? 'lg:flex-row-reverse' : ''}`}>
                        
                        {/* Text Content Area */}
                        <div className="flex-1 w-full space-y-4">
                          {box.title && (
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                              {box.title}
                            </h2>
                          )}
                          
                          {box.content && (
                            <div 
                              className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-line custom-html-content"
                              dangerouslySetInnerHTML={{ __html: box.content }}
                            />
                          )}

                          {hasCta && (
                            <div className="pt-2">
                              <Link
                                href={box.ctaUrl}
                                className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98"
                              >
                                {box.ctaText}
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Image Area */}
                        {hasImage && (
                          <div className="w-full lg:w-2/5 shrink-0">
                            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                              <Image 
                                src={hasImage} 
                                alt={box.title || 'باکس متنی'} 
                                fill 
                                className="object-cover"
                              />
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
              <style dangerouslySetInnerHTML={{ __html: `
                .custom-html-content a {
                  color: var(--primary) !important;
                  font-weight: 800 !important;
                  text-decoration: underline !important;
                }
                .dark .custom-html-content a {
                  color: var(--primary) !important;
                }
                .custom-html-content strong, .custom-html-content b {
                  font-weight: 900 !important;
                  color: inherit !important;
                }
              `}} />
            </div>
          </ScrollReveal>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0 relative overflow-hidden">
      {/* Ambient Glow Blobs (static — no perpetual animation for battery/repaint friendliness) */}
      <div className="absolute top-[15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-500/3 dark:bg-primary-500/2 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[50%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-500/3 dark:bg-primary-500/2 blur-[150px] pointer-events-none -z-10" />

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

      {welcomeBanner}

      {/* Render sections dynamically in order */}
      {sectionOrder.map((sectionKey: string) => renderSection(sectionKey))}

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      {/* Bottom Navigation (Hidden on Desktop) */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
