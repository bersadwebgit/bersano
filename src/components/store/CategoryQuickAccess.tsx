'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import CategoryIcon from '@/components/CategoryIcon';
import { Folder, ChevronRight, ChevronLeft } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
  customImageUrl?: string | null;
  parentId?: string | null;
  children?: Category[];
}

interface Product {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  discount?: number | null;
  imageUrl?: string | null;
  stock: number;
  categoryId?: string | null;
}

interface CategoryQuickAccessProps {
  categories: Category[];
  products: Product[];
  currency?: string;
  layoutType?: 'list' | 'row'; // 'list' for sidebar layout, 'row' for grid/row of square cards
  isManualSelection?: boolean;
}

const colorPalettes = [
  {
    bg: 'bg-rose-50/70 dark:bg-rose-950/20',
    border: 'border-rose-100/80 dark:border-rose-900/30',
    iconColor: 'text-rose-500 dark:text-rose-400',
    ring: 'group-hover:ring-rose-500/60',
    hoverBg: 'group-hover:bg-rose-100/50 dark:group-hover:bg-rose-950/40',
    hoverText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(244,63,94,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(244,63,94,0.05)]'
  },
  {
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    border: 'border-amber-100/80 dark:border-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    ring: 'group-hover:ring-amber-500/60',
    hoverBg: 'group-hover:bg-amber-100/50 dark:group-hover:bg-amber-950/40',
    hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(245,158,11,0.05)]'
  },
  {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    border: 'border-emerald-100/80 dark:border-emerald-900/30',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    ring: 'group-hover:ring-emerald-500/60',
    hoverBg: 'group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-950/40',
    hoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]'
  },
  {
    bg: 'bg-blue-50/70 dark:bg-blue-950/20',
    border: 'border-blue-100/80 dark:border-blue-900/30',
    iconColor: 'text-blue-500 dark:text-blue-400',
    ring: 'group-hover:ring-blue-500/60',
    hoverBg: 'group-hover:bg-blue-100/50 dark:group-hover:bg-blue-950/40',
    hoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(59,130,246,0.05)]'
  },
  {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    border: 'border-indigo-100/80 dark:border-indigo-900/30',
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    ring: 'group-hover:ring-indigo-500/60',
    hoverBg: 'group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-950/40',
    hoverText: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(99,102,241,0.05)]'
  },
  {
    bg: 'bg-purple-50/70 dark:bg-purple-950/20',
    border: 'border-purple-100/80 dark:border-purple-900/30',
    iconColor: 'text-purple-500 dark:text-purple-400',
    ring: 'group-hover:ring-purple-500/60',
    hoverBg: 'group-hover:bg-purple-100/50 dark:group-hover:bg-purple-950/40',
    hoverText: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(168,85,247,0.05)]'
  },
  {
    bg: 'bg-teal-50/70 dark:bg-teal-950/20',
    border: 'border-teal-100/80 dark:border-teal-900/30',
    iconColor: 'text-teal-500 dark:text-teal-400',
    ring: 'group-hover:ring-teal-500/60',
    hoverBg: 'group-hover:bg-teal-100/50 dark:group-hover:bg-teal-950/40',
    hoverText: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(20,184,166,0.05)]'
  },
  {
    bg: 'bg-orange-50/70 dark:bg-orange-950/20',
    border: 'border-orange-100/80 dark:border-orange-900/30',
    iconColor: 'text-orange-500 dark:text-orange-400',
    ring: 'group-hover:ring-orange-500/60',
    hoverBg: 'group-hover:bg-orange-100/50 dark:group-hover:bg-orange-950/40',
    hoverText: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
    glow: 'group-hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] dark:group-hover:shadow-[0_0_15px_rgba(249,115,22,0.05)]'
  }
];

const getColorClasses = (id: string, index: number) => {
  let hash = 0;
  const str = id || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const paletteIndex = Math.abs(hash + index) % colorPalettes.length;
  return colorPalettes[paletteIndex];
};

