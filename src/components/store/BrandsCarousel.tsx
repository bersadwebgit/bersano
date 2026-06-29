'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Award } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl?: string;
}

interface BrandsCarouselProps {
  brands: Brand[];
  title?: string;
  subtitle?: string;
}

export default function BrandsCarousel({ brands, title, subtitle }: BrandsCarouselProps) {
  if (!brands || brands.length === 0) return null;

  // Duplicate brands array to make sure there are enough items to scroll infinitely
  const doubledBrands = [...brands, ...brands, ...brands, ...brands];

  return (
    <section className="py-12 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-950 overflow-hidden" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl tracking-tight flex items-center justify-center gap-2">
            <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            {title || 'برندهای محبوب'}
          </h2>
          {subtitle && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-bold">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Smooth Infinite Scrolling Marquee */}
      <div className="relative w-full flex overflow-x-hidden">
        {/* Gradients to fade out the edges for a clean, minimal look */}
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent dark:from-black z-10 pointer-events-none" />
        <div className="absolute top-0 left-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent dark:from-black z-10 pointer-events-none" />

        <div className="flex gap-16 py-4 animate-marquee whitespace-nowrap min-w-full shrink-0">
          {doubledBrands.map((brand, idx) => {
            const content = (
              <div className="relative w-32 h-14 flex items-center justify-center grayscale opacity-55 hover:grayscale-0 hover:opacity-100 transition-all duration-300 dark:brightness-110 dark:contrast-125">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </div>
            );

            const targetLink = brand.linkUrl || `/shop?brand=${encodeURIComponent(brand.name)}`;

            return (
              <Link 
                key={`${brand.id}-${idx}`} 
                href={targetLink} 
                className="inline-block shrink-0 cursor-pointer"
                title={brand.name}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(50%, 0, 0); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </section>
  );
}
