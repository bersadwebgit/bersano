"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { 
  ShoppingBag, 
  Check, 
  ArrowLeft, 
  ExternalLink, 
  X, 
  Copy,
  CheckCircle,
  Plus,
  QrCode,
  Sparkles,
  RefreshCw
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  colorCode: string | null;
}

interface Product {
  id: string;
  title: string;
  price: number;
  discount: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  variants: ProductVariant[];
  categoryId?: string | null;
}

interface SetItem {
  id: string;
  productId: string;
  x: number;
  y: number;
  product: Product;
}

interface ShoppableClientProps {
  initialSet: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    isActive: boolean;
    discount?: number;
    items: SetItem[];
  };
}

export default function ShoppableClient({ initialSet }: ShoppableClientProps) {
  const router = useRouter();
  const [set, setSet] = useState(initialSet);
  const [selectedProductItem, setSelectedProductItem] = useState<SetItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  
  // 3D Card Flip State
  const [isFlipped, setIsFlipped] = useState(false);

  // Cart state integration
  const cartItems = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);

  // Helper function to check if a product is in the cart
  const isProductInCart = (productId: string) => {
    return cartItems.some(item => item.productId === productId);
  };

  // Helper to get total price of the entire set
  const calculateTotalSetPrice = () => {
    return set.items.reduce((sum, item) => {
      const prod = item.product;
      const price = prod.discount 
        ? prod.price - (prod.price * prod.discount) / 100 
        : prod.price;
      return sum + price;
    }, 0);
  };

  // Copy set link to clipboard
  const handleCopyLink = () => {
    const url = `${window.location.origin}/shoppable/${set.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Trigger tag click tracking event
  const trackTagClick = (setId: string) => {
    fetch('/api/shoppable/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, type: 'tag_click' }),
    }).catch(console.error);
  };

  // Trigger add to cart tracking event
  const trackAddToCart = (setId: string) => {
    fetch('/api/shoppable/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, type: 'add_to_cart' }),
    }).catch(console.error);
  };

  // Handle single item add to cart
  const handleAddItemToCart = (item: SetItem) => {
    const prod = item.product;
    let finalPrice = prod.discount 
      ? prod.price - (prod.price * prod.discount) / 100 
      : prod.price;
    let variantId = undefined;
    let colorName = undefined;
    let colorCode = undefined;

    if (prod.variants && prod.variants.length > 0) {
      if (!selectedVariant) {
        alert("لطفاً یک تنوع (سایز، رنگ یا مدل) انتخاب کنید.");
        return;
      }
      finalPrice = selectedVariant.price;
      variantId = selectedVariant.id;
      colorName = selectedVariant.name;
      colorCode = selectedVariant.colorCode || undefined;
    }

    addToCart({
      id: prod.id,
      productId: prod.id,
      variantId,
      title: prod.title,
      price: finalPrice,
      originalPrice: prod.price,
      discount: prod.discount || 0,
      imageUrl: prod.imageUrl || undefined,
      colorName,
      colorCode,
      stockStatus: 'in_stock',
      currentStock: selectedVariant ? selectedVariant.stock : prod.stock,
      categoryId: prod.categoryId || undefined
    });

    trackAddToCart(set.id);
  };

  // Handle adding all set items to cart
  const handleAddAllToCart = () => {
    let addedAny = false;
    const discountPercent = set.discount || 0; // Treated as percentage (e.g., 10 for 10%)

    set.items.forEach(item => {
      const prod = item.product;
      if (!isProductInCart(prod.id) && prod.stock > 0) {
        const hasVariants = prod.variants && prod.variants.length > 0;
        const defaultVariant = hasVariants ? prod.variants[0] : null;
        const itemOriginalPrice = defaultVariant ? defaultVariant.price : (prod.discount ? prod.price - (prod.price * prod.discount) / 100 : prod.price);
        
        // Calculate percentage discount for this item
        const itemDiscountAmount = Math.round(itemOriginalPrice * (discountPercent / 100));
        const finalPrice = Math.max(0, itemOriginalPrice - itemDiscountAmount);

        addToCart({
          id: prod.id,
          productId: prod.id,
          variantId: defaultVariant?.id,
          title: prod.title,
          price: finalPrice,
          originalPrice: prod.price,
          discount: (prod.discount || 0) + itemDiscountAmount,
          imageUrl: prod.imageUrl || undefined,
          colorName: defaultVariant?.name,
          colorCode: defaultVariant?.colorCode || undefined,
          stockStatus: 'in_stock',
          currentStock: defaultVariant ? defaultVariant.stock : prod.stock,
          isSetDiscount: discountPercent > 0 ? true : undefined,
          setName: discountPercent > 0 ? set.name : undefined,
          categoryId: prod.categoryId || undefined
        });
        addedAny = true;
      }
    });

    if (addedAny) {
      trackAddToCart(set.id);
    }

    // Redirect to cart page
    router.push("/cart");
  };

  // Default select first variant when product item details open
  useEffect(() => {
    if (selectedProductItem && selectedProductItem.product.variants?.length > 0) {
      setSelectedVariant(selectedProductItem.product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProductItem]);

  // QR Code URL Generation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${typeof window !== 'undefined' ? encodeURIComponent(`${window.location.origin}/shoppable/${set.slug}`) : ''}`;

  return (
    <div className="space-y-5 sm:space-y-6 text-gray-900 dark:text-gray-100 font-vazir rtl pb-12 relative" style={{ direction: "rtl" }}>
      
      {/* Top Navigation - Minimalist */}
      <div className="flex justify-between items-center gap-3">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rotate-180 shrink-0" />
          <span className="hidden sm:inline">بازگشت به فروشگاه</span>
          <span className="sm:hidden">بازگشت</span>
        </Link>
        <Link
          href="/cart"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer relative"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>سبد خرید</span>
          {cartItems.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-white">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </Link>
      </div>

      {/* Page Title Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white truncate">
            {set.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            روی نقاط روی تصویر بزنید و مستقیم از روی عکس خرید کنید
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-850 px-2.5 py-1 rounded-lg whitespace-nowrap">
            {set.items.length} کالا
          </span>
          {set.discount && set.discount > 0 ? (
            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg whitespace-nowrap">
              {set.discount}٪ تخفیف پکیج
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Layout Area - Minimalist Clean Focus on interactive image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative z-20">
        
        {/* Left Column: Interactive 3D Flip Card Container */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center justify-center w-full">
          <div className="relative w-full max-w-[440px] sm:max-w-[520px] lg:max-w-none aspect-[3/4] [perspective:1000px] select-none">
            <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
              isFlipped ? "[transform:rotateY(180deg)]" : ""
            }`}>
              
              {/* CARD FRONT: Interactive Shoppable Image (No black lines) */}
              <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-3xl overflow-hidden border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm flex flex-col">
                <Image
                  src={set.imageUrl}
                  alt={set.name}
                  fill
                  className="object-cover pointer-events-none"
                  priority
                  unoptimized
                />

                {/* Floating Flip Trigger Button */}
                <button
                  onClick={() => setIsFlipped(true)}
                  className="absolute top-3 left-3 z-30 bg-white/95 backdrop-blur-sm hover:bg-blue-600 hover:text-white text-blue-600 px-3 py-2 rounded-xl shadow-sm transition-all duration-300 flex items-center gap-1.5 text-[11px] font-black cursor-pointer active:scale-95 border border-gray-200/60 dark:border-gray-800"
                  title="نمایش بارکد و اشتراک‌گذاری"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">اشتراک‌گذاری</span>
                  <span className="sm:hidden">QR</span>
                </button>

                {/* Hotspot dots mapping */}
                {set.items.map((item) => {
                  const inCart = isProductInCart(item.product.id);
                  const isHovered = hoveredItemId === item.id;
                  const finalPrice = item.product.discount 
                    ? item.product.price - item.product.discount 
                    : item.product.price;

                  return (
                    <div
                      key={item.id}
                      className="absolute z-20"
                      style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                    >
                      {/* Hotspot Interactive Button */}
                      <button
                        onClick={() => {
                          setSelectedProductItem(item);
                          trackTagClick(set.id);
                        }}
                        className="p-3 cursor-pointer focus:outline-none focus:scale-110 transition-transform"
                      >
                        <div className="relative flex items-center justify-center">
                          <span className={`absolute inline-flex h-8 w-8 md:h-10 md:w-10 rounded-full animate-ping opacity-60 ${inCart ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                          <div className={`relative z-10 w-6 h-6 md:w-7 md:h-7 rounded-full border border-white dark:border-gray-800 flex items-center justify-center shadow-xs transition-all duration-300 ${inCart ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-blue-600 hover:text-white text-blue-600'}`}>
                            {inCart ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isHovered ? 'bg-white' : 'bg-blue-600'}`}></span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Dynamic Hover Tooltip Card */}
                      <div className={`absolute bottom-11 left-1/2 -translate-x-1/2 w-44 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/70 dark:border-gray-800 p-2.5 rounded-2xl shadow-lg transition-all duration-300 pointer-events-none z-30 ${
                        isHovered ? 'opacity-100 translate-y-0 visible scale-100' : 'opacity-0 translate-y-1.5 invisible scale-95'
                      }`}>
                        <div className="flex gap-2.5 items-center">
                          <div className="relative w-10 h-12 rounded-lg overflow-hidden border border-gray-200/60 dark:border-gray-800 shrink-0">
                            <Image src={item.product.imageUrl || '/globe.svg'} alt={item.product.title} fill className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                              {item.product.title}
                            </h4>
                            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 block mt-0.5">
                              {finalPrice.toLocaleString()} تومان
                            </span>
                            {inCart && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" /> در سبد خرید
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-t-4 border-t-white dark:border-t-gray-900 border-x-transparent" />
                      </div>

                    </div>
                  );
                })}

              </div>

              {/* CARD BACK: QR Code & Sharing widgets (Richer Dark blurred image background) */}
              <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl overflow-hidden border border-gray-100/30 dark:border-gray-800/45 shadow-md p-6 flex flex-col justify-between items-center text-center relative z-20 bg-transparent text-white">
                
                {/* 1. Deep Dark Blurred Confined Image Background */}
                <div className="absolute inset-0 -z-10 w-full h-full overflow-hidden">
                  <Image
                    src={set.imageUrl}
                    alt="Blurred Background"
                    fill
                    className="object-cover blur-[22px] scale-115 opacity-80 pointer-events-none"
                    priority
                    unoptimized
                  />
                  {/* Deep translucent black glassmorphism overlay for phenomenal high-contrast */}
                  <div className="absolute inset-0 bg-black/65 dark:bg-black/80 backdrop-blur-xs" />
                </div>

                {/* 2. Header (White typography for dark glass background) */}
                <div className="w-full flex justify-between items-center pb-3 border-b border-white/10 relative z-30">
                  <span className="text-[10px] font-black text-blue-300 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    کد QR و ابزار اشتراک‌گذاری
                  </span>
                  <button
                    onClick={() => setIsFlipped(false)}
                    className="p-1 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 3. QR Display */}
                <div className="flex flex-col items-center gap-2 relative z-30">
                  <div className="relative w-36 h-36 border border-white/10 rounded-2xl overflow-hidden bg-white p-2.5 shadow-md transition-transform hover:scale-105 duration-300">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[10px] font-black text-white drop-shadow-md">اسکن کد هوشمند پکیج {set.name}</span>
                  <span className="text-[8px] text-gray-300 max-w-xs drop-shadow-xs">با قرار دادن دوربین گوشی مقابل بارکد فوق، مشتریان مستقیماً وارد این صفحه می‌شوند.</span>
                </div>

                {/* 4. Copy widgets (Translucent dark inputs) */}
                <div className="w-full relative z-30">
                  {/* Shortlink */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shoppable/${set.slug}`}
                      className="flex-1 bg-black/35 border border-white/10 p-2 rounded-lg text-[9px] font-mono focus:outline-none text-gray-200 text-left ltr"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-[10px] font-black transition-all shrink-0 flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      کپی لینک
                    </button>
                  </div>
                </div>

                {/* 5. Return CTA */}
                <button
                  onClick={() => setIsFlipped(false)}
                  className="w-full bg-white/10 hover:bg-white/15 text-white py-2 rounded-xl text-[10px] font-black transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1 shadow-xs relative z-30"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-300" />
                  بازگشت به تصویر خریدنی
                </button>

              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Buy Box (full width below image on mobile/tablet, sticky sidebar on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 relative z-20 lg:sticky lg:top-24">
          
          {/* Visual Pack Purchase Box */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                کالاهای این تصویر
              </h3>
              <span className="text-[11px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-bold">
                {set.items.length} کالا
              </span>
            </div>

            {/* Item List */}
            <div className="space-y-2">
              {set.items.map((item) => {
                const prod = item.product;
                const inCart = isProductInCart(prod.id);
                const finalPrice = prod.discount 
                  ? prod.price - (prod.price * prod.discount) / 100 
                  : prod.price;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-2 bg-gray-50/60 dark:bg-gray-850/30 rounded-2xl border border-gray-100 dark:border-gray-800/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-14 rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800 bg-gray-100 dark:bg-gray-850 shrink-0">
                        <Image src={prod.imageUrl || '/globe.svg'} alt={prod.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate hover:text-blue-600 transition-colors">
                          <Link href={`/product/${prod.id}`}>{prod.title}</Link>
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {finalPrice.toLocaleString()} تومان
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {inCart ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedProductItem(item);
                            trackTagClick(set.id);
                          }}
                          className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/30 transition-all active:scale-90 cursor-pointer"
                          title="افزودن به سبد"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Calculations */}
            {set.discount && set.discount > 0 ? (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-500">قیمت محصولات:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 line-through">
                    {calculateTotalSetPrice().toLocaleString()} تومان
                  </span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>تخفیف پکیج ({set.discount}٪):</span>
                  <span>
                    {Math.round(calculateTotalSetPrice() * (set.discount / 100)).toLocaleString()} - تومان
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-gray-800">
                  <span className="font-bold text-gray-900 dark:text-white">قیمت نهایی پکیج:</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-base">
                    {Math.round(calculateTotalSetPrice() * (1 - set.discount / 100)).toLocaleString()} تومان
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-500">قیمت کل پکیج:</span>
                <span className="font-black text-gray-900 dark:text-white">
                  {calculateTotalSetPrice().toLocaleString()} تومان
                </span>
              </div>
            )}

            {/* Buy All CTA */}
            <button
              onClick={handleAddAllToCart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4" />
              افزودن همه به سبد خرید
            </button>
          </div>

        </div>

      </div>

      {/* Drawer / Bottom Sheet for Selected Product Tag */}
      {selectedProductItem && (
        <div
          onClick={() => setSelectedProductItem(null)}
          className="fixed inset-0 z-50 flex items-end justify-center lg:items-center bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        >
          
          {/* Main Sheet Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg lg:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-y-auto p-5 sm:p-6 max-h-[88vh] flex flex-col gap-4 animate-slide-up lg:animate-fade-in border border-gray-200/70 dark:border-gray-800"
          >
            {/* Mobile drag handle */}
            <div className="lg:hidden mx-auto -mt-1.5 mb-1 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />

            {/* Close Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
                خرید سریع کالا
              </span>
              <button
                onClick={() => setSelectedProductItem(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="flex gap-4 items-start">
              <div className="relative w-20 h-28 rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-800 bg-gray-100 dark:bg-gray-850 shrink-0">
                <Image
                  src={selectedProductItem.product.imageUrl || '/globe.svg'}
                  alt={selectedProductItem.product.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-snug">
                  {selectedProductItem.product.title}
                </h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {(selectedVariant ? selectedVariant.price : (selectedProductItem.product.discount ? selectedProductItem.product.price - selectedProductItem.product.discount : selectedProductItem.product.price)).toLocaleString()} تومان
                  </span>
                  {selectedProductItem.product.discount > 0 && !selectedVariant && (
                    <span className="text-xs text-gray-400 line-through">
                      {selectedProductItem.product.price.toLocaleString()}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed truncate-2-lines">
                  این کالا آماده سفارش مستقیم است. با زدن دکمه زیر می‌توانید آن را سریعاً به سبد خرید خود اضافه کنید.
                </p>
              </div>
            </div>

            {/* Product Variants */}
            {selectedProductItem.product.variants && selectedProductItem.product.variants.length > 0 && (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-850/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">
                  انتخاب مدل / سایز / رنگ:
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProductItem.product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`text-xs px-3 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                        selectedVariant?.id === v.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-750 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      {v.colorCode && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: v.colorCode }}
                        />
                      )}
                      {v.name}
                      <span className="text-[10px] opacity-75">
                        ({v.price.toLocaleString()} ت)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Check if product is already in cart */}
            {isProductInCart(selectedProductItem.product.id) && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl font-bold border border-emerald-100 dark:border-emerald-950/50">
                <CheckCircle className="w-4 h-4 shrink-0" />
                این کالا در حال حاضر در سبد خرید شما وجود دارد.
              </div>
            )}

            {/* Call To Actions */}
            <div className="space-y-2 mt-1">
              <button
                onClick={() => handleAddItemToCart(selectedProductItem)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4" />
                افزودن این کالا به سبد خرید
              </button>

              <Link
                href={`/product/${selectedProductItem.product.id}`}
                target="_blank"
                className="w-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all border border-gray-100 dark:border-gray-800 cursor-pointer"
              >
                مشاهده جزئیات کامل محصول
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* Sticky/Floating Cart Button for Mobile */}
      {cartItems.length > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-20 left-4 z-40 lg:hidden bg-blue-600 dark:bg-blue-500 text-white py-3 px-4 rounded-full shadow-lg flex items-center gap-2 font-black text-xs hover:bg-blue-700 transition-all active:scale-95 border border-blue-500/30"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4" />
            <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center border border-blue-600">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          </div>
          <span>مشاهده سبد خرید</span>
        </Link>
      )}

      {/* Embedded Slide Animations */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .truncate-2-lines {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
