import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag, ArrowLeft, Home, Phone, FileText, Compass } from 'lucide-react';

export const metadata = {
  metadataBase: new URL('https://bersana.ir'),
  title: 'صفحه پیدا نشد | ۴۰۴',
  robots: {
    index: false,
    follow: true,
  },
};

export default async function NotFound() {
  const shop = await getTenantShop();
  const shopName = shop?.shopName || 'فروشگاه';
  const themeColor = shop?.themeColor || '#2563eb';
  const logoUrl = shop?.logoUrl;

  // Fetch 4 top products to recommend on 404 page (Zero Bouncing Rate SEO rule)
  let popularProducts: any[] = [];
  if (shop) {
    try {
      popularProducts = await prisma.product.findMany({
        where: {
          shopId: shop.shopId,
          isActive: true,
          stock: { gt: 0 }
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          price: true,
          discount: true,
          imageUrl: true,
          brand: true
        }
      });
    } catch (err) {
      console.error('Error fetching popular products for 404 page:', err);
    }
  }

  // Calculate prices helper
  const getProductPriceInfo = (product: any) => {
    const originalPrice = product.price;
    const discount = product.discount || 0;
    const hasDiscount = discount > 0;
    const finalPrice = hasDiscount 
      ? originalPrice - (originalPrice * discount) / 100 
      : originalPrice;

    return {
      originalPrice: originalPrice.toLocaleString('fa-IR'),
      finalPrice: finalPrice.toLocaleString('fa-IR'),
      hasDiscount,
      discountPercent: discount
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      {/* Container */}
      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Header/Branding */}
        <header className="flex flex-col items-center text-center space-y-4">
          {logoUrl ? (
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <Image 
                src={logoUrl} 
                alt={shopName} 
                width={80} 
                height={80} 
                className="h-20 w-auto object-contain mx-auto" 
              />
            </Link>
          ) : (
            <Link 
              href="/" 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl transition-transform hover:scale-105"
              style={{ backgroundColor: themeColor }}
            >
              {shopName.charAt(0)}
            </Link>
          )}
          <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-zinc-400">
            {shopName}
          </h2>
        </header>

        {/* 404 Card Hero */}
        <main className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden p-8 sm:p-12 text-center space-y-8">
          <div className="flex flex-col items-center space-y-4">
            {/* Visual Error Badge */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce mb-2"
              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <Compass className="w-10 h-10" />
            </div>
            
            {/* 404 Title */}
            <h1 
              className="text-7xl sm:text-8xl font-black tracking-tight"
              style={{ color: themeColor }}
            >
              ۴۰۴
            </h1>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              صفحه مورد نظر پیدا نشد!
            </h3>
            
            <p className="max-w-md text-base text-gray-500 dark:text-zinc-400 mx-auto leading-relaxed">
              متأسفانه صفحه‌ای که به دنبال آن بودید یافت نشد یا آدرس آن تغییر یافته است. می‌توانید از بخش‌های زیر برای یافتن مطلب مورد نظر استفاده کنید.
            </p>
          </div>

          {/* Smart Search Bar */}
          <div className="max-w-md mx-auto w-full">
            <form action="/shop" method="GET" className="relative">
              <input 
                type="text" 
                name="search" 
                placeholder="جستجو در محصولات..." 
                className="w-full px-5 py-4 pr-12 text-sm text-gray-900 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent shadow-inner dark:text-zinc-100 placeholder-gray-400 transition-all focus:bg-white dark:focus:bg-zinc-800"
                style={{ '--tw-ring-color': themeColor } as any}
              />
              <button 
                type="submit" 
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: themeColor }}
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
            <Link 
              href="/" 
              className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-gray-100/50 dark:border-zinc-700/30 transition-all font-semibold text-gray-800 dark:text-zinc-200 group text-sm"
            >
              <Home className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: themeColor }} />
              <span>خانه فروشگاه</span>
            </Link>
            
            <Link 
              href="/shop" 
              className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-gray-100/50 dark:border-zinc-700/30 transition-all font-semibold text-gray-800 dark:text-zinc-200 group text-sm"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: themeColor }} />
              <span>مشاهده محصولات</span>
            </Link>

            <Link 
              href="/blog" 
              className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-gray-100/50 dark:border-zinc-700/30 transition-all font-semibold text-gray-800 dark:text-zinc-200 group text-sm"
            >
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: themeColor }} />
              <span>وبلاگ و مطالب</span>
            </Link>

            <Link 
              href="/pages/contact-us" 
              className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-gray-100/50 dark:border-zinc-700/30 transition-all font-semibold text-gray-800 dark:text-zinc-200 group text-sm"
            >
              <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: themeColor }} />
              <span>تماس با پشتیبانی</span>
            </Link>
          </div>
        </main>

        {/* Popular/Latest Products - Zero Bounce SEO Rule */}
        {popularProducts.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                شاید این محصولات برای شما جالب باشد:
              </h4>
              <Link 
                href="/shop" 
                className="flex items-center gap-1 text-sm font-semibold transition-all hover:gap-2"
                style={{ color: themeColor }}
              >
                <span>مشاهده همه</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {popularProducts.map((p) => {
                const priceInfo = getProductPriceInfo(p);
                return (
                  <Link 
                    key={p.id} 
                    href={`/product/${p.id}`}
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm transition-all hover:-translate-y-1 hover:shadow-md group"
                  >
                    <div className="relative aspect-square w-full bg-gray-50 dark:bg-zinc-800 overflow-hidden">
                      {p.imageUrl ? (
                        <Image 
                          src={p.imageUrl} 
                          alt={p.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-zinc-600">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                      {priceInfo.hasDiscount && (
                        <div 
                          className="absolute top-2 right-2 text-[10px] sm:text-xs font-black px-2 py-1 rounded-lg text-white shadow"
                          style={{ backgroundColor: themeColor }}
                        >
                          {priceInfo.discountPercent.toLocaleString('fa-IR')}٪ تخفیف
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-right">
                      <div className="space-y-1">
                        {p.brand && (
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                            {p.brand}
                          </span>
                        )}
                        <h5 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-zinc-100 line-clamp-2 leading-relaxed">
                          {p.title}
                        </h5>
                      </div>

                      <div className="pt-2 border-t border-gray-50 dark:border-zinc-800 text-left">
                        {priceInfo.hasDiscount ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                              {priceInfo.originalPrice} تومان
                            </span>
                            <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                              {priceInfo.finalPrice} تومان
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white block">
                            {p.originalPrice} تومان
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer info helper */}
        <footer className="text-center pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-zinc-500">
          <p>© {new Date().getFullYear()} {shopName}. تمامی حقوق محفوظ است.</p>
          {(shop?.contactPhone || shop?.contactEmail) && (
            <div className="flex items-center gap-4">
              {shop.contactPhone && (
                <span>تلفن پشتیبانی: <span className="font-bold tabular-nums">{shop.contactPhone}</span></span>
              )}
              {shop.contactEmail && (
                <span>ایمیل: <span className="font-bold">{shop.contactEmail}</span></span>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
