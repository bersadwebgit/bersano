'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutGrid, List, Heart, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { calculateWholesalePrice } from '@/lib/wholesale';

export interface Product {
  id: string;
  title: string;
  brand?: string | null;
  description?: string | null;
  price: number;
  discount?: number | null;
  imageUrl?: string | null;
  stock: number;
  type?: string;
  categoryId?: string | null;
  isWholesaleOnly?: boolean | null;
}

interface ProductListProps {
  products: Product[];
  brands?: any[];
  onOpenMobileFilters?: () => void;
  activeFiltersCount?: number;
  isWholesalerProp?: boolean;
  wholesaleEnabledProp?: boolean;
}

export default function ProductList({ 
  products, 
  brands = [], 
  onOpenMobileFilters, 
  activeFiltersCount = 0,
  isWholesalerProp,
  wholesaleEnabledProp
}: ProductListProps) {
  const [isClient, setIsClient] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('suggested');
  const [isWholesaler, setIsWholesaler] = useState(isWholesalerProp ?? false);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(wholesaleEnabledProp ?? false);

  const addToCart = useCartStore((state) => state.addToCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  
  const favorites = useFavoritesStore((state) => state.items);
  const addToFavorites = useFavoritesStore((state) => state.addToFavorites);
  const removeFromFavorites = useFavoritesStore((state) => state.removeFromFavorites);

  const isFavorite = (id: string) => favorites.some(item => item.id === id);
  
  // Update state when props change (e.g. on SSR parent update)
  useEffect(() => {
    setIsWholesaler(isWholesalerProp ?? false);
    setWholesaleEnabled(wholesaleEnabledProp ?? false);
  }, [isWholesalerProp, wholesaleEnabledProp]);

  // To avoid hydration errors with localStorage
  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        محصولی یافت نشد.
      </div>
    );
  }

  // Sort products based on selected option
  const sortedProducts = [...products].sort((a, b) => {
    // Out of stock items always go to the end
    if (a.stock <= 0 && b.stock > 0) return 1;
    if (b.stock <= 0 && a.stock > 0) return -1;

    const priceA = a.discount ? a.price - a.discount : a.price;
    const priceB = b.discount ? b.price - b.discount : b.price;

    switch (sortBy) {
      case 'price_asc':
        return priceA - priceB;
      case 'price_desc':
        return priceB - priceA;
      case 'popular':
        // Fallback to stock or id if no sales data
        return b.stock - a.stock;
      case 'suggested':
      default:
        // Original order
        return 0;
    }
  });

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">محصولات</h2>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">مرتب‌سازی:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="suggested">پیشنهاد سایت</option>
              <option value="popular">محبوب‌ترین</option>
              <option value="price_asc">قیمت: کم به زیاد</option>
              <option value="price_desc">قیمت: زیاد به کم</option>
            </select>

            {/* Mobile Filter Button */}
            {onOpenMobileFilters && (
              <button
                onClick={onOpenMobileFilters}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold active:scale-95 transition-all shadow-3xs shrink-0"
              >
                <SlidersHorizontal size={14} className="text-gray-500 dark:text-gray-400" />
                <span>فیلتر</span>
                {activeFiltersCount > 0 && (
                  <span className="flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] w-4.5 h-4.5 rounded-full font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* View Mode Toggles */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-label="نمایش شبکه‌ای"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-label="نمایش لیستی"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Product Container */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6'
            : 'flex flex-col gap-4'
        }
      >
        {sortedProducts.map((product) => {
          const finalPrice = product.discount 
            ? product.price - product.discount 
            : product.price;

          const discountPercent = product.discount && product.price > 0
            ? Math.round((product.discount / product.price) * 100)
            : 0;

          const brandObj = brands?.find(
            b => b.name?.toLowerCase().trim() === product.brand?.toLowerCase().trim()
          );
          const brandLogo = brandObj?.logoUrl;

          return (
            <div
              key={product.id}
              className={`group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100/80 dark:border-gray-800/80 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-700 ${
                viewMode === 'list' ? 'flex flex-row h-36 sm:h-44' : 'flex flex-col h-full'
              } ${product.stock <= 0 ? 'opacity-75' : ''}`}
            >
              <Link href={`/product/${product.id}`} className="absolute inset-0 z-0" aria-label={product.title}></Link>
              
              {/* Favorite Button */}
              <button
                onClick={(e) => toggleFavorite(e, product)}
                className="absolute top-3 left-3 z-10 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:scale-110 active:scale-90 transition-all duration-300 shadow-sm border border-gray-100/50 dark:border-gray-800/50"
                aria-label="افزودن به علاقه‌مندی‌ها"
              >
                <Heart 
                  size={18} 
                  className={`transition-all duration-300 ${isClient && isFavorite(product.id) ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-105"}`} 
                />
              </button>

              {/* Image Section */}
              <div
                className={`relative bg-gray-50/80 dark:bg-gray-800/40 overflow-hidden shrink-0 ${
                  viewMode === 'list' ? 'w-36 sm:w-44 h-36 sm:h-44' : 'w-full aspect-square'
                }`}
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes={viewMode === 'list' ? '176px' : '(max-width: 768px) 50vw, 33vw'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                    <LayoutGrid size={36} className="opacity-20 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}

                {/* Badges */}
                {isWholesaler && wholesaleEnabled && product.isWholesaleOnly ? (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-sm z-10">
                    فقط عمده (B2B)
                  </div>
                ) : product.discount && product.discount > 0 && product.stock > 0 ? (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg shadow-sm z-10 animate-pulse">
                    ٪{discountPercent.toLocaleString('fa-IR')} تخفیف
                  </div>
                ) : null}

                {/* Out of Stock Overlay */}
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl shadow-md border border-gray-100/20 dark:border-gray-800/20 tracking-wider">
                      ناموجود
                    </span>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className={`p-3.5 sm:p-4 flex flex-col justify-between flex-1 ${viewMode === 'list' ? 'py-3' : ''}`}>
                <div>
                  {/* Brand Tag */}
                  {product.brand && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {brandLogo ? (
                        <div className="relative w-4 h-4 bg-slate-50 dark:bg-slate-900 rounded p-0.5 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                          <img 
                            src={brandLogo} 
                            alt={product.brand} 
                            className="object-contain max-h-full max-w-full" 
                          />
                        </div>
                      ) : null}
                      <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                        {product.brand}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-relaxed min-h-[36px] sm:min-h-[40px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 mb-2">
                    {product.title}
                  </h3>
                  
                  {viewMode === 'list' && product.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Footer with Price and CTA */}
                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-gray-800/40 flex items-center justify-between gap-2">
                  {/* Price */}
                  {(() => {
                    if (product.isWholesaleOnly && !(isWholesaler && wholesaleEnabled)) {
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="blur-[4px] select-none text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                            ۱۲,۳۴۵,۶۷۸
                          </span>
                          <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-lg text-center">
                            ویژه همکاران
                          </span>
                        </div>
                      );
                    }

                    if (isWholesaler && wholesaleEnabled) {
                      const wholesalePriceData = calculateWholesalePrice(product, (product as any).moq || 1, { id: '', isWholesaler: true });
                      const hasWholesaleDiscount = wholesalePriceData.unitPrice < product.price;

                      return (
                        <div className="flex flex-col gap-0.5">
                          {hasWholesaleDiscount ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 line-through decoration-red-400/40 font-medium">
                                {product.price.toLocaleString('fa-IR')}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.5 rounded">
                                قیمت همکاری
                              </span>
                            </div>
                          ) : null}
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                              {wholesalePriceData.unitPrice.toLocaleString('fa-IR')}
                            </span>
                            <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium mr-0.5">
                              تومان
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-0.5">
                        {product.discount && product.discount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 line-through decoration-red-400/40 font-medium">
                              {product.price.toLocaleString('fa-IR')}
                            </span>
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-1 py-0.5 rounded">
                              ٪{discountPercent.toLocaleString('fa-IR')}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                            {finalPrice.toLocaleString('fa-IR')}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium mr-0.5">
                            تومان
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* CTA / Quantity Selector */}
                  {(() => {
                    const cartItem = items.find(item => item.id === product.id);
                    const quantity = cartItem ? cartItem.quantity : 0;

                    if (quantity > 0) {
                      return (
                        <div 
                          className="relative z-10 flex items-center bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl overflow-hidden h-9 shadow-sm shadow-blue-100/10 dark:shadow-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (quantity < product.stock) {
                                updateQuantity(product.id, quantity + 1);
                              }
                            }}
                            disabled={quantity >= product.stock}
                            className="w-8 h-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="افزایش تعداد"
                          >
                            <span className="text-lg font-bold leading-none">+</span>
                          </button>
                          <span className="w-6 text-center text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300">
                            {quantity.toLocaleString('fa-IR')}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (quantity === 1) {
                                removeFromCart(product.id);
                              } else {
                                updateQuantity(product.id, quantity - 1);
                              }
                            }}
                            className="w-8 h-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors"
                            aria-label="کاهش تعداد"
                          >
                            <span className="text-lg font-bold leading-none">-</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (product.stock > 0) {
                            addToCart({
                              id: product.id,
                              title: product.title,
                              price: finalPrice,
                              originalPrice: product.price,
                              discount: product.discount,
                              shortInfo: product.description,
                              imageUrl: product.imageUrl || undefined,
                              stockStatus: 'in_stock',
                              currentStock: product.stock,
                              categoryId: product.categoryId || undefined,
                              type: product.type
                            });
                          }
                        }}
                        disabled={product.stock <= 0}
                        className={`relative z-10 text-white rounded-xl transition-all duration-200 active:scale-95 h-9 ${
                          product.stock > 0 
                            ? 'w-9 sm:w-auto sm:px-3.5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-500/10' 
                            : 'px-3 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200/20 dark:border-gray-700/20'
                        }`}
                        aria-label="افزودن به سبد خرید"
                      >
                        {product.stock > 0 ? (
                          <>
                            <ShoppingBag size={16} className="shrink-0" />
                            <span className="hidden sm:inline text-xs font-bold">خرید</span>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold">ناموجود</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
