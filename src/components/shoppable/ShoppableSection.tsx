'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { Sparkles, ShoppingBag, Eye, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';

interface ShoppableItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  items: any[];
}

interface ShoppableSectionProps {
  hasStories: boolean;
}

export default function ShoppableSection({ hasStories }: ShoppableSectionProps) {
  const [shoppableImages, setShoppableImages] = useState<ShoppableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  // Embla Carousel Setup with smooth alignment, snap boundaries, and RTL support
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
    direction: 'rtl'
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
    // Hide swipe hint once the user starts interacting/scrolling
    if (emblaApi.selectedScrollSnap() > 0) {
      setShowSwipeHint(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/shoppable')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setShoppableImages(data);
        }
      })
      .catch(err => {
        console.error(`[ERROR] [ShoppableSection.fetch]: Failed to fetch shoppable images | { error: "${err.message || err}" }`);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
    emblaApi.on('pointerDown', () => setShowSwipeHint(false));
  }, [emblaApi, onSelect]);

  if (isLoading || shoppableImages.length === 0) {
    return null;
  }

  return (
    <div className={`w-full bg-white dark:bg-gray-900 border border-gray-100/70 dark:border-gray-800/80 rounded-3xl shadow-xs overflow-hidden transition-all duration-300 ${
      hasStories ? 'p-3 sm:p-5 mt-2' : 'p-3.5 sm:p-8'
    }`}>
      
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        {/* Right: Title & Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl transition-all duration-300">
            <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 dark:text-white text-sm sm:text-lg tracking-tight">
              خرید تصویری تعاملی
            </h2>
            <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
              روی تصویر ضربه بزنید، نقاط هوشمند را لمس کنید و سریع خرید کنید.
            </p>
          </div>
        </div>

        {/* Left: Navigation Controls (Hidden on mobile to keep it super minimal) */}
        {shoppableImages.length > 1 && (
          <div className="hidden sm:flex items-center gap-2" dir="rtl">
            <button
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className="w-9 h-9 rounded-xl border border-gray-100 dark:border-gray-800/80 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              aria-label="اسلاید قبلی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!canScrollNext}
              className="w-9 h-9 rounded-xl border border-gray-100 dark:border-gray-800/80 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              aria-label="اسلاید بعدی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Shoppable Carousel Viewport */}
      <div className="relative overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex -mr-4 sm:-mr-5">
          {shoppableImages.map((set) => (
            <div
              key={set.id}
              className="flex-[0_0_62%] xs:flex-[0_0_52%] sm:flex-[0_0_45%] md:flex-[0_0_32%] lg:flex-[0_0_25%] min-w-0 pr-4 sm:pr-5 select-none"
            >
              <div className="group relative bg-white dark:bg-gray-950 rounded-2xl border border-gray-100/80 dark:border-gray-800/60 overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <Link
                  href={`/shoppable/${set.slug}`}
                  onClick={() => {
                    fetch('/api/shoppable/track', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ setId: set.id, type: 'view' }),
                    }).catch(err => {
                      console.error(`[ERROR] [ShoppableSection.track]: Tracking failed | { setId: "${set.id}", error: "${err.message || err}" }`);
                    });
                  }}
                  className="block"
                >
                  {/* Image Wrap */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <Image 
                      src={set.imageUrl} 
                      alt={set.name}
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
                      priority
                    />
                    
                    {/* Subtle Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-300" />

                    {/* Floating Interactive Badge (Top Right) */}
                    <span className="absolute top-3 right-3 bg-blue-600/95 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-xs backdrop-blur-xs">
                      خرید تصویری
                    </span>

                    {/* Floating Item Count (Bottom Right) */}
                    <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-white/10">
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                      <span>{set.items?.length || 0} کالا</span>
                    </span>

                    {/* Premium Interactive Hover Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-white/95 dark:bg-gray-900/95 text-blue-600 dark:text-blue-400 p-3.5 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all duration-300">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Minimal Card Details */}
                  <div className="p-3 sm:p-4 bg-white dark:bg-gray-950 transition-colors duration-300">
                    <h3 className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 truncate leading-snug">
                      {set.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">
                      <span>مشاهده و خرید مستقیم</span>
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Elegant Swipe Indicator for Mobile (Fades out smoothly when scrolled or clicked) */}
        {shoppableImages.length > 1 && (
          <div className={`absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white/95 dark:from-gray-900/95 to-transparent pointer-events-none flex items-center justify-center sm:hidden transition-all duration-700 ease-out ${
            showSwipeHint ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
          }`}>
            <div className="flex flex-col items-center gap-1 text-blue-600 dark:text-blue-400">
              <ChevronLeft className="w-5 h-5 animate-bounce" />
              <span className="text-[8px] font-black tracking-widest uppercase opacity-80">بکشید</span>
            </div>
          </div>
        )}
      </div>

      {/* Minimalist Slide Pagination Dots (Highly visible on Mobile) */}
      {shoppableImages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {shoppableImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi && emblaApi.scrollTo(idx)}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === selectedIndex 
                  ? 'w-5 bg-blue-600 dark:bg-blue-400' 
                  : 'w-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300'
              }`}
              aria-label={`برو به اسلاید ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
