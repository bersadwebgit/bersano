import React from 'react';

// A single animated pulse placeholder
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-zinc-800 rounded-lg ${className}`} />
  );
}

// Mimics the modern Header component
export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-black/85 backdrop-blur-md border-b border-gray-100 dark:border-zinc-900">
      {/* Top micro-banner height mimic */}
      <div className="h-1 bg-primary/20 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Right side: Logo & Brand */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
          <Skeleton className="w-24 sm:w-32 h-6" />
        </div>
        
        {/* Center: Search box (hidden on mobile, shown on md+) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          <Skeleton className="w-full h-11 rounded-full" />
        </div>
        
        {/* Left side: Profile & Basket */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </div>
      {/* Menu / Navigation bar */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 py-3 border-t border-gray-50 dark:border-zinc-900/50">
        <div className="flex items-center gap-6">
          <Skeleton className="w-20 h-5" />
          <Skeleton className="w-24 h-5" />
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-28 h-5" />
        </div>
      </div>
    </header>
  );
}

// Mimics the circular story lists
export function StoryListSkeleton() {
  return (
    <div className="flex items-center gap-5 overflow-x-auto py-3 px-1 no-scrollbar select-none">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
          <div className="p-1 rounded-full border border-gray-200 dark:border-zinc-800 animate-pulse">
            <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
          </div>
          <Skeleton className="w-12 h-3" />
        </div>
      ))}
    </div>
  );
}

// Mimics the main Hero banner slider
export function HeroSliderSkeleton() {
  return (
    <div className="w-full relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-900 aspect-[16/9] sm:aspect-[21/9]">
      <Skeleton className="w-full h-full rounded-2xl sm:rounded-3xl" />
      {/* Indicator dots bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        <Skeleton className="w-2.5 h-2.5 rounded-full" />
        <Skeleton className="w-6 h-2.5 rounded-full" />
        <Skeleton className="w-2.5 h-2.5 rounded-full" />
      </div>
    </div>
  );
}

// Mimics Sidebar filters
export function SidebarSkeleton() {
  return (
    <aside className="w-full lg:w-64 space-y-6 shrink-0">
      {/* Category list filter block */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900 space-y-4">
        <Skeleton className="w-28 h-6 mb-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="w-24 h-4" />
            </div>
            <Skeleton className="w-6 h-4 rounded-full" />
          </div>
        ))}
      </div>

      {/* Brand list filter block */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900 space-y-4">
        <Skeleton className="w-20 h-6 mb-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-20 h-4" />
          </div>
        ))}
      </div>

      {/* Price filter block */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900 space-y-4">
        <Skeleton className="w-24 h-6 mb-2" />
        <Skeleton className="w-full h-2 rounded-full" />
        <div className="flex justify-between gap-4">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
    </aside>
  );
}

// Mimics the individual Product Cards
export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100/80 dark:border-zinc-800/80 overflow-hidden flex flex-col h-full shadow-3xs">
      {/* Image Area */}
      <div className="relative aspect-square w-full">
        <Skeleton className="w-full h-full rounded-b-none" />
        {/* Fav icon placeholder */}
        <div className="absolute top-3 left-3">
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Brand */}
          <Skeleton className="w-14 h-3.5" />
          {/* Title */}
          <Skeleton className="w-full h-5" />
          <Skeleton className="w-4/5 h-5" />
        </div>
        
        <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-zinc-800/50">
          {/* Price & Add to cart button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-12 h-3" />
            </div>
            <Skeleton className="w-9 h-9 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Mimics a grid of product cards with filter bar controls
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="w-full space-y-6">
      {/* Sort & Controls Bar skeleton */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-900">
        <Skeleton className="w-24 h-6" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-36 h-9 rounded-lg" />
          <Skeleton className="w-16 h-9 rounded-lg" />
        </div>
      </div>
      {/* The cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Full page template for Home/Shop
export function ShopPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0">
      <HeaderSkeleton />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-6 mt-4 sm:mt-6">
        {/* Stories row */}
        <StoryListSkeleton />
        
        {/* Large Banner */}
        <HeroSliderSkeleton />
        
        {/* Main Content: Sidebar + Products */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 pt-4">
          <div className="hidden lg:block">
            <SidebarSkeleton />
          </div>
          <div className="flex-1">
            <ProductGridSkeleton count={8} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Mimics the exact layout of a product detail page (e.g., product/[id])
export function ProductDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0">
      <HeaderSkeleton />
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-12 h-4" />
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-zinc-700 animate-pulse" />
          <Skeleton className="w-20 h-4" />
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-zinc-700 animate-pulse" />
          <Skeleton className="w-32 h-4" />
        </div>

        {/* Main section: Left-Right details layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-100 dark:border-zinc-800">
          {/* Gallery side: 5 columns */}
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="w-full aspect-square rounded-2xl" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          {/* Details side: 7 columns */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Brand and badges */}
              <div className="flex items-center justify-between">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              
              {/* Product Title */}
              <Skeleton className="w-full h-8 sm:h-10" />
              <Skeleton className="w-3/4 h-8 sm:h-10" />
              
              {/* Review summary stars */}
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-12 h-4" />
              </div>

              {/* Attributes & features list short */}
              <div className="py-4 border-y border-gray-50 dark:border-zinc-800 space-y-3">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-5/6 h-4" />
                <Skeleton className="w-4/5 h-4" />
              </div>
            </div>

            {/* Purchase action block */}
            <div className="bg-gray-50 dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl space-y-4 border border-gray-100/50 dark:border-zinc-900">
              <div className="flex items-center justify-between">
                <Skeleton className="w-20 h-5" />
                <div className="text-right">
                  <Skeleton className="w-32 h-7" />
                  <Skeleton className="w-16 h-4 mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Product tabs skeleton */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 space-y-4">
          <div className="flex gap-4 border-b border-gray-100 dark:border-zinc-800 pb-3">
            <Skeleton className="w-28 h-8 rounded-lg" />
            <Skeleton className="w-24 h-8 rounded-lg" />
            <Skeleton className="w-32 h-8 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="w-full h-5" />
            <Skeleton className="w-full h-5" />
            <Skeleton className="w-5/6 h-5" />
            <Skeleton className="w-4/5 h-5" />
          </div>
        </div>

        {/* Related products slider row */}
        <div className="space-y-4">
          <Skeleton className="w-44 h-7" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Mimics a Blog List page
export function BlogPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0">
      <HeaderSkeleton />
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        <div className="text-center space-y-2">
          <Skeleton className="w-48 h-8 mx-auto" />
          <Skeleton className="w-72 h-4 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 space-y-4 pb-4">
              <Skeleton className="w-full aspect-[16/10]" />
              <div className="px-4 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="w-16 h-5 rounded-full" />
                  <Skeleton className="w-20 h-5" />
                </div>
                <Skeleton className="w-full h-6" />
                <Skeleton className="w-4/5 h-4" />
                <div className="pt-2 flex justify-between items-center">
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Mimics a Blog Detail / Article page
export function BlogDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans">
      <HeaderSkeleton />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Meta details & back link */}
        <div className="flex items-center justify-between">
          <Skeleton className="w-20 h-5" />
          <Skeleton className="w-28 h-5" />
        </div>

        {/* Big article title */}
        <Skeleton className="w-full h-10 sm:h-12" />
        <Skeleton className="w-2/3 h-10 sm:h-12" />

        {/* Author & date row */}
        <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-zinc-800/80">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>

        {/* Featured Image */}
        <Skeleton className="w-full aspect-[21/9] rounded-2xl" />

        {/* Content paragraph blocks */}
        <div className="space-y-4 pt-4">
          <Skeleton className="w-full h-5" />
          <Skeleton className="w-full h-5" />
          <Skeleton className="w-5/6 h-5" />
          <Skeleton className="w-full h-5" />
          <Skeleton className="w-4/5 h-5" />
          <div className="py-2" />
          <Skeleton className="w-3/4 h-7" />
          <div className="py-1" />
          <Skeleton className="w-full h-5" />
          <Skeleton className="w-11/12 h-5" />
          <Skeleton className="w-full h-5" />
        </div>
      </main>
    </div>
  );
}
