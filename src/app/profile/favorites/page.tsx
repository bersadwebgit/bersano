'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFavoritesStore } from '@/store/favoritesStore';
import { Trash2, HeartCrack, ShoppingCart } from 'lucide-react';

export default function FavoritesPage() {
  const [isClient, setIsClient] = useState(false);
  const favorites = useFavoritesStore((state) => state.items);
  const removeFromFavorites = useFavoritesStore((state) => state.removeFromFavorites);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            محصولات ذخیره شده
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            لیست محصولاتی که برای خرید در آینده ذخیره کرده‌اید
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-h-[500px]">
        {!isClient ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-gray-500 dark:text-gray-400">
            <div className="w-24 h-24 bg-gray-50 dark:bg-[#1a222c] rounded-full flex items-center justify-center mb-6">
              <HeartCrack size={48} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لیست علاقه‌مندی‌ها خالی است</h3>
            <p className="mb-6 text-center max-w-md">شما هنوز هیچ محصولی را به لیست علاقه‌مندی‌های خود اضافه نکرده‌اید.</p>
            <Link 
              href="/" 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <ShoppingCart size={20} />
              مشاهده محصولات فروشگاه
            </Link>
          </div>
        ) : (
          <div className="p-3 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {favorites.map((product) => {
              const finalPrice = product.discount 
                ? product.price - product.discount 
                : product.price;

              const isOutOfStock = product.stock !== undefined && product.stock <= 0;

              return (
                <div key={product.id} className={`bg-gray-50 dark:bg-[#1a222c] p-3 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group flex flex-col ${isOutOfStock ? 'opacity-60 grayscale-[30%]' : ''}`}>
                  <div className="relative aspect-square w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden mb-3">
                    {product.imageUrl ? (
                      <Image 
                        src={product.imageUrl} 
                        alt={product.title} 
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        removeFromFavorites(product.id);
                      }}
                      className="absolute top-2 left-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors z-10"
                      aria-label="حذف از علاقه‌مندی‌ها"
                    >
                      <Trash2 size={16} />
                    </button>
                    {isOutOfStock ? (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        ناموجود
                      </div>
                    ) : product.discount && product.discount > 0 ? (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {product.price > 0 ? Math.round((product.discount / product.price) * 100) : 0}٪
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex flex-col flex-1">
                    <Link href={`/product/${product.id}`} className="font-bold text-gray-900 dark:text-white text-sm hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                      {product.title}
                    </Link>
                    
                    <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-1">
                      <div className="flex flex-col">
                        {product.discount && product.discount > 0 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 line-through">
                              {product.price.toLocaleString('fa-IR')}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white text-sm text-left">
                              {finalPrice.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-gray-500">تومان</span>
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900 dark:text-white text-sm text-left w-full">
                            {finalPrice.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-gray-500">تومان</span>
                          </span>
                        )}
                      </div>
                      <Link 
                        href={`/product/${product.id}`}
                        className="w-full text-center bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 py-1.5 rounded-lg font-medium transition-colors text-xs mt-1"
                      >
                        مشاهده
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          }
          </div>
        )}
      </div>
    </div>
  );
}
