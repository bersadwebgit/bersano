'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import { useCartStore } from '@/store/cartStore';
import {
  Trash2,
  Minus,
  Plus,
  Bookmark,
  ShoppingCart,
  ShoppingBag,
  Tag,
  ShieldCheck,
  Truck,
  Headphones,
  ChevronLeft,
  CheckCircle2,
  FileSpreadsheet,
  ClipboardList,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function CartClient() {
  const [mounted, setMounted] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const { 
    items, 
    savedItems,
    addToCart,
    updateQuantity, 
    removeFromCart, 
    saveForLater,
    moveToCart,
    removeFromSaved,
    updateStockStatus,
    getOriginalTotal,
    getProductDiscountTotal,
    getFinalTotal, 
    getDiscountAmount,
    discountCode,
    applyDiscount,
    removeDiscount
  } = useCartStore();

  const [discountInput, setDiscountInput] = useState('');
  const [discountMessage, setDiscountMessage] = useState({ text: '', type: '' });
  const [isApplying, setIsApplying] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isAutoDiscountRemoved, setIsAutoDiscountRemoved] = useState(false);

  // Wholesaler States
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [recurringLists, setRecurringLists] = useState<any[]>([]);
  const [newListName, setNewListName] = useState('');
  const [showSaveListModal, setShowSaveListModal] = useState(false);

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

  useEffect(() => {
    const saved = localStorage.getItem('b2b_recurring_lists');
    if (saved) {
      try { setRecurringLists(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const handleDownloadSampleExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const sampleData = [
        ['شناسه محصول یا نام دقیق کالا', 'تعداد'],
        ['PROD-12345', 50],
        ['گوشی موبایل آیفون ۱۳', 10],
        ['PROD-67890', 100]
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Sample');
      XLSX.writeFile(wb, 'sample_wholesale_order.xlsx');
    } catch (err) {
      console.error('Error generating sample excel:', err);
      alert('خطا در دانلود فایل نمونه');
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          alert('فایل اکسل خالی است یا فرمت آن صحیح نیست.');
          return;
        }

        // Column 0 matches ID or Title, Column 1 matches Qty
        const parsedRows = data.slice(1).map((row, idx) => ({
          lineNum: idx + 2, // Row 1 is header
          productIdOrTitle: String(row[0] || '').trim(),
          qty: parseInt(String(row[1] || '1')) || 1
        })).filter(r => r.productIdOrTitle);

        if (parsedRows.length === 0) {
          alert('ردیف معتبری در فایل اکسل یافت نشد.');
          return;
        }

        // Fetch all active products
        const productsRes = await fetch('/api/admin/products');
        if (!productsRes.ok) {
          alert('خطا در بارگذاری لیست محصولات.');
          return;
        }
        const productsData = await productsRes.json();
        const allProducts = productsData.products || [];

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const row of parsedRows) {
          const matchedProd = allProducts.find((p: any) => 
            p.id === row.productIdOrTitle || 
            p.title.toLowerCase().trim() === row.productIdOrTitle.toLowerCase().trim()
          );

          if (!matchedProd) {
            errors.push(`ردیف ${row.lineNum}: محصول با شناسه یا نام «${row.productIdOrTitle}» یافت نشد.`);
            failedCount++;
            continue;
          }

          // Validate MOQ
          const moq = matchedProd.moq || 1;
          if (row.qty < moq) {
            errors.push(`ردیف ${row.lineNum}: تعداد سفارش (${row.qty}) کمتر از حداقل سفارش (MOQ: ${moq}) برای محصول «${matchedProd.title}» است.`);
            failedCount++;
            continue;
          }

          // Validate stock
          if (matchedProd.stock <= 0) {
            errors.push(`ردیف ${row.lineNum}: محصول «${matchedProd.title}» ناموجود است.`);
            failedCount++;
            continue;
          }

          if (row.qty > matchedProd.stock) {
            errors.push(`ردیف ${row.lineNum}: تعداد درخواستی (${row.qty}) بیشتر از موجودی انبار (${matchedProd.stock}) برای محصول «${matchedProd.title}» است.`);
            failedCount++;
            continue;
          }

          // Add to cart
          addToCart({
            id: matchedProd.id,
            title: matchedProd.title,
            price: matchedProd.wholesalePrice || matchedProd.price,
            originalPrice: matchedProd.price,
            discount: matchedProd.discount || undefined,
            imageUrl: matchedProd.imageUrl || undefined,
            currentStock: matchedProd.stock,
            stockStatus: 'in_stock',
            type: matchedProd.type,
            moq
          }, row.qty);
          successCount++;
        }

        setUploadResults({
          successCount,
          failedCount,
          errors
        });
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error('Error parsing excel:', err);
      alert('خطا در خواندن فایل اکسل. لطفاً از فرمت استاندارد استفاده کنید.');
    }
  };

  const handleSaveCurrentCartAsList = () => {
    if (!newListName.trim()) {
      alert('لطفاً یک نام برای لیست خرید انتخاب کنید.');
      return;
    }
    const newList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      date: new Date().toLocaleDateString('fa-IR'),
      items: items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.imageUrl
      }))
    };
    const updated = [...recurringLists, newList];
    setRecurringLists(updated);
    localStorage.setItem('b2b_recurring_lists', JSON.stringify(updated));
    setNewListName('');
    setShowSaveListModal(false);
    alert(`لیست خرید "${newList.name}" با موفقیت ذخیره شد.`);
  };

  const handleLoadRecurringList = (listId: string) => {
    const list = recurringLists.find(l => l.id === listId);
    if (!list) return;

    for (const item of list.items) {
      addToCart({
        id: item.productId,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        variantId: item.variantId
      }, item.quantity);
    }
    alert(`اقلام لیست خرید "${list.name}" با موفقیت به سبد خرید اضافه شدند.`);
  };

  const handleDeleteRecurringList = (listId: string) => {
    const updated = recurringLists.filter(l => l.id !== listId);
    setRecurringLists(updated);
    localStorage.setItem('b2b_recurring_lists', JSON.stringify(updated));
  };

  // Prevent hydration errors by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enforce wholesale MOQ and unit size rules
  useEffect(() => {
    if (mounted && isWholesaler && wholesaleEnabled && items.length > 0) {
      items.forEach(item => {
        const itemMoq = item.moq || 1;
        const itemUnitSize = item.wholesaleUnitSize || 1;
        const minAllowedQty = Math.max(itemMoq, itemUnitSize);
        if (item.quantity < minAllowedQty) {
          updateQuantity(item.id, minAllowedQty);
        }
      });
    }
  }, [mounted, isWholesaler, wholesaleEnabled, items, updateQuantity]);

  // Validate cart items stock and prices
  useEffect(() => {
    if (!mounted || items.length === 0) {
      setIsValidating(false);
      return;
    }

    // Reset manual removal flag when cart items or quantities change
    setIsAutoDiscountRemoved(false);

    const validateCart = async () => {
      try {
        setIsValidating(true);
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            const { priceIncreased, updatedItems } = updateStockStatus(data.items);
            if (priceIncreased) {
              alert(`توجه: قیمت محصول(های) "${updatedItems.join('، ')}" افزایش یافته است. سبد خرید شما با قیمت‌های جدید بروزرسانی شد.`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to validate cart:', error);
      } finally {
        setIsValidating(false);
      }
    };

    validateCart();
  }, [mounted, items.map(item => `${item.id}:${item.quantity}`).join(',')]);

  // Automatically fetch and apply quantity-based discount codes
  useEffect(() => {
    if (!mounted || items.length === 0 || isAutoDiscountRemoved) return;

    const checkAutomaticDiscounts = async () => {
      try {
        const res = await fetch('/api/discounts/automatic');
        if (!res.ok) return;
        const data = await res.json();
        const autoDiscounts = data.discounts || [];

        if (autoDiscounts.length === 0) {
          // If there are no automatic discounts, and the currently applied discount is a quantity-based one, remove it
          if (discountCode && (discountCode as any).minQuantity) {
            removeDiscount();
          }
          return;
        }

        const validActiveItems = items.filter(item => item.stockStatus !== 'out_of_stock');

        // Find eligible automatic discounts
        const eligibleDiscounts = autoDiscounts.filter((disc: any) => {
          let eligibleItems = validActiveItems;

          // Check target product restrictions
          if (disc.targetProductIds) {
            try {
              const allowedProds = JSON.parse(disc.targetProductIds);
              if (Array.isArray(allowedProds) && allowedProds.length > 0) {
                eligibleItems = eligibleItems.filter(item => allowedProds.includes(item.productId));
              }
            } catch (e) {}
          }

          // Check target category restrictions
          if (disc.targetCategoryIds) {
            try {
              const allowedCats = JSON.parse(disc.targetCategoryIds);
              if (Array.isArray(allowedCats) && allowedCats.length > 0) {
                eligibleItems = eligibleItems.filter(item => item.categoryId && allowedCats.includes(item.categoryId));
              }
            } catch (e) {}
          }

          // Check min quantity
          const hasMinQty = eligibleItems.some(item => item.quantity >= (disc.minQuantity || 0));
          if (!hasMinQty) return false;

          // Check min order amount
          if (disc.minOrderAmount) {
            const eligibleTotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            if (eligibleTotal < disc.minOrderAmount) return false;
          }

          return true;
        });

        if (eligibleDiscounts.length === 0) {
          // No automatic discounts are eligible. If the currently applied discount is a quantity-based one, remove it
          if (discountCode && (discountCode as any).minQuantity) {
            removeDiscount();
          }
          return;
        }

        // Calculate the actual discount amount for each eligible discount to find the best one
        const discountsWithAmounts = eligibleDiscounts.map((disc: any) => {
          let eligibleItems = validActiveItems;
          if (disc.targetCategoryIds) {
            try {
              const allowedCats = JSON.parse(disc.targetCategoryIds);
              if (Array.isArray(allowedCats) && allowedCats.length > 0) {
                eligibleItems = eligibleItems.filter(item => item.categoryId && allowedCats.includes(item.categoryId));
              }
            } catch (e) {}
          }
          if (disc.targetProductIds) {
            try {
              const allowedProds = JSON.parse(disc.targetProductIds);
              if (Array.isArray(allowedProds) && allowedProds.length > 0) {
                eligibleItems = eligibleItems.filter(item => allowedProds.includes(item.productId));
              }
            } catch (e) {}
          }

          const baseTotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          let amount = 0;
          if (disc.type === 'percentage') {
            amount = (baseTotal * disc.discount) / 100;
          } else {
            amount = Math.min(baseTotal, disc.discount);
          }

          return { discount: disc, amount };
        });

        // Sort by amount descending to find the best one
        discountsWithAmounts.sort((a: any, b: any) => b.amount - a.amount);
        const bestDiscount = discountsWithAmounts[0].discount;

        // If there is already a manual discount code applied, check if it's better than the automatic one
        if (discountCode && !(discountCode as any).minQuantity) {
          let manualAmount = 0;
          const activeItems = validActiveItems;
          let eligibleTotal = 0;
          let hasCategoryRestriction = false;

          if (discountCode.targetCategoryIds) {
            try {
              const allowedCats = JSON.parse(discountCode.targetCategoryIds);
              if (Array.isArray(allowedCats) && allowedCats.length > 0) {
                hasCategoryRestriction = true;
                const eligibleItems = activeItems.filter(item => item.categoryId && allowedCats.includes(item.categoryId));
                eligibleTotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              }
            } catch (e) {}
          }

          const baseTotal = hasCategoryRestriction ? eligibleTotal : (getOriginalTotal() - getProductDiscountTotal());

          if (discountCode.type === 'percentage') {
            manualAmount = (baseTotal * discountCode.discount) / 100;
          } else {
            manualAmount = Math.min(baseTotal, discountCode.discount);
          }

          if (manualAmount >= discountsWithAmounts[0].amount) {
            // Keep the manual discount code because it gives a higher or equal discount
            return;
          }
        }

        // If the best discount is different from the currently applied one, apply it!
        if (!discountCode || discountCode.code !== bestDiscount.code) {
          await applyDiscount(bestDiscount.code);
        }
      } catch (error) {
        console.error('Error checking automatic discounts:', error);
      }
    };

    checkAutomaticDiscounts();
  }, [mounted, items.map(item => `${item.id}:${item.quantity}`).join(','), discountCode?.code]);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setIsApplying(true);
    setDiscountMessage({ text: '', type: '' });
    
    const result = await applyDiscount(discountInput);
    setDiscountMessage({ 
      text: result.message, 
      type: result.success ? 'success' : 'error' 
    });
    
    if (result.success) setDiscountInput('');
    setIsApplying(false);
  };

  if (!mounted) return null;

  const originalTotal = getOriginalTotal();
  const productDiscountTotal = getProductDiscountTotal();
  
  // Calculate discountAmount directly in the component to ensure 100% reactivity and correctness
  const discountAmount = (() => {
    if (!discountCode) return 0;
    const activeItems = items.filter(item => item.stockStatus !== 'out_of_stock');
    let eligibleItems = activeItems;
    let hasCategoryRestriction = false;
    let hasProductRestriction = false;

    if (discountCode.targetProductIds) {
      try {
        const allowedProds = JSON.parse(discountCode.targetProductIds);
        if (Array.isArray(allowedProds) && allowedProds.length > 0) {
          hasProductRestriction = true;
          eligibleItems = eligibleItems.filter(item => allowedProds.includes(item.productId));
        }
      } catch (e) {
        console.error('Error parsing targetProductIds in client store:', e);
      }
    }

    if (discountCode.targetCategoryIds) {
      try {
        const allowedCats = JSON.parse(discountCode.targetCategoryIds);
        if (Array.isArray(allowedCats) && allowedCats.length > 0) {
          hasCategoryRestriction = true;
          eligibleItems = eligibleItems.filter(item => item.categoryId && allowedCats.includes(item.categoryId));
        }
      } catch (e) {
        console.error('Error parsing targetCategoryIds in client store:', e);
      }
    }

    const baseTotal = (hasCategoryRestriction || hasProductRestriction)
      ? eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      : (originalTotal - productDiscountTotal);

    if (discountCode.type === 'percentage') {
      return (baseTotal * discountCode.discount) / 100;
    }
    return Math.min(baseTotal, discountCode.discount);
  })();

  const finalTotal = Math.max(0, (originalTotal - productDiscountTotal) - discountAmount);
  const totalSavings = productDiscountTotal + discountAmount;

  const hasActiveItems = items.length > 0;
  const hasSavedItems = savedItems && savedItems.length > 0;
  const isCompletelyEmpty = !hasActiveItems && !hasSavedItems;

  const activeItemCount = items
    .filter(i => i.stockStatus !== 'out_of_stock')
    .reduce((a, b) => a + b.quantity, 0);

  const renderSavedItemsSection = () => {
    if (!hasSavedItems) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">لیست خرید بعدی</h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {savedItems.length.toLocaleString('fa-IR')} کالا
          </span>
        </div>

        <div className="space-y-3">
          {savedItems.map((item) => (
            <div key={item.id} className="flex gap-3 md:gap-4 bg-white dark:bg-gray-900 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-gray-800 opacity-90">
              <Link href={`/product/${item.productId}`} className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">بدون عکس</div>
                )}
              </Link>

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <Link href={`/product/${item.productId}`} className="font-bold text-gray-900 dark:text-white line-clamp-2 text-sm leading-relaxed hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {item.title}
                  </Link>
                  <button
                    onClick={() => removeFromSaved(item.id)}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors shrink-0"
                    title="حذف از لیست"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 gap-2">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    {item.price.toLocaleString('fa-IR')} <span className="text-xs font-normal opacity-70">تومان</span>
                  </p>

                  <button
                    onClick={() => moveToCart(item.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/50 px-3 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    افزودن به سبد
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const trustBadges = [
    { icon: ShieldCheck, label: 'پرداخت امن' },
    { icon: Truck, label: 'ارسال سریع' },
    { icon: Headphones, label: 'پشتیبانی' },
  ];

  return (
    <>
      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full">
        {isCompletelyEmpty ? (
          <div className="text-center py-16 md:py-24">
            <div className="bg-blue-50 dark:bg-blue-950/30 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="w-11 h-11 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سبد خرید شما خالی است</h2>
            <p className="text-gray-500 mb-8 text-sm">هنوز محصولی به سبد خرید اضافه نکرده‌اید.</p>
            <Link href="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/30 active:scale-95">
              <ShoppingBag className="w-5 h-5" />
              مشاهده محصولات
            </Link>
          </div>
        ) : !hasActiveItems && hasSavedItems ? (
          <div className="max-w-2xl mx-auto w-full">
            <div className="text-center py-10 mb-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">سبد خرید فعلی شما خالی است</h1>
              <Link href="/" className="inline-flex items-center gap-1 mt-1 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
                مشاهده محصولات
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            {renderSavedItemsSection()}
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white">سبد خرید</h1>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
                  {activeItemCount.toLocaleString('fa-IR')} کالا
                </span>
              </div>
              <Link href="/" className="hidden sm:flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                ادامه خرید
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Column 1: Cart Items & Saved Items */}
              <div className="flex-1 flex flex-col gap-6 min-w-0">
                {/* Stock validation indicator */}
                {isValidating && (
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-4 py-2.5 rounded-2xl">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال بررسی موجودی و قیمت کالاها...
                  </div>
                )}

                {/* Wholesaler B2B Panel */}
                {isWholesaler && wholesaleEnabled && (
                  <div className="space-y-4">
                    {/* Excel Upload panel */}
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ثبت سفارش سریع با فایل اکسل (Excel)
                        </h3>
                        <p className="text-[11px] text-indigo-800/80 dark:text-indigo-400/80 font-bold leading-relaxed">
                          ستون اول فایل را «شناسه یا نام کالا» و ستون دوم را «تعداد» قرار دهید تا اقلام مستقیماً به سبد خرید اضافه شوند.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button 
                          type="button"
                          onClick={handleDownloadSampleExcel}
                          className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-black px-4 py-3 rounded-2xl transition-all shadow-sm active:scale-95"
                        >
                          دانلود فایل نمونه
                        </button>
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-md shadow-indigo-600/25 text-center">
                          انتخاب و آپلود فایل اکسل
                          <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleExcelUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>

                    {uploadResults && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                          <h4 className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <FileSpreadsheet size={16} className="text-indigo-600" />
                            نتیجه پردازش فایل اکسل
                          </h4>
                          <button 
                            onClick={() => setUploadResults(null)} 
                            className="text-[10px] text-gray-400 hover:text-gray-600 font-bold"
                          >
                            بستن گزارش
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-2xl">
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">تعداد موفق:</span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                              {uploadResults.successCount.toLocaleString('fa-IR')} کالا
                            </span>
                          </div>
                          <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/40 p-3 rounded-2xl">
                            <span className="block text-[10px] text-red-600 dark:text-red-400">تعداد ناموفق:</span>
                            <span className="text-lg font-black text-red-700 dark:text-red-400 mt-1 block">
                              {uploadResults.failedCount.toLocaleString('fa-IR')} ردیف
                            </span>
                          </div>
                        </div>

                        {uploadResults.errors.length > 0 && (
                          <div className="space-y-2">
                            <span className="block text-[10px] text-gray-400 font-bold">خطاهای رخ داده:</span>
                            <div className="max-h-40 overflow-y-auto border border-red-50 dark:border-red-950/30 rounded-2xl p-3 bg-red-50/10 dark:bg-red-950/5 space-y-1.5 text-xs font-bold text-red-600 dark:text-red-400 custom-scrollbar text-right">
                              {uploadResults.errors.map((err, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recurring list templates panel */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800 pb-3">
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <ClipboardList className="w-4 h-4 text-indigo-500" />
                            لیست‌های خرید تکراری شما
                          </h3>
                          <p className="text-[10px] text-slate-500 font-medium">سفارش‌های تکراری و پرمصرف خود را به عنوان لیست الگو ذخیره کنید تا خرید در ثانیه انجام شود.</p>
                        </div>
                        
                        {items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowSaveListModal(true)}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1 w-fit"
                          >
                            ذخیره سبد فعلی به عنوان لیست الگو
                          </button>
                        )}
                      </div>

                      {showSaveListModal && (
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">نام لیست خرید را وارد کنید:</div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newListName}
                              onChange={(e) => setNewListName(e.target.value)}
                              placeholder="مثلاً: سفارش هفتگی شعبه اصلی"
                              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={handleSaveCurrentCartAsList}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all"
                            >
                              ذخیره
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowSaveListModal(false)}
                              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black px-4 py-2 rounded-xl transition-all"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      )}

                      {recurringLists.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recurringLists.map((list) => (
                            <div key={list.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{list.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold">ذخیره شده در {list.date} • {list.items.length.toLocaleString('fa-IR')} قلم کالا</div>
                              </div>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleLoadRecurringList(list.id)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-2 rounded-lg transition-all"
                                >
                                  بارگذاری اقلام
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecurringList(list.id)}
                                  className="text-slate-400 hover:text-red-500 p-1.5 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="حذف لیست"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[11px] text-slate-400 font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">هیچ لیست خرید ذخیره‌شده‌ای ندارید.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Active Cart Items */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const isOutOfStock = item.stockStatus === 'out_of_stock';
                    const isNotEnough = item.stockStatus === 'not_enough';

                    const isWholesaleActive = isWholesaler && wholesaleEnabled;
                    const itemMoq = item.moq || 1;
                    const itemUnitSize = item.wholesaleUnitSize || 1;
                    const multiplier = isWholesaleActive ? itemUnitSize : 1;
                    const minAllowedQty = isWholesaleActive ? Math.max(itemMoq, multiplier) : 1;
                    const hasUnitDiscount = (item.originalPrice || 0) > item.price;

                    return (
                    <div key={item.id} className={`flex gap-3 md:gap-4 bg-white dark:bg-gray-900 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : 'hover:border-gray-200 dark:hover:border-gray-700'}`}>
                      <Link href={`/product/${item.productId}`} className="w-24 h-24 md:w-28 md:h-28 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">بدون عکس</div>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">ناموجود</span>
                          </div>
                        )}
                      </Link>
                      
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <Link href={`/product/${item.productId}`} className="font-bold text-gray-900 dark:text-white line-clamp-2 text-sm md:text-base leading-relaxed hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {item.title}
                          </Link>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1 transition-colors shrink-0"
                            title="حذف از سبد خرید"
                          >
                            <Trash2 className="w-[18px] h-[18px]" />
                          </button>
                        </div>
                        
                        {(item.colorName || item.shortInfo || isNotEnough) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {item.colorName && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                <span className="w-3 h-3 rounded-full border border-gray-200 dark:border-gray-700" style={{ backgroundColor: item.colorCode || '#ccc' }}></span>
                                {item.colorName}
                              </span>
                            )}
                            {item.shortInfo && (
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1">{item.shortInfo}</span>
                            )}
                            {isNotEnough && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-lg">
                                <AlertTriangle className="w-3 h-3" />
                                موجودی به {item.currentStock?.toLocaleString('fa-IR')} عدد کاهش یافت
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-3 space-y-2.5">
                          {/* Controls row: stepper + price */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Quantity Stepper */}
                            {!isOutOfStock ? (
                              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-1">
                                <button 
                                  onClick={() => {
                                    const nextQty = item.quantity - multiplier;
                                    if (nextQty >= minAllowedQty) {
                                      updateQuantity(item.id, nextQty);
                                    } else {
                                      removeFromCart(item.id);
                                    }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                                  aria-label="کاهش تعداد"
                                >
                                  {item.quantity <= minAllowedQty ? (
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  ) : (
                                    <Minus className="w-4 h-4" />
                                  )}
                                </button>
                                <span className="text-sm font-bold w-7 text-center text-gray-900 dark:text-white">{item.quantity.toLocaleString('fa-IR')}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + multiplier)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  disabled={item.currentStock !== undefined && item.quantity + multiplier > item.currentStock}
                                  aria-label="افزایش تعداد"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : <span />}

                            {/* Price */}
                            <div className="text-left shrink-0">
                              {hasUnitDiscount && !isOutOfStock && (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[10px] text-gray-400 line-through">
                                    {((item.originalPrice || 0) * item.quantity).toLocaleString('fa-IR')}
                                  </span>
                                  {item.discount && item.discount > 0 ? (
                                    <span className="bg-red-500 text-white px-1.5 py-px rounded-md text-[9px] font-black">
                                      ٪{item.discount.toLocaleString('fa-IR')}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              <p className={`font-black text-sm md:text-base leading-tight ${isOutOfStock ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {(item.price * item.quantity).toLocaleString('fa-IR')}
                                <span className="text-[10px] font-normal opacity-70 mr-1">تومان</span>
                              </p>
                            </div>
                          </div>

                          {/* Save for later */}
                          <button 
                            onClick={() => saveForLater(item.id)}
                            className="text-[11px] md:text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 transition-colors"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            ذخیره برای خرید بعدی
                          </button>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>

                {renderSavedItemsSection()}
              </div>

              {/* Column 2: Order Summary & Discount */}
              <div className="w-full md:w-80 lg:w-96 shrink-0">
                <div className="md:sticky md:top-24 space-y-4">
                  {/* Discount Code Section */}
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-500" />
                      کد تخفیف
                    </h3>
                    
                    {discountCode ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">
                              {(discountCode as any).minQuantity ? (
                                <span className="flex items-center gap-1">
                                  📦 تخفیف تعداد بالا خودکار اعمال شد
                                </span>
                              ) : (
                                <>کد <span className="font-bold dir-ltr inline-block">{discountCode.code}</span> اعمال شد</>
                              )}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                              {discountCode.type === 'percentage' ? `${discountCode.discount}٪ تخفیف` : `${discountCode.discount.toLocaleString('fa-IR')} تومان تخفیف`}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (discountCode && (discountCode as any).minQuantity) {
                              setIsAutoDiscountRemoved(true);
                            }
                            removeDiscount();
                          }}
                          className="text-red-500 hover:text-red-600 p-1.5 bg-white dark:bg-black rounded-lg transition-colors"
                          title="حذف کد تخفیف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          placeholder="کد تخفیف"
                          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr text-center"
                          dir="ltr"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleApplyDiscount(); }}
                        />
                        <button 
                          onClick={handleApplyDiscount}
                          disabled={isApplying || !discountInput.trim()}
                          className="bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {isApplying ? '...' : 'اعمال'}
                        </button>
                      </div>
                    )}
                    {discountMessage.text && (
                      <p className={`text-xs mt-2 font-medium ${discountMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {discountMessage.text}
                      </p>
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm border-b border-gray-100 dark:border-gray-800 pb-3">صورت‌حساب</h3>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>قیمت کالاها ({activeItemCount.toLocaleString('fa-IR')})</span>
                      <span>{originalTotal.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    {productDiscountTotal > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>تخفیف کالاها</span>
                        <span>{productDiscountTotal.toLocaleString('fa-IR')} تومان</span>
                      </div>
                    )}
                    {items.some(item => item.isSetDiscount) && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          تخفیف خرید پکیج تعاملی اعمال شد:
                        </div>
                        <ul className="list-disc list-inside pr-1 opacity-90 font-medium">
                          {Array.from(new Set(items.filter(item => item.isSetDiscount).map(item => item.setName))).map((setName, idx) => (
                            <li key={idx}>تخفیف پکیج {setName}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          {(discountCode as any).minQuantity 
                            ? `تخفیف تعداد بالا (${discountCode?.code})` 
                            : `تخفیف کد (${discountCode?.code})`}
                        </span>
                        <span>{discountAmount.toLocaleString('fa-IR')} تومان</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                      <span>هزینه ارسال</span>
                      <span>در مرحله بعد محاسبه می‌شود</span>
                    </div>

                    <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span>مبلغ قابل پرداخت</span>
                      <span>{finalTotal.toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500">تومان</span></span>
                    </div>

                    {totalSavings > 0 && (
                      <div className="flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-2 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        {totalSavings.toLocaleString('fa-IR')} تومان سود شما از این خرید
                      </div>
                    )}
                    
                    <Link 
                      href="/checkout"
                      className="hidden md:flex w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm justify-center items-center gap-2 mt-1"
                    >
                      ادامه و ثبت سفارش
                      <ChevronLeft className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="hidden md:grid grid-cols-3 gap-2">
                    {trustBadges.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl py-3">
                        <Icon className="w-5 h-5 text-emerald-500" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Checkout Bar (Mobile Only) */}
      {items.length > 0 && (
        <div className="md:hidden fixed bottom-[64px] left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 pb-safe z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.15)]">
          <div className="w-full max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">مبلغ قابل پرداخت</p>
              <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {finalTotal.toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500">تومان</span>
              </p>
              {totalSavings > 0 && (
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {totalSavings.toLocaleString('fa-IR')} تومان سود شما
                </p>
              )}
            </div>
            <Link 
              href="/checkout"
              className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm flex items-center gap-1.5 shrink-0"
            >
              ثبت سفارش
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}
