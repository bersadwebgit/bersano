'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AddToCartBar from './AddToCartBar';
import { calculateWholesalePrice } from '@/lib/wholesale';
import { useCartStore } from '@/store/cartStore';
import { Tag, ShieldAlert, Award, Package2, TrendingDown, CheckCircle2, ChevronDown } from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  colorCode?: string | null;
  imageUrl?: string | null;
  price: number;
  stock: number;
  isDefault?: boolean;
}

interface ProductPurchaseSectionProps {
  product: {
    id: string;
    title: string;
    type?: string | null;
    price: number;
    discount?: number | null;
    imageUrl?: string | null;
    description?: string | null;
    stock: number;
    variants?: Variant[];
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
  selectedVariantId: string | null;
  onVariantChange: (id: string) => void;
}

export default function ProductPurchaseSection({ product, selectedVariantId }: ProductPurchaseSectionProps) {
  const hasVariants = product.variants && product.variants.length > 0;

  const selectedVariant = hasVariants
    ? product.variants!.find(v => v.id === selectedVariantId)
    : null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const finalPrice = product.discount 
    ? currentPrice - product.discount 
    : currentPrice;
  const currentStock = selectedVariant ? selectedVariant.stock : (hasVariants ? 0 : product.stock);
  const discountPercent = product.discount && currentPrice > 0
    ? Math.round((product.discount / currentPrice) * 100)
    : 0;

  // Wholesale States
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserProfile(data.user);
          setIsWholesaler(!!data.user.isWholesaler);
          setWholesaleEnabled(!!data.wholesaleEnabled);
          setContactPhone(data.contactPhone || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, []);

  const isWholesaleApplied = isWholesaler && wholesaleEnabled;

  // Dynamic Wholesale Price Calculation
  const wholesalePricing = calculateWholesalePrice(
    {
      price: product.price,
      discount: product.discount,
      wholesalePrice: product.wholesalePrice,
      wholesaleTiers: product.wholesaleTiers,
      wholesaleExclusivePrices: product.wholesaleExclusivePrices
    },
    isWholesaleApplied && product.moq ? Number(product.moq) : 1,
    isWholesaleApplied ? userProfile : null
  );

  // Parse Tiers (safe) and normalize legacy field names
  let rawTiers: any[] = [];
  if (product.wholesaleTiers) {
    try {
      rawTiers = typeof product.wholesaleTiers === 'string'
        ? JSON.parse(product.wholesaleTiers)
        : product.wholesaleTiers;
    } catch (e) {}
  }
  const tiers = (Array.isArray(rawTiers) ? rawTiers : [])
    .map(t => ({
      minQty: t.minQty ?? t.minQuantity ?? 0,
      maxQty: t.maxQty ?? t.maxQuantity ?? null,
      discountPercent: t.discountPercent ?? 0,
    }))
    .sort((a, b) => a.minQty - b.minQty);

  // Current quantity of this product/variant already in the cart (to highlight the active tier)
  const cartItems = useCartStore((state) => state.items);
  const currentCartQty = cartItems
    .filter(item => item.productId === product.id && (selectedVariantId ? item.variantId === selectedVariantId : true))
    .reduce((sum, item) => sum + item.quantity, 0);

  const lowStock = product.stock > 0 && product.stock <= (Number(product.moq) || 1) * 2;
  const maxTierDiscount = tiers.reduce((max, t) => Math.max(max, t.discountPercent || 0), 0);
  const [tiersExpanded, setTiersExpanded] = useState(false);

  return (
    <div className="w-full">
      {/* Wholesaler info Banner (compact) */}
      {isWholesaleApplied && (
        <div className="mb-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 overflow-hidden bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-indigo-600 to-violet-600 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white">
              <Award className="w-4 h-4" />
              <span className="text-[11px] font-black">پنل خرید عمده</span>
            </div>
            <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
              lowStock ? 'bg-amber-400 text-amber-950' : 'bg-white/20 text-white'
            }`}>
              <Package2 className="w-3 h-3" />
              {product.stock.toLocaleString('fa-IR')} عدد موجود
            </span>
          </div>

          {/* Tiers (collapsible) */}
          {tiers.length > 0 && (
            <div className="p-2.5">
              <button
                type="button"
                onClick={() => setTiersExpanded(prev => !prev)}
                className="w-full flex items-center justify-between gap-2 text-[11px] font-black text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-indigo-500" />
                  تخفیف خرید حجمی تا {maxTierDiscount.toLocaleString('fa-IR')}٪
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${tiersExpanded ? 'rotate-180' : ''}`} />
              </button>

              {tiersExpanded && (
                <div className="space-y-1.5 mt-2.5">
                  {tiers.map((tier, idx) => {
                    const isActive = currentCartQty > 0 && currentCartQty >= tier.minQty && (tier.maxQty === null || currentCartQty <= tier.maxQty);
                    return (
                      <div 
                        key={idx} 
                        className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <span className={`flex items-center gap-1 ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {isActive && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                          {tier.minQty.toLocaleString('fa-IR')} تا {tier.maxQty ? tier.maxQty.toLocaleString('fa-IR') : '∞'}
                        </span>
                        <span className={`font-black px-1.5 py-0.5 rounded ${isActive ? 'bg-emerald-500 text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {tier.discountPercent.toLocaleString('fa-IR')}٪
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop Price Details */}
      {wholesaleEnabled && product.isWholesaleOnly && !isWholesaleApplied && !loadingProfile ? (
        <div className="hidden md:block border-t border-gray-100 dark:border-gray-800 pt-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 text-sm">قیمت عمده‌فروشی:</span>
            <div className="text-left relative">
              <div className="filter blur-[6px] select-none pointer-events-none text-2xl font-bold text-gray-900 dark:text-white">
                {Number(product.wholesalePrice || 1250000).toLocaleString('fa-IR')} <span className="text-sm font-normal">تومان</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-xs font-black px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                  مخصوص خریداران عمده
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 border border-indigo-100/50 dark:border-indigo-900/30 p-5 rounded-2xl text-center space-y-4">
            {userProfile ? (
              <>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                  شما با حساب کاربری عادی وارد شده‌اید. این محصول صرفاً به صورت عمده به فروش می‌رسد. برای ارتقای حساب خود به «همکار» و دسترسی به قیمت‌های عمده، لطفا با پشتیبانی فروشگاه تماس بگیرید.
                </p>
                {contactPhone ? (
                  <a href={`tel:${contactPhone}`} className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95">
                    تماس با پشتیبانی ({contactPhone})
                  </a>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    لطفا با پشتیبانی تماس بگیرید
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                  این محصول صرفاً به صورت عمده به فروش می‌رسد. برای مشاهده قیمت‌های همکاری و ثبت سفارش، لطفا وارد حساب کاربری همکار شوید یا ثبت‌نام کنید.
                </p>
                <Link href={`/login?redirect=/product/${product.id}`} className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95">
                  ورود / ثبت‌نام همکار B2B
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:block border-t border-gray-100 dark:border-gray-800 pt-5 mb-6">
          {/* Stock status */}
          <div className="flex items-center gap-1.5 mb-4 text-xs font-bold">
            {currentStock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {currentStock <= 5 ? `تنها ${currentStock.toLocaleString('fa-IR')} عدد در انبار` : 'موجود در انبار'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-500">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                ناموجود
              </span>
            )}
          </div>

          <div className="mb-5">
            {isWholesaleApplied ? (
              <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-indigo-700 dark:text-indigo-400 text-xs font-black">
                    {wholesalePricing.discountPercent > 0 ? 'قیمت همکار با تخفیف حجمی' : 'قیمت پایه همکار'}
                  </span>
                  {wholesalePricing.discountPercent > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0">
                      {wholesalePricing.discountPercent.toLocaleString('fa-IR')}٪ تخفیف پله‌ای
                    </span>
                  )}
                </div>
                {product.price > wholesalePricing.unitPrice && (
                  <div className="text-gray-400 line-through text-sm mb-0.5">
                    {product.price.toLocaleString('fa-IR')} تومان
                  </div>
                )}
                <div className="text-[26px] font-black text-indigo-700 dark:text-indigo-300 leading-tight">
                  {wholesalePricing.unitPrice.toLocaleString('fa-IR')} <span className="text-sm text-gray-500 font-normal">تومان</span>
                  <span className="text-xs text-gray-400 font-normal mr-1">/ هر واحد</span>
                </div>
                {product.price > wholesalePricing.unitPrice && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                    سود شما در هر واحد: {(product.price - wholesalePricing.unitPrice).toLocaleString('fa-IR')} تومان
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span className="text-gray-500 text-xs block mb-1.5">قیمت برای شما</span>
                {product.discount && product.discount > 0 ? (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-lg shrink-0">
                      ٪{discountPercent.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-gray-400 line-through text-sm">{currentPrice.toLocaleString('fa-IR')} تومان</span>
                  </div>
                ) : null}
                <div className="text-[26px] font-black text-gray-900 dark:text-white leading-tight">
                  {finalPrice.toLocaleString('fa-IR')} <span className="text-sm text-gray-500 font-normal">تومان</span>
                </div>
                {product.discount && product.discount > 0 ? (
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                    {product.discount.toLocaleString('fa-IR')} تومان سود شما از این خرید
                  </div>
                ) : null}

                {/* Blurred Wholesale Price for Mixed Products */}
                {isWholesaler && wholesaleEnabled && product.wholesalePrice && product.wholesalePrice > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span>قیمت عمده‌فروشی:</span>
                    <div className="relative inline-block">
                      <span className="filter blur-[4px] select-none pointer-events-none text-gray-700 dark:text-gray-300">
                        {Number(product.wholesalePrice).toLocaleString('fa-IR')} تومان
                      </span>
                      <Link href={`/login?redirect=/product/${product.id}`} className="absolute inset-0 flex items-center justify-center bg-indigo-50/80 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30 text-[9px] text-indigo-600 dark:text-indigo-400 font-black hover:underline">
                        نمایش قیمت همکار (عضویت)
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <AddToCartBar 
            product={{
              ...product,
              price: isWholesaleApplied ? wholesalePricing.unitPrice : currentPrice,
              originalPrice: isWholesaleApplied ? wholesalePricing.originalPrice : currentPrice,
              discount: isWholesaleApplied ? wholesalePricing.discountPercent : product.discount,
              colorName: selectedVariant?.name,
              colorCode: selectedVariant?.colorCode,
              shortInfo: product.description,
              imageUrl: product.imageUrl,
              stock: currentStock,
              variantId: selectedVariantId || undefined,
              fileFormat: product.fileFormat,
              fileSize: product.fileSize,
              categoryId: product.categoryId
            }} 
          />
        </div>
      )}

      {/* Mobile Add To Cart Bar */}
      {wholesaleEnabled && product.isWholesaleOnly && !isWholesaleApplied && !loadingProfile ? (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 pb-safe flex items-center justify-between z-30">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-0.5">قیمت عمده</span>
            <span className="filter blur-[5px] select-none pointer-events-none text-lg font-bold text-gray-900 dark:text-white">
              {Number(product.wholesalePrice || 1250000).toLocaleString('fa-IR')} تومان
            </span>
          </div>
          {userProfile ? (
            contactPhone ? (
              <a href={`tel:${contactPhone}`} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20">
                تماس با پشتیبانی
              </a>
            ) : (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-2 rounded-xl">فقط عمده</span>
            )
          ) : (
            <Link href={`/login?redirect=/product/${product.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20">
              ورود / ثبت‌نام همکار
            </Link>
          )}
        </div>
      ) : (
        <div className="md:hidden">
          <AddToCartBar 
            product={{
              ...product,
              price: isWholesaleApplied ? wholesalePricing.unitPrice : currentPrice,
              originalPrice: isWholesaleApplied ? wholesalePricing.originalPrice : currentPrice,
              discount: isWholesaleApplied ? wholesalePricing.discountPercent : product.discount,
              colorName: selectedVariant?.name,
              colorCode: selectedVariant?.colorCode,
              shortInfo: product.description,
              imageUrl: product.imageUrl,
              stock: currentStock,
              variantId: selectedVariantId || undefined,
              fileFormat: product.fileFormat,
              fileSize: product.fileSize,
              categoryId: product.categoryId
            }} 
          />
        </div>
      )}
    </div>
  );
}
