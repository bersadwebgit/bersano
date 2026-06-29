'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';

export interface RelatedProduct {
  id: string;
  title: string;
  imageUrl?: string | null;
  price: number;
  discount?: number | null;
  isSpecial?: boolean;
  stock?: number;
}

interface RelatedProductsStoriesProps {
  products: RelatedProduct[];
}

export default function RelatedProductsStories({ products }: RelatedProductsStoriesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="w-full py-6 md:py-10 bg-white dark:bg-gray-900 md:bg-transparent md:dark:bg-transparent border-t border-gray-100 dark:border-gray-850 md:border-t-0 mt-8 md:mt-12" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 md:px-0">
        {/* Section Title with Navigation Buttons */}
        <div className="flex items-center justify-between mb-5 md:mb-7">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 md:w-2 md:h-6 bg-blue-600 rounded-full"></span>
            <h2 className="text-base md:text-xl font-black text-gray-900 dark:text-white">
              محصولات مرتبط دیگر
            </h2>
          </div>

          {/* Desktop Navigation Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 flex items-center justify-center border border-gray-200/60 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm cursor-pointer"
              aria-label="Next related products"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 flex items-center justify-center border border-gray-200/60 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm cursor-pointer"
              aria-label="Previous related products"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel (Scroll Container) */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-3.5 md:gap-5 pb-5 px-1 -mx-1 scrollbar-none snap-x snap-mandatory touch-pan-y"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product, index) => {
            const finalPrice = product.discount 
              ? product.price - product.discount 
              : product.price;

            const discountPercent = product.discount && product.price > 0
              ? Math.round((product.discount / product.price) * 100)
              : 0;

            // First item or isSpecial gets the ویژه status badge
            const isLive = index === 0 || product.isSpecial;

            return (
              <div
                key={product.id}
                className={`flex-[0_0_130px] xs:flex-[0_0_145px] md:flex-[0_0_200px] aspect-[10/16] relative rounded-[18px] md:rounded-[24px] overflow-hidden group shadow-md hover:shadow-xl border border-gray-100/5 dark:border-gray-800/80 transition-all duration-300 snap-start bg-gray-50 dark:bg-gray-950 ${product.stock !== undefined && product.stock <= 0 ? 'opacity-60 grayscale-[30%]' : ''}`}
              >
                {/* Image background */}
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 z-0"
                    sizes="(max-width: 768px) 145px, 200px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-150 dark:bg-gray-900 z-0">
                    <span className="text-gray-400 dark:text-gray-600 text-[10px]">بدون تصویر</span>
                  </div>
                )}

                {/* Dark Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10 group-hover:via-black/45 transition-colors duration-300 z-10 pointer-events-none" />

                {/* Action Link overlay */}
                <Link href={`/product/${product.id}`} className="absolute inset-0 z-30" aria-label={product.title} />

                {/* Dynamic Status Badges (Top Left) */}
                <div className="absolute top-2.5 right-2.5 z-20">
                  {product.stock !== undefined && product.stock <= 0 ? (
                    <div className="bg-gray-500 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg shadow-md">
                      ناموجود
                    </div>
                  ) : isLive ? (
                    <div className="bg-[#00E676] text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg flex items-center gap-1 md:gap-1.5 shadow-md">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                      <span>ویژه</span>
                    </div>
                  ) : product.discount && product.discount > 0 ? (
                    <div className="bg-red-500 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg shadow-md flex items-center gap-0.5">
                      ٪{discountPercent.toLocaleString('fa-IR')} تخفیف
                    </div>
                  ) : (
                    <div className="bg-blue-500 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg shadow-md">
                      جدید
                    </div>
                  )}
                </div>

                {/* Shopping/Cart Button Overlay (Center) - Requested replacement for play button */}
                <div className="absolute inset-0 m-auto w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20 transition-all duration-300 group-hover:scale-110 active:scale-95 z-20 pointer-events-none">
                  {product.stock !== undefined && product.stock <= 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 md:w-5.5 md:h-5.5 text-white">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  ) : (
                    <ShoppingCart className="w-4.5 h-4.5 md:w-5.5 md:h-5.5 text-white fill-transparent" />
                  )}
                </div>

                {/* Product Text Details (Bottom Overlay) */}
                <div className="absolute bottom-3 left-2.5 right-2.5 md:bottom-4 md:left-3 md:right-3 z-20 flex flex-col gap-0.5 md:gap-1 text-white pointer-events-none">
                  {/* Action Help Tag */}
                  <span className="text-[8px] md:text-[10px] text-gray-300 font-bold opacity-85 truncate">
                    مشاهده جزئیات محصول
                  </span>

                  {/* Title */}
                  <h3 className="text-[10px] xs:text-[11px] md:text-sm font-extrabold text-white line-clamp-1 truncate w-full drop-shadow-md">
                    {product.title}
                  </h3>

                  {/* Price */}
                  <div className="flex flex-col mt-0.5">
                    {(product.discount ?? 0) > 0 && (
                      <span className="text-[8px] md:text-[10px] text-gray-400 line-through font-bold opacity-75 decoration-red-500/50">
                        {product.price.toLocaleString('fa-IR')} تومان
                      </span>
                    )}
                    <span className="text-[10px] xs:text-[11px] md:text-sm font-black text-[#00E676] drop-shadow-sm">
                      {finalPrice.toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
