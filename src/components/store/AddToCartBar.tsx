'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { ShoppingBag, Plus, Minus, Trash2, FileDown, Bell, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import NotifyMeModal from './NotifyMeModal';
import { calculateWholesalePrice } from '@/lib/wholesale';

interface AddToCartBarProps {
  product: {
    id: string;
    title: string;
    type?: string | null;
    price: number;
    originalPrice?: number;
    discount?: number | null;
    colorName?: string;
    colorCode?: string | null;
    shortInfo?: string | null;
    imageUrl?: string | null;
    stock: number;
    variantId?: string;
    fileFormat?: string | null;
    fileSize?: string | null;
    categoryId?: string | null;
    // Wholesale fields
    wholesalePrice?: number | null;
    wholesaleTiers?: string | any[] | null;
    wholesaleExclusivePrices?: string | any[] | null;
    moq?: number | null;
    wholesaleUnit?: string | null;
    wholesaleUnitSize?: number | null;
    isWholesaleOnly?: boolean | null;
  };
  className?: string;
}

export default function AddToCartBar({ product, className = "" }: AddToCartBarProps) {
  const { items, addToCart, updateQuantity, removeFromCart } = useCartStore();
  const router = useRouter();
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  
  // Wholesaler States
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [orderMode, setOrderMode] = useState<'unit' | 'carton' | 'pallet'>('unit');

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserProfile(data.user);
          setIsWholesaler(!!data.user.isWholesaler);
          setWholesaleEnabled(!!data.wholesaleEnabled);
        }
      })
      .catch(console.error);
  }, []);

  const isWholesaleApplied = isWholesaler && wholesaleEnabled;
  const moq = isWholesaleApplied && product.moq ? Number(product.moq) : 1;
  const unitSize = product.wholesaleUnitSize ? Number(product.wholesaleUnitSize) : 12;
  const wholesaleUnit = product.wholesaleUnit || 'عدد';

  // Find cart item that matches both product ID and variant ID
  const cartItem = items.find(item => 
    item.productId === product.id && 
    item.variantId === product.variantId
  );
  const currentQuantity = cartItem?.quantity || 0;

  // Determine multiplier for the current selected orderMode
  const getMultiplier = () => {
    if (!isWholesaleApplied) return 1;
    if (orderMode === 'carton') return unitSize;
    if (orderMode === 'pallet') return unitSize * 10;
    return 1;
  };

  const multiplier = getMultiplier();

  // Recalculate prices dynamically for wholesaler
  const calculateDisplayPrice = (qty: number) => {
    const calcQty = qty > 0 ? qty : Math.max(moq, multiplier);
    return calculateWholesalePrice(
      {
        price: product.price,
        discount: product.discount,
        wholesalePrice: product.wholesalePrice,
        wholesaleTiers: product.wholesaleTiers,
        wholesaleExclusivePrices: product.wholesaleExclusivePrices
      },
      calcQty,
      isWholesaleApplied ? userProfile : null
    );
  };

  const currentPricing = calculateDisplayPrice(currentQuantity);
  const finalPrice = currentPricing.unitPrice;
  const originalPrice = currentPricing.originalPrice;

  const handleBuyDigital = () => {
    if (currentQuantity === 0) {
      addToCart({
        id: product.id,
        title: product.title,
        price: finalPrice,
        originalPrice: originalPrice,
        discount: product.discount || undefined,
        colorName: product.colorName,
        colorCode: product.colorCode || undefined,
        shortInfo: product.shortInfo || undefined,
        imageUrl: product.imageUrl || undefined,
        variantId: product.variantId,
        currentStock: 999999,
        stockStatus: 'in_stock',
        type: 'digital',
        fileFormat: product.fileFormat,
        fileSize: product.fileSize,
        categoryId: product.categoryId || undefined
      }, 1);
    }
    router.push('/checkout');
  };

  const handleAddToCart = () => {
    if (product.stock > 0) {
      // Wholesalers must start at MOQ or multiplier, whichever is larger
      const initialQty = isWholesaleApplied ? Math.max(moq, multiplier) : 1;
      
      const pricing = calculateDisplayPrice(initialQty);

      addToCart({
        id: product.id,
        title: product.title,
        price: pricing.unitPrice,
        originalPrice: pricing.originalPrice,
        discount: pricing.discountPercent || undefined,
        colorName: product.colorName,
        colorCode: product.colorCode || undefined,
        shortInfo: product.shortInfo || undefined,
        imageUrl: product.imageUrl || undefined,
        variantId: product.variantId,
        currentStock: product.stock,
        stockStatus: 'in_stock',
        type: product.type,
        fileFormat: product.fileFormat,
        fileSize: product.fileSize,
        categoryId: product.categoryId || undefined,
        moq: product.moq || undefined,
        wholesaleUnitSize: product.wholesaleUnitSize || undefined,
        isWholesaleOnly: product.isWholesaleOnly || undefined
      }, initialQty);
    }
  };

  const handleIncrement = () => {
    const nextQty = currentQuantity + multiplier;
    if (nextQty <= product.stock) {
      const pricing = calculateDisplayPrice(nextQty);
      // Update quantity and recalculate price
      updateQuantity(cartItem!.id, nextQty);
      // Update item pricing dynamically inside cart items list
      cartItem!.price = pricing.unitPrice;
      cartItem!.originalPrice = pricing.originalPrice;
      cartItem!.discount = pricing.discountPercent;
    }
  };

  const handleDecrement = () => {
    const nextQty = currentQuantity - multiplier;
    
    // For wholesalers, quantity cannot fall below MOQ or multiplier if they want to keep it in the cart
    const limitQty = isWholesaleApplied ? Math.max(moq, multiplier) : 1;

    if (nextQty >= limitQty) {
      const pricing = calculateDisplayPrice(nextQty);
      updateQuantity(cartItem!.id, nextQty);
      cartItem!.price = pricing.unitPrice;
      cartItem!.originalPrice = pricing.originalPrice;
      cartItem!.discount = pricing.discountPercent;
    } else {
      // Remove entirely if they go below minimum allowed wholesale quantity
      removeFromCart(cartItem!.id);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Wholesaler Unit Selection Panel */}
      {isWholesaleApplied && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4 text-indigo-500" />
              واحد سفارش‌گذاری عمده
            </span>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
              حداقل سفارش: {moq.toLocaleString('fa-IR')} {wholesaleUnit}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOrderMode('unit')}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-xs font-black transition-all ${
                orderMode === 'unit'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{wholesaleUnit} (تکی)</span>
              <span className={`text-[9px] font-bold ${orderMode === 'unit' ? 'text-white/70' : 'text-slate-400'}`}>۱ واحد</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('carton')}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-xs font-black transition-all ${
                orderMode === 'carton'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>کارتن</span>
              <span className={`text-[9px] font-bold ${orderMode === 'carton' ? 'text-white/70' : 'text-slate-400'}`}>{unitSize.toLocaleString('fa-IR')} {wholesaleUnit}</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('pallet')}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-xs font-black transition-all ${
                orderMode === 'pallet'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>پالت</span>
              <span className={`text-[9px] font-bold ${orderMode === 'pallet' ? 'text-white/70' : 'text-slate-400'}`}>{(unitSize * 10).toLocaleString('fa-IR')} {wholesaleUnit}</span>
            </button>
          </div>

          {currentQuantity > 0 && (
            <div className="flex items-center justify-between gap-2 text-[11px] font-black bg-white dark:bg-slate-900/40 px-3 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">در سبد خرید شما:</span>
              <span className="text-slate-800 dark:text-slate-200">
                {currentQuantity.toLocaleString('fa-IR')} {wholesaleUnit}
                {orderMode !== 'unit' && (
                  <span className="text-indigo-500 mr-1">
                    (معادل {(currentQuantity / multiplier).toLocaleString('fa-IR')} {orderMode === 'carton' ? 'کارتن' : 'پالت'})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 pb-safe flex items-center justify-between ${isNotifyOpen ? 'z-[9999]' : 'z-30'} md:static md:p-0 md:border-none md:shadow-none md:bg-transparent md:dark:bg-transparent ${className}`}>
        
        {/* Price Section */}
        <div className="flex flex-col md:hidden">
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {isWholesaleApplied ? 'قیمت عمده' : 'قیمت'}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {finalPrice.toLocaleString('fa-IR')}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">تومان</span>
          </div>
          {originalPrice > finalPrice && (
            <div className="text-xs text-red-500 font-black mt-0.5 flex items-center gap-1">
              <span className="line-through text-gray-400">{originalPrice.toLocaleString('fa-IR')} تومان</span>
              <span>({currentPricing.discountPercent}% تخفیف)</span>
            </div>
          )}
        </div>
        
        {product.type === 'digital' ? (
          <button 
            onClick={handleBuyDigital}
            className="flex items-center justify-center gap-2 px-6 h-[52px] rounded-2xl font-bold transition-all active:scale-95 text-sm w-[65%] md:w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600 dark:text-white"
          >
            <FileDown className="w-5 h-5" />
            {currentQuantity > 0 ? 'تکمیل خرید و دانلود فوری' : 'خرید و دانلود فوری'}
          </button>
        ) : currentQuantity > 0 ? (
          <div className="flex items-center gap-2 w-[60%] md:w-full h-[52px]">
            <Link 
              href="/cart"
              className="flex-1 h-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-500 dark:text-white rounded-2xl font-bold text-xs lg:text-sm transition-colors whitespace-nowrap px-2"
            >
              مشاهده سبد
            </Link>
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shrink-0 h-full">
              <button 
                onClick={handleIncrement}
                disabled={currentQuantity >= product.stock}
                className="w-8 md:w-9 h-full flex items-center justify-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              
              <span className="text-sm font-bold text-gray-900 dark:text-white w-10 text-center">
                {orderMode === 'unit' 
                  ? currentQuantity.toLocaleString('fa-IR') 
                  : (currentQuantity / multiplier).toLocaleString('fa-IR')
                }
                <span className="text-[10px] text-gray-400 block font-normal leading-none mt-0.5">
                  {orderMode === 'unit' ? 'عدد' : orderMode === 'carton' ? 'کارتن' : 'پالت'}
                </span>
              </span>
              
              <button 
                onClick={handleDecrement}
                className="w-8 md:w-9 h-full flex items-center justify-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl shadow-sm transition-colors"
              >
                {currentQuantity <= Math.max(moq, multiplier) ? (
                  <Trash2 className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : product.stock > 0 ? (
          <button 
            onClick={handleAddToCart}
            className={`flex items-center justify-center gap-2 px-6 h-[52px] rounded-2xl font-bold transition-all active:scale-95 text-sm w-[60%] md:w-full text-white shadow-md ${
              isWholesaleApplied
                ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 shadow-indigo-600/20'
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-blue-600/20'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            {isWholesaleApplied ? 'ثبت سفارش عمده' : 'افزودن به سبد خرید'}
          </button>
        ) : (
          <button 
            onClick={() => setIsNotifyOpen(true)}
            className="flex items-center justify-center gap-2 px-6 h-[52px] rounded-2xl font-bold transition-all active:scale-95 text-sm w-[60%] md:w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-white"
          >
            <Bell className="w-5 h-5" />
            موجود شد خبرم کن
          </button>
        )}

        <NotifyMeModal 
          isOpen={isNotifyOpen} 
          onClose={() => setIsNotifyOpen(false)} 
          productId={product.id}
          variantId={product.variantId}
          productTitle={product.title}
        />
      </div>
    </div>
  );
}
