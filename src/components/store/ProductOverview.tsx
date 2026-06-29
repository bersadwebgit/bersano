'use client';

import { useState, useEffect } from 'react';
import ProductGallery from './ProductGallery';
import ProductPurchaseSection from './ProductPurchaseSection';
import ProductVariants from './ProductVariants';
import ExpandableDescription from './ExpandableDescription';
import {
  ArrowRight,
  ChevronLeft,
  Heart,
  Home,
  ShieldCheck,
  Star,
  Truck,
  Undo2,
  Headphones,
  Share2,
  FileDown,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFavoritesStore } from '@/store/favoritesStore';

interface Variant {
  id: string;
  name: string;
  colorCode?: string | null;
  imageUrl?: string | null;
  price: number;
  stock: number;
  isDefault?: boolean;
}

interface ProductOverviewProps {
  product: {
    id: string;
    title: string;
    brand?: string | null;
    type?: string | null;
    price: number;
    discount?: number | null;
    imageUrl?: string | null;
    galleryUrls?: string | null;
    stock: number;
    description?: string | null;
    variants?: Variant[];
    reviews?: any[];
    features?: string | null;
    category?: { id: string; name: string; slug: string } | null;
    downloadLimit?: number | null;
    downloadExpiryDays?: number | null;
    downloadIpRestriction?: boolean | null;
    fileFormat?: string | null;
    fileSize?: string | null;
    previewUrl?: string | null;
    techSpecs?: string | null;
    downloadFiles?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    wholesalePrice?: number | null;
    wholesaleTiers?: string | any[] | null;
    wholesaleExclusivePrices?: string | any[] | null;
    moq?: number | null;
    wholesaleUnit?: string | null;
    wholesaleUnitSize?: number | null;
    isWholesaleOnly?: boolean | null;
  };
  brands?: any[];
  shopName: string;
}

function normalizeKeyValuePairs(data: any): Record<string, string> {
  if (!data) return {};

  let parsed: any;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      return {};
    }
  } else {
    parsed = data;
  }

  if (!parsed) return {};

  if (Array.isArray(parsed)) {
    const result: Record<string, string> = {};
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const k = item.key || item.name || item.label;
        const v = item.value;
        if (k && v !== undefined && v !== null) {
          result[String(k).trim()] = String(v).trim();
        }
      }
    }
    return result;
  }

  if (typeof parsed === 'object') {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        result[k.trim()] = String(v).trim();
      } else if (v && typeof v === 'object') {
        const item = v as any;
        const subKey = item.key || item.name || k;
        const subVal = item.value !== undefined ? item.value : JSON.stringify(item);
        result[String(subKey).trim()] = String(subVal).trim();
      }
    }
    return result;
  }

  return {};
}

