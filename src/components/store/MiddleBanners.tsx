'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface MiddleBanner {
  id: string | number;
  imageUrl: string;
  linkUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
  badge?: string | null; // e.g. "کمپین فصلی" or "برند خاص"
  linkText?: string | null; // e.g. "مشاهده" or "خرید آنلاین"
  showOnDesktop?: boolean;
  showOnTablet?: boolean;
  showOnMobile?: boolean;
}

interface MiddleBannersProps {
  banners: MiddleBanner[];
}

export default function MiddleBanners({ banners }: MiddleBannersProps) {
  if (!banners || banners.length === 0) return null;

  // Filter out banners without images
  const activeBanners = banners.filter(banner => !!banner.imageUrl);

  if (activeBanners.length === 0) return null;

  // Determine grid columns based on number of banners
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className="w-full my-8 select-none" dir="rtl">
      <div className={`grid gap-4 lg:gap-6 ${getGridClass(activeBanners.length)}`}>
        {activeBanners.map((banner, index) => {
          // Determine responsive visibility classes based on settings
          const showOnDesktop = banner.showOnDesktop !== false;
          const showOnTablet = banner.showOnTablet !== false;
          const showOnMobile = banner.showOnMobile !== false;

          // If hidden on all devices, don't render
          if (!showOnDesktop && !showOnTablet && !showOnMobile) return null;

          let visibilityClass = '';
          if (!showOnDesktop) {
            // Hidden on desktop (lg and up)
            visibilityClass += ' lg:hidden';
          } else {
            visibilityClass += ' lg:block';
          }

          if (!showOnTablet) {
            // Hidden on tablet (md to lg)
            visibilityClass += ' md:max-lg:hidden';
          } else {
            visibilityClass += ' md:max-lg:block';
          }

          if (!showOnMobile) {
            // Hidden on mobile (below md)
            visibilityClass += ' max-md:hidden';
          } else {
            visibilityClass += ' max-md:block';
          }

          const BannerContent = (
            <div className="relative w-full h-full overflow-hidden rounded-3xl group aspect-[2/1] sm:aspect-[2.5/1] md:aspect-[3/1] lg:aspect-[2.2/1] bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all duration-300">
              {/* Image */}
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title || `بنر تبلیغاتی ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/30 to-transparent dark:from-black/80 dark:via-black/40 dark:to-transparent" />
              </div>

              {/* Text / Content */}
              <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 z-10 text-white">
                {/* Top Row: Badge */}
                <div>
                  {banner.badge && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
                      {banner.badge}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Title, Subtitle, and CTA */}
                <div className="space-y-2 max-w-[80%] sm:max-w-[70%]">
                  {banner.title && (
                    <h3 className="text-sm sm:text-base md:text-lg font-black leading-tight drop-shadow-md">
                      {banner.title}
                    </h3>
                  )}
                  {banner.subtitle && (
                    <p className="text-[10px] sm:text-xs text-slate-200 font-medium line-clamp-2 drop-shadow-sm">
                      {banner.subtitle}
                    </p>
                  )}
                  
                  {banner.linkUrl && (
                    <div className="pt-2 flex items-center gap-1 text-xs font-black text-white group-hover:text-indigo-200 transition-colors duration-200">
                      <span>{banner.linkText || 'مشاهده و خرید'}</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

          if (banner.linkUrl) {
            return (
              <Link 
                key={banner.id || index} 
                href={banner.linkUrl}
                className={`w-full h-full ${visibilityClass.trim()}`}
              >
                {BannerContent}
              </Link>
            );
          }

          return (
            <div key={banner.id || index} className={`w-full h-full ${visibilityClass.trim()}`}>
              {BannerContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
