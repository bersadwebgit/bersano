'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutGrid, Sparkles, Flame, Percent, ChevronRight, ChevronLeft, ShoppingBag, Timer } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

interface Product {
  id: string;
  title: string;
  brand?: string | null;
  description?: string | null;
  price: number;
  discount?: number | null;
  imageUrl?: string | null;
  stock: number;
  isSpecial?: boolean;
  specialEndsAt?: Date | string | null;
}

interface FeaturedProductsTabsProps {
  bestSellers: Product[];
  newestProducts: Product[];
  discountedProducts: Product[];
  currency?: string;
  brands?: any[];
}

type TabType = 'bestsellers' | 'newest' | 'discounts';

// Countdown Timer Component for each product card
function DiscountCountdown({ endsAt }: { endsAt: Date | string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endsAt) - +new Date();
      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft.isExpired) return null;

  const formatNum = (num: number) => {
    const formatted = num.toString().padStart(2, '0');
    return formatted.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  };

  return (
    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md text-white rounded-lg py-1 px-2 flex items-center justify-between text-[9px] sm:text-[10px] font-black shadow-lg">
      <div className="flex items-center gap-1 text-rose-400">
        <Timer size={11} className="animate-spin" style={{ animationDuration: '6s' }} />
        <span>فرصت باقی‌مانده:</span>
      </div>
      <div className="flex gap-0.5 font-mono tracking-wider text-rose-300" dir="ltr">
        <span>{formatNum(timeLeft.seconds)}</span>
        <span>:</span>
        <span>{formatNum(timeLeft.minutes)}</span>
        <span>:</span>
        <span>{formatNum(timeLeft.hours)}</span>
      </div>
    </div>
  );
}

