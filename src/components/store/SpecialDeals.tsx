'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Timer, Flame, ShoppingBag, Bell, BellOff, CheckCircle, ChevronLeft, ChevronRight, Percent } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

export interface SpecialProduct {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  discount?: number | null;
  imageUrl?: string | null;
  stock: number;
  type?: string;
  specialEndsAt?: Date | string | null;
  createdAt?: Date | string | null;
  soldCount?: number;
  categoryId?: string | null;
}

interface SpecialDealsProps {
  products: SpecialProduct[];
  limit?: number;
}

export default function SpecialDeals({ products, limit = 4 }: SpecialDealsProps) {
  const [isClient, setIsClient] = useState(false);
  const addToCart = useCartStore((state) => state.addToCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!products || products.length === 0) return null;

  const nowTime = new Date().getTime();
  
  const activeProducts = products.filter(product => {
    if (product.stock <= 0) return false;
    if (!product.specialEndsAt) return true;
    const end = new Date(product.specialEndsAt).getTime();
    return end > nowTime;
  });

  const displayProducts = activeProducts.slice(0, Math.max(limit, 12));

  if (displayProducts.length === 0) return null;

  // Initialize Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: displayProducts.length > 2, 
      direction: 'rtl', 
      align: 'start',
      containScroll: 'trimSnaps'
    }, 
    [
      Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
    ]
  );

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(false);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(false);

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

  return (
    <div className="w-full px-4 lg:px-8 max-w-7xl mx-auto my-10" dir="rtl">
      {/* Container with a vibrant, eye-catching red/rose gradient background */}
      <div className="bg-gradient-to-r from-red-600 to-rose-500 dark:from-red-700 dark:to-rose-600 rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-24 -translate-y-24 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-950/20 rounded-full translate-x-32 translate-y-32 blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-white/20 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl text-white">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-black text-white leading-tight">پیشنهاد شگفت‌انگیز روز</h2>
              <p className="text-[11px] text-red-100 font-bold mt-1">فرصت محدود برای خرید با تخفیف‌های استثنایی</p>
            </div>
          </div>

          {/* Navigation Arrows */}
          {displayProducts.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={scrollNext}
                disabled={nextBtnDisabled}
                className="p-2.5 rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white hover:text-red-600 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                aria-label="پیشنهاد بعدی"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={scrollPrev}
                disabled={prevBtnDisabled}
                className="p-2.5 rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white hover:text-red-600 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                aria-label="پیشنهاد قبلی"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Viewport */}
        <div className="overflow-hidden relative z-10" ref={emblaRef}>
          <div className="flex touch-pan-y -mr-4">
            {displayProducts.map((product) => (
              <div
                key={product.id}
                className="flex-[0_0_72%] sm:flex-[0_0_46%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] pr-4 min-w-0"
              >
                <DealCard
                  product={product}
                  isClient={isClient}
                  addToCart={addToCart}
                  items={items}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DealCardProps {
  product: SpecialProduct;
  isClient: boolean;
  addToCart: any;
  items: any[];
  updateQuantity: any;
  removeFromCart: any;
}

function DealCard({ product, isClient, addToCart, items, updateQuantity, removeFromCart }: DealCardProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isReminderSet, setIsReminderSet] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Realtime Countdown Timer
  useEffect(() => {
    if (!product.specialEndsAt) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(product.specialEndsAt!) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [product.specialEndsAt]);

  // Load reminder state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`reminder-${product.id}`);
      if (saved === 'true') {
        setIsReminderSet(true);
      }
    }
  }, [product.id]);

  const handleToggleReminder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isReminderSet;
    setIsReminderSet(nextState);
    localStorage.setItem(`reminder-${product.id}`, nextState ? 'true' : 'false');
    
    if (nextState) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const finalPrice = product.discount 
    ? product.price - product.discount 
    : product.price;

  const discountPercent = product.discount && product.price > 0
    ? Math.round((product.discount / product.price) * 100)
    : 0;

  const cartItem = items.find(item => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Real Urgency Progress Bar calculation (Percentage of sold items)
  const getSoldPercentage = () => {
    if (product.stock <= 0) return 100;
    const sold = product.soldCount || 0;
    const total = product.stock + sold;
    if (total <= 0) return 0;
    return Math.round((sold / total) * 100);
  };

  const soldPercent = getSoldPercentage();

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl p-3 border border-slate-100 dark:border-slate-900 hover:border-rose-200/50 dark:hover:border-rose-950/30 hover:shadow-md transition-all duration-300 flex flex-col h-full group relative">
      {/* Product Image Container */}
      <div className="relative bg-slate-50 dark:bg-slate-900/40 rounded-xl overflow-hidden aspect-square w-full shrink-0">
        <Link href={`/product/${product.id}`} className="absolute inset-0 z-10" />
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-102 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 250px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
            <ShoppingBag size={36} className="opacity-40" />
          </div>
        )}
        
        {/* Elegant Discount Badge */}
        {(product.discount ?? 0) > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-sm z-20 flex items-center gap-0.5" dir="ltr">
            {discountPercent}%-
          </div>
        )}

        {/* Reminder Button (Bell) */}
        <button
          onClick={handleToggleReminder}
          className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md z-30 transition-all shadow-sm border border-white/10 ${
            isReminderSet 
              ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
              : 'bg-black/30 text-white hover:bg-black/50'
          }`}
          title={isReminderSet ? "یادآوری فعال است" : "یادآوری آفر بعدی"}
          aria-label={isReminderSet ? "غیرفعال‌کردن یادآوری آفر بعدی" : "یادآوری آفر بعدی"}
          aria-pressed={isReminderSet}
        >
          {isReminderSet ? <BellOff size={12} className="animate-swing" /> : <Bell size={12} />}
        </button>

        {/* Reminder Toast Notification */}
        {showToast && (
          <div className="absolute inset-x-2 bottom-2 bg-emerald-600 text-white text-[9px] font-bold py-1 px-1.5 rounded-lg z-40 flex items-center gap-1 justify-center shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle size={11} />
            <span>یادآوری آفر بعدی تنظیم شد!</span>
          </div>
        )}

        {/* Integrated Minimal Countdown Overlay */}
        {product.specialEndsAt && !showToast && (
          <div className="absolute bottom-2 inset-x-2 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md py-1 px-2 rounded-xl flex items-center justify-between text-[9px] font-bold text-slate-700 dark:text-slate-300 border border-white/20 dark:border-slate-800/30 z-20">
            <span className="flex items-center gap-1 text-red-500">
              <Timer size={11} className="animate-pulse" />
              <span>فرصت خرید:</span>
            </span>
            <span className="font-mono tracking-wider" dir="ltr">
              {timeLeft.hours.toString().padStart(2, '0')}:{timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Product Info & Action Section */}
      <div className="flex-1 flex flex-col justify-between mt-3">
        <div className="space-y-2">
          {/* Title */}
          <Link href={`/product/${product.id}`}>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-2 hover:text-red-500 dark:hover:text-red-400 transition-colors leading-relaxed min-h-[36px]">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Progress & Price / Cart Area */}
        <div className="space-y-3 mt-3">
          {/* Minimal Urgency Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-red-500 dark:text-red-400">
                {soldPercent}% فروخته شده
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                {product.stock.toLocaleString('fa-IR')} عدد مانده
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-l from-red-500 to-rose-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${soldPercent}%` }}
              />
            </div>
          </div>

          {/* Pricing & Add to Cart */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-50 dark:border-slate-900/60">
            <div className="flex flex-col min-w-0">
              {(product.discount ?? 0) > 0 && (
                <span className="text-[10px] text-slate-400 line-through font-bold truncate">
                  {product.price.toLocaleString('fa-IR')}
                </span>
              )}
              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                {finalPrice.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-500">تومان</span>
              </span>
            </div>

            {/* Cart Controller */}
            {isClient && (() => {
              if (quantity > 0) {
                return (
                  <div 
                    className="flex items-center bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl overflow-hidden h-7 relative z-20"
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
                      className="w-6 h-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                      aria-label="افزایش تعداد"
                    >
                      <span className="text-xs font-black leading-none">+</span>
                    </button>
                    <span className="w-4 text-center text-[10px] font-black text-red-700 dark:text-red-400">
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
                      className="w-6 h-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-colors"
                      aria-label="کاهش تعداد"
                    >
                      <span className="text-xs font-black leading-none">-</span>
                    </button>
                  </div>
                );
              }

              return (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                  }}
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 active:scale-95 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all shadow-sm shadow-red-500/10 hover:shadow-md relative z-20 shrink-0"
                >
                  <ShoppingBag size={12} />
                  <span>افزودن</span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
