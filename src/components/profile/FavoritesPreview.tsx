'use client';

import { useState, useEffect } from 'react';
import { useFavoritesStore } from '@/store/favoritesStore';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function FavoritesPreview() {
  const [isClient, setIsClient] = useState(false);
  const favorites = useFavoritesStore((state) => state.items);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || favorites.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-purple-500 fill-purple-500" />
          <h2 className="font-bold text-gray-900 dark:text-white md:text-lg">آخرین محصولات ذخیره شده</h2>
        </div>
        <Link href="/profile/favorites" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
          مشاهده همه
        </Link>
      </div>
      <div className="p-4 md:p-6 overflow-x-auto custom-scrollbar">
        <div className="flex gap-4 min-w-max pb-2">
          {favorites.slice(0, 5).map((product) => {
            const finalPrice = product.discount 
              ? product.price - product.discount 
              : product.price;

            const isOutOfStock = product.stock !== undefined && product.stock <= 0;

            return (
              <Link key={product.id} href={`/product/${product.id}`} className={`w-32 md:w-40 flex flex-col group ${isOutOfStock ? 'opacity-60 grayscale-[30%]' : ''}`}>
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2 relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-md">
                      ناموجود
                    </div>
                  )}
                </div>
                <h3 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                  {product.title}
                </h3>
                <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white mt-auto">
                  {finalPrice.toLocaleString('fa-IR')} تومان
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