export default function FeaturedProductsTabs({
  bestSellers,
  newestProducts,
  discountedProducts,
  currency = 'تومان',
  brands = []
}: FeaturedProductsTabsProps) {
  // Set initial active tab dynamically based on product availability
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (discountedProducts && discountedProducts.length > 0) {
      return 'discounts';
    }
    if (bestSellers && bestSellers.length > 0) {
      return 'bestsellers';
    }
    return 'newest';
  });

  // Section root used as a scroll anchor (e.g. deep-links from stories: /#bestsellers)
  const sectionRef = useRef<HTMLDivElement>(null);

  // Resolve a URL hash to the matching internal tab. Returns null when the hash
  // only targets the section without selecting a specific tab.
  const resolveTabFromHash = useCallback((rawHash: string): TabType | null => {
    const hash = decodeURIComponent(rawHash.replace(/^#/, '')).toLowerCase();
    if (hash === 'bestsellers') return 'bestsellers';
    if (hash === 'newest') return 'newest';
    if (hash === 'discounts') return 'discounts';
    return null;
  }, []);

  // Handle deep-links to this section (on mount and on hash changes while the
  // page stays mounted, e.g. when a story link updates the hash in-place).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const TARGET_HASHES = ['featured-products', 'bestsellers', 'newest', 'discounts'];

    const applyHashTarget = () => {
      const rawHash = decodeURIComponent((window.location.hash || '').replace(/^#/, '')).toLowerCase();
      if (!TARGET_HASHES.includes(rawHash)) return;

      const targetTab = resolveTabFromHash(rawHash);
      if (targetTab) setActiveTab(targetTab);

      // Wait a frame so the tab content/carousel settles before scrolling.
      window.setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    };

    applyHashTarget();
    window.addEventListener('hashchange', applyHashTarget);
    return () => window.removeEventListener('hashchange', applyHashTarget);
  }, [resolveTabFromHash]);

  // Embla Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    direction: 'rtl',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  // Re-initialize carousel when active tab changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
      emblaApi.scrollTo(0);
    }
  }, [activeTab, emblaApi]);

  // Adjust active tab if products change dynamically
  useEffect(() => {
    const hasDiscounts = discountedProducts && discountedProducts.length > 0;
    const hasBestsellers = bestSellers && bestSellers.length > 0;
    const hasNewest = newestProducts && newestProducts.length > 0;

    if (activeTab === 'discounts' && !hasDiscounts) {
      if (hasBestsellers) {
        setActiveTab('bestsellers');
      } else if (hasNewest) {
        setActiveTab('newest');
      }
    } else if (activeTab === 'bestsellers' && !hasBestsellers) {
      if (hasDiscounts) {
        setActiveTab('discounts');
      } else if (hasNewest) {
        setActiveTab('newest');
      }
    } else if (activeTab === 'newest' && !hasNewest) {
      if (hasDiscounts) {
        setActiveTab('discounts');
      } else if (hasBestsellers) {
        setActiveTab('bestsellers');
      }
    }
  }, [discountedProducts, bestSellers, newestProducts, activeTab]);

  const allTabs = [
    { id: 'discounts' as TabType, label: 'پیشنهاد ویژه / تخفیف‌دار', icon: Percent, themeColor: 'rose', hasProducts: discountedProducts && discountedProducts.length > 0 },
    { id: 'bestsellers' as TabType, label: 'پرفروش‌ترین‌ها', icon: Flame, themeColor: 'amber', hasProducts: bestSellers && bestSellers.length > 0 },
    { id: 'newest' as TabType, label: 'جدیدترین محصولات', icon: Sparkles, themeColor: 'blue', hasProducts: newestProducts && newestProducts.length > 0 },
  ];

  // Filter tabs to only show those with products, unless all are empty
  const tabs = allTabs.some(t => t.hasProducts)
    ? allTabs.filter(t => t.hasProducts)
    : allTabs;

  const getActiveProducts = () => {
    switch (activeTab) {
      case 'bestsellers':
        return bestSellers;
      case 'discounts':
        return discountedProducts;
      case 'newest':
      default:
        return newestProducts;
    }
  };

  const activeProducts = getActiveProducts();
  const currentTabConfig = tabs.find(t => t.id === activeTab) || tabs[0];

  // Richer, more vibrant theme colors
  const getThemeClasses = () => {
    switch (currentTabConfig.themeColor) {
      case 'amber':
        return {
          bgGradient: 'from-amber-500/25 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-950/5 dark:to-transparent',
          border: 'border-amber-200 dark:border-amber-800/50',
          accentBg: 'bg-amber-500',
          accentText: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-500 text-white dark:bg-amber-600',
          buttonHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
          ringColor: 'focus-within:ring-amber-500',
        };
      case 'blue':
        return {
          bgGradient: 'from-blue-500/25 via-blue-500/5 to-transparent dark:from-blue-500/15 dark:via-blue-950/5 dark:to-transparent',
          border: 'border-blue-200 dark:border-blue-800/50',
          accentBg: 'bg-blue-500',
          accentText: 'text-blue-600 dark:text-blue-400',
          badgeBg: 'bg-blue-500 text-white dark:bg-blue-600',
          buttonHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
          ringColor: 'focus-within:ring-blue-500',
        };
      case 'rose':
      default:
        return {
          bgGradient: 'from-rose-500/30 via-rose-500/5 to-transparent dark:from-rose-500/20 dark:via-rose-950/5 dark:to-transparent',
          border: 'border-rose-200 dark:border-rose-800/50',
          accentBg: 'bg-rose-500',
          accentText: 'text-rose-600 dark:text-rose-400',
          badgeBg: 'bg-rose-500 text-white dark:bg-rose-600',
          buttonHover: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
          ringColor: 'focus-within:ring-rose-500',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div ref={sectionRef} id="featured-products" className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto select-none scroll-mt-24" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span className={`w-2.5 h-5 sm:h-6 rounded-full inline-block transition-colors duration-300 ${theme.accentBg}`}></span>
            محصولات ویژه
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">
            برترین، جدیدترین و پرفروش‌ترین محصولات تخفیف‌دار فروشگاه را با قیمت استثنایی بررسی کنید
          </p>
        </div>

        {/* Tab Buttons - Single row horizontal scroll on mobile */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex flex-nowrap gap-1.5 bg-gray-100/80 dark:bg-gray-900/80 p-1 rounded-xl border border-gray-200/30 dark:border-gray-800/30 w-max md:w-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-black transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-700/50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <div className={`relative rounded-2xl p-4 sm:p-6 md:p-8 border transition-all duration-500 bg-gradient-to-l ${theme.bgGradient} ${theme.border}`}>
        
        {/* Navigation Buttons (Hidden or smaller on mobile) */}
        {activeProducts.length > 0 && (
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 flex gap-1.5 z-10">
            <button
              onClick={scrollPrev}
              disabled={prevBtnDisabled}
              className={`w-8 h-8 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ${theme.buttonHover}`}
              aria-label="قبلی"
            >
              <ChevronRight className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={scrollNext}
              disabled={nextBtnDisabled}
              className={`w-8 h-8 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ${theme.buttonHover}`}
              aria-label="بعدی"
            >
              <ChevronLeft className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        )}

        {/* Carousel Viewport */}
        {activeProducts.length > 0 ? (
          <div className="overflow-hidden mt-6 sm:mt-8 md:mt-10" ref={emblaRef}>
            <div className="flex gap-3 sm:gap-6 touch-pan-y">
              {activeProducts.map((product) => {
                const finalPrice = product.discount
                  ? product.price - product.discount
                  : product.price;

                const discountPercent = product.discount && product.price > 0
                  ? Math.round((product.discount / product.price) * 100)
                  : 0;

                // Check if product has a valid special deal end date
                const hasTimer = product.specialEndsAt && new Date(product.specialEndsAt) > new Date();

                const brandObj = brands?.find(
                  b => b.name?.toLowerCase().trim() === product.brand?.toLowerCase().trim()
                );
                const brandLogo = brandObj?.logoUrl;

                return (
                  <div 
                    key={product.id} 
                    className="flex-[0_0_46%] sm:flex-[0_0_31%] md:flex-[0_0_23%] lg:flex-[0_0_20%] min-w-0"
                  >
                    <Link
                      href={`/product/${product.id}`}
                      className={`group flex flex-col h-full bg-white dark:bg-gray-950 rounded-2xl overflow-hidden border border-gray-100/80 dark:border-gray-800/80 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 ${theme.ringColor} focus-within:ring-2 focus-within:ring-offset-2 ${product.stock <= 0 ? 'opacity-75' : ''}`}
                    >
                      {/* Image Container */}
                      <div className="aspect-square relative overflow-hidden bg-gray-50 dark:bg-gray-900">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            sizes="(max-width: 768px) 46vw, 20vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <LayoutGrid size={20} className="opacity-20 group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}

                        {/* Badges */}
                        {product.stock <= 0 ? null : product.discount && product.discount > 0 ? (
                          <div className={`absolute top-2 right-2 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md flex items-center gap-0.5 animate-pulse z-10 ${theme.badgeBg}`}>
                            <span>٪{discountPercent.toLocaleString('fa-IR')}</span>
                            <span className="hidden xs:inline">تخفیف</span>
                          </div>
                        ) : (
                          <div className="absolute top-2 right-2 bg-primary-600 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-lg shadow-md z-10">
                            ویژه
                          </div>
                        )}

                        {/* Out of Stock Overlay */}
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <span className="bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-md border border-gray-100/20 dark:border-gray-800/20 tracking-wider">
                              ناموجود
                            </span>
                          </div>
                        )}

                        {/* Countdown Timer overlay */}
                        {hasTimer && product.specialEndsAt && (
                          <DiscountCountdown endsAt={product.specialEndsAt} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                        {product.brand && (
                          <div className="flex items-center gap-1 mt-1 mb-1.5">
                            {brandLogo ? (
                              <div className="relative w-4 h-4 bg-slate-50 dark:bg-slate-900 rounded p-0.5 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                                <img 
                                  src={brandLogo} 
                                  alt={product.brand} 
                                  className="object-contain max-h-full max-w-full" 
                                />
                              </div>
                            ) : null}
                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500">
                              {product.brand}
                            </span>
                          </div>
                        )}

                        <h4 className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white line-clamp-2 min-h-[32px] sm:min-h-[36px] leading-relaxed group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                          {product.title}
                        </h4>

                        <div className="mt-auto pt-2.5 sm:pt-3 border-t border-gray-50 dark:border-gray-800/40 flex flex-col gap-1">
                          {(product.discount ?? 0) > 0 && (
                            <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 line-through font-bold">
                              {product.price.toLocaleString('fa-IR')}
                            </span>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[11px] sm:text-xs font-black ${theme.accentText}`}>
                              {finalPrice.toLocaleString('fa-IR')} {currency}
                            </span>
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${product.stock <= 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-gray-50 dark:bg-gray-900 group-hover:bg-primary-600 dark:group-hover:bg-primary-500 group-hover:text-white'} flex items-center justify-center transition-all duration-300 shadow-3xs`}>
                              <ShoppingBag size={13} className={`transition-transform duration-300 ${product.stock <= 0 ? '' : 'group-hover:scale-110'}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">هیچ محصولی در این بخش یافت نشد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