export default function ProductOverview({ product, brands = [], shopName }: ProductOverviewProps) {
  const router = useRouter();
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() => {
    if (!hasVariants) return null;
    const defaultVariant = product.variants!.find(v => v.isDefault);
    if (defaultVariant) return defaultVariant.id;
    const firstInStock = product.variants!.find(v => v.stock > 0);
    return firstInStock ? firstInStock.id : product.variants![0].id;
  });

  const [isClient, setIsClient] = useState(false);
  const favorites = useFavoritesStore((state) => state.items);
  const addToFavorites = useFavoritesStore((state) => state.addToFavorites);
  const removeFromFavorites = useFavoritesStore((state) => state.removeFromFavorites);
  const isFavorite = favorites.some((item) => item.id === product.id);

  const discountPercent = product.discount && product.price > 0
    ? Math.round((product.discount / product.price) * 100)
    : 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedVariant = hasVariants
    ? product.variants!.find(v => v.id === selectedVariantId)
    : null;

  useEffect(() => {
    if (!isClient) return;

    const template = product.seoTitle || `{title} | خرید و قیمت در {shopName}`;
    const variantName = selectedVariant ? selectedVariant.name : '';
    const currentPrice = selectedVariant ? selectedVariant.price : product.price;
    const formattedPrice = currentPrice && currentPrice > 0
      ? `${Number(currentPrice).toLocaleString('fa-IR')} تومان`
      : 'رایگان';

    let newTitle = template;
    const hasPlaceholders = template.includes('{title}') ||
                            template.includes('{brand}') ||
                            template.includes('{color}') ||
                            template.includes('{variant}') ||
                            template.includes('{specs}') ||
                            template.includes('{price}') ||
                            template.includes('{shopName}');

    if (hasPlaceholders) {
      newTitle = template
        .replace(/{title}/g, product.title)
        .replace(/{brand}/g, product.brand || '')
        .replace(/{color}/g, variantName)
        .replace(/{variant}/g, variantName)
        .replace(/{specs}/g, variantName)
        .replace(/{price}/g, formattedPrice)
        .replace(/{shopName}/g, shopName);
    } else {
      const baseTitle = product.seoTitle || `${product.title} | خرید و قیمت در ${shopName}`;
      const separators = ['|', '-'];
      let separatorFound = false;

      if (variantName) {
        for (const sep of separators) {
          if (baseTitle.includes(sep)) {
            const parts = baseTitle.split(sep);
            const mainPart = parts[0].trim();
            const restPart = parts.slice(1).join(sep).trim();
            newTitle = `${mainPart} ${variantName} ${sep} ${restPart}`;
            separatorFound = true;
            break;
          }
        }
        if (!separatorFound) {
          newTitle = `${baseTitle} - ${variantName}`;
        }
      } else {
        newTitle = baseTitle;
      }
    }

    document.title = newTitle;
  }, [selectedVariantId, isClient, product.seoTitle, product.title, product.brand, product.price, shopName]);

  // Determine which image to show as main
  const currentMainImage = selectedVariant?.imageUrl || product.imageUrl;

  // Calculate average rating if reviews exist
  const reviews = product.reviews || [];
  const hasReviews = reviews.length > 0;
  const averageRating = hasReviews
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : null;
  const reviewCount = reviews.length;

  const parsedFeatures = normalizeKeyValuePairs(product.features);
  const featureEntries = Object.entries(parsedFeatures);

  const brandObj = brands?.find(
    b => b.name?.toLowerCase().trim() === product.brand?.toLowerCase().trim()
  );
  const brandLogo = brandObj?.logoUrl;

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const shareData = { title: product.title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (e) {
      /* user cancelled */
    }
  };

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  const trustBadges = [
    { icon: ShieldCheck, label: 'ضمانت اصالت کالا' },
    { icon: Undo2, label: 'ضمانت بازگشت' },
    { icon: Truck, label: 'ارسال سریع' },
    { icon: Headphones, label: 'پشتیبانی پاسخگو' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen md:min-h-0 md:bg-transparent">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => router.back()} aria-label="بازگشت" className="p-2 -mr-2 text-gray-900 dark:text-white">
          <ArrowRight className="w-6 h-6" />
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate px-2">جزئیات محصول</h1>
        <div className="flex items-center gap-1">
          <button onClick={handleShare} aria-label="اشتراک‌گذاری" className="p-2 text-gray-900 dark:text-white">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={toggleFavorite} aria-label="علاقه‌مندی" className="p-2 -ml-2 text-gray-900 dark:text-white">
            <Heart className={`w-5 h-5 ${isClient && isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav aria-label="مسیر" className="px-4 md:px-0 pt-4 md:pt-0 pb-2">
        <ol className="flex items-center gap-1 text-[11px] md:text-xs text-gray-400 dark:text-gray-500 overflow-x-auto hide-scrollbar whitespace-nowrap">
          <li>
            <Link href="/" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Home className="w-3.5 h-3.5" />
              خانه
            </Link>
          </li>
          {product.category && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <li>
                <Link
                  href={`/category/${product.category.slug}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <li className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px] md:max-w-xs">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="md:flex md:items-start md:gap-6 lg:gap-8 mb-8 md:bg-white md:dark:bg-gray-900 md:rounded-3xl md:border md:border-gray-100 md:dark:border-gray-800 md:p-6 lg:p-7 md:shadow-sm">
        {/* Product Gallery */}
        <div className="w-full md:w-5/12 lg:w-[36%] md:self-start md:sticky md:top-24 px-4 md:px-0">
          <div className="relative">
            <ProductGallery
              mainImageUrl={currentMainImage || null}
              galleryUrls={product.galleryUrls}
              title={product.title}
              discount={discountPercent}
            />
            {/* Floating actions on image (desktop) */}
            <div className="absolute top-4 right-4 z-10 hidden md:flex flex-col gap-2">
              <button
                onClick={toggleFavorite}
                aria-label="افزودن به علاقه‌مندی"
                className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isClient && isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                aria-label="اشتراک‌گذاری"
                className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Details + Buy Box */}
        <div className="px-4 mt-6 md:w-7/12 lg:w-[64%] md:mt-0 md:px-0">
          <div className="lg:flex lg:items-start lg:gap-6">
            {/* Main Info Column */}
            <div className="lg:flex-1 min-w-0">
              {/* Brand */}
              {product.brand && (
                <div className="flex items-center gap-2 mb-3">
                  {brandLogo ? (
                    <div className="relative w-14 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl p-1 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={brandLogo}
                        alt={product.brand}
                        className="object-contain max-h-full max-w-full"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      برند: {product.brand}
                    </span>
                  )}
                  {brandLogo && (
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-full">
                      {product.brand}
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              <h1
                className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white leading-relaxed mb-3 break-words [overflow-wrap:anywhere]"
                title={product.title}
              >
                {product.title}
              </h1>

              {/* Rating & meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => document.getElementById('product-details-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 group shrink-0"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {hasReviews ? (
                    <>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{averageRating}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        ({reviewCount.toLocaleString('fa-IR')} دیدگاه)
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      ثبت اولین دیدگاه
                    </span>
                  )}
                </button>

                {product.type === 'digital' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-full shrink-0">
                    <FileDown className="w-3.5 h-3.5" />
                    محصول دانلودی
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.description && (
                <div className="mb-6 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  <ExpandableDescription description={product.description} maxLength={180} />
                </div>
              )}

              {/* Digital file info */}
              {product.type === 'digital' && (
                <div className="mb-6 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300 mb-3 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4" />
                    مشخصات فایل دانلودی
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    {product.fileFormat && (
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400">فرمت فایل:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{product.fileFormat}</span>
                      </div>
                    )}
                    {product.fileSize && (
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400">حجم فایل:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{product.fileSize}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400">دانلود مجاز:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {product.downloadLimit && product.downloadLimit > 0 ? `${product.downloadLimit} بار` : 'نامحدود'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400">اعتبار لینک:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {product.downloadExpiryDays && product.downloadExpiryDays > 0 ? `${product.downloadExpiryDays} روز` : 'نامحدود'}
                      </span>
                    </div>
                  </div>

                  {product.techSpecs && (
                    <div className="text-[11px] text-gray-500 bg-white/70 dark:bg-gray-850/50 p-2.5 rounded-xl border border-purple-50 dark:border-purple-950/20 mb-3">
                      <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">سیستم مورد نیاز / توضیحات فنی:</p>
                      <p>{product.techSpecs}</p>
                    </div>
                  )}

                  {product.previewUrl && (
                    <div className="flex items-center justify-between p-2 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl">
                      <span className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">امکان پیش‌نمایش یا تست دمو وجود دارد</span>
                      <a
                        href={product.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        پخش پیش‌نمایش
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Key Features */}
              {featureEntries.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-3 uppercase">ویژگی‌های کلیدی</h4>
                  <div className="grid grid-cols-1 gap-y-2.5">
                    {featureEntries.slice(0, 4).map(([key, value]) => (
                      <div key={key} className="flex items-baseline gap-2 text-xs min-w-0">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">{key}:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate" title={value}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {featureEntries.length > 4 && (
                    <button
                      onClick={() => document.getElementById('product-details-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      مشاهده همه مشخصات محصول
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Variants / تنوع (middle column) */}
              {hasVariants && (
                <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                  <ProductVariants
                    variants={product.variants}
                    selectedVariantId={selectedVariantId}
                    onVariantChange={setSelectedVariantId}
                  />
                </div>
              )}
            </div>

            {/* Buy Box */}
            <div className="mt-6 lg:mt-0 lg:w-[280px] lg:shrink-0 lg:sticky lg:top-24">
              <div className="lg:bg-gray-50/70 lg:dark:bg-gray-800/30 lg:p-4 lg:rounded-2xl lg:border lg:border-gray-100 lg:dark:border-gray-800">
                <ProductPurchaseSection
                  product={{
                    ...product,
                    description: product.description,
                    fileFormat: product.fileFormat,
                    fileSize: product.fileSize,
                  }}
                  selectedVariantId={selectedVariantId}
                  onVariantChange={setSelectedVariantId}
                />

                {/* Guarantees inside buy box (desktop) */}
                <div className="hidden lg:block mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  {trustBadges.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                      <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trust badges (mobile) */}
          <div className="grid grid-cols-2 gap-3 mt-6 lg:hidden">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 rounded-2xl">
                <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