export default function CategoryQuickAccess({ 
  categories, 
  products, 
  currency = 'تومان',
  layoutType = 'row',
  isManualSelection = false
}: CategoryQuickAccessProps) {
  // Only use top-level categories (parentId is null or undefined) unless it's a manual selection
  const mainCategories = useMemo(() => {
    if (isManualSelection) return categories;
    return categories.filter(cat => !cat.parentId);
  }, [categories, isManualSelection]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    direction: 'rtl',
    align: 'start',
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

  if (mainCategories.length === 0) return null;

  return (
    <div className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" dir="rtl">
      {/* Premium White Card Container to stand out from the page background */}
      <div className="bg-white dark:bg-gray-900/40 rounded-3xl border border-gray-100/80 dark:border-gray-800/40 p-5 sm:p-6 shadow-sm shadow-gray-100/10 dark:shadow-none">
        
        {/* Ultra-Minimal Section Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-[2px] h-3.5 bg-[var(--primary)] rounded-full inline-block"></span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-wide">
                دسته‌بندی‌های محصولات
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-bold">
                مشاهده سریع محصولات هر دسته
              </p>
            </div>
          </div>

          {/* Minimal Borderless Navigation Buttons */}
          {mainCategories.length > 4 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={scrollNext}
                disabled={nextBtnDisabled}
                className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${
                  nextBtnDisabled
                    ? 'text-gray-200 dark:text-gray-800 cursor-not-allowed'
                    : 'text-gray-400 dark:text-gray-500 hover:text-[var(--primary)] hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
                aria-label="دسته بعدی"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={scrollPrev}
                disabled={prevBtnDisabled}
                className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${
                  prevBtnDisabled
                    ? 'text-gray-200 dark:text-gray-800 cursor-not-allowed'
                    : 'text-gray-400 dark:text-gray-500 hover:text-[var(--primary)] hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
                aria-label="دسته قبلی"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Viewport with horizontal clipping and vertical offset for hover effects */}
        <div className="overflow-hidden pt-4 -mt-4 pb-2 -mb-2" ref={emblaRef}>
          <div className="flex touch-pan-y select-none -mr-4">
            {mainCategories.map((cat, index) => {
              const palette = getColorClasses(cat.id, index);
              return (
                <div
                  key={cat.id}
                  className="flex-[0_0_72px] sm:flex-[0_0_88px] pr-4 min-w-0"
                >
                  <Link
                    href={`/category/${cat.slug}`}
                    className="group flex flex-col items-center text-center transition-all duration-300 relative"
                  >
                    {/* Premium Squircle Container with Double-Ring Dynamic Hover Effect */}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${palette.bg} border ${palette.border} flex items-center justify-center text-xl group-hover:scale-105 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-transparent ${palette.ring} ${palette.hoverBg} ${palette.glow} transition-all duration-300 overflow-hidden relative shadow-sm`}>
                      {cat.customImageUrl || cat.imageUrl ? (
                        <img 
                          src={cat.customImageUrl || cat.imageUrl || ''} 
                          alt={cat.name} 
                          className="w-full h-full object-cover rounded-2xl p-0.5"
                        />
                      ) : (
                        <CategoryIcon 
                          name={cat.icon} 
                          className={`w-5 h-5 ${palette.iconColor} group-hover:scale-110 transition-transform duration-300`} 
                          fallback={<Folder className={`w-5 h-5 ${palette.iconColor}`} />}
                          size={20}
                        />
                      )}
                    </div>
                    
                    {/* Premium Floating Tooltip Text Container */}
                    <div className="relative h-5 w-full mt-2.5 flex items-center justify-center">
                      {/* Default Muted Text */}
                      <span className={`text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 ${palette.hoverText} group-hover:opacity-0 group-hover:scale-90 transition-all duration-200 line-clamp-1 px-0.5 max-w-[64px] sm:max-w-[80px]`}>
                        {cat.name}
                      </span>
                      
                      {/* Floating Tooltip (Fades and slides up on hover) */}
                      <span className="absolute -top-1 opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:-top-2.5 transition-all duration-300 ease-out bg-gray-900/95 dark:bg-white/95 backdrop-blur-sm text-white dark:text-gray-900 text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-lg shadow-black/10 dark:shadow-black/20 border border-white/10 dark:border-gray-200/10 whitespace-nowrap z-30">
                        {cat.name}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ultra-Minimal Brand Color Divider Line (Faded Gradient) */}
        <div className="mt-8 h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/15 to-transparent" />
      </div>
    </div>
  );
}
