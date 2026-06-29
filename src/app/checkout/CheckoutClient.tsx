'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { MapPin, Plus, Crosshair, X, Check, ShieldCheck, Loader2, ChevronLeft, Lock, Copy, Upload, CreditCard, Tag, Truck, Receipt, ShoppingBag, Sparkles, RotateCcw, Store, Info } from 'lucide-react';

interface Address {
  id: string;
  title: string;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  plaque: string;
  unit: string;
  postalCode: string;
  isDefault: boolean;
}

export default function CheckoutClient({ initialAddresses = [] }: { initialAddresses?: Address[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  
  const [discountInput, setDiscountInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [discountMessage, setDiscountMessage] = useState({ text: '', type: '' });

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
  
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id || null);
  
  const [isAddressListModalOpen, setIsAddressListModalOpen] = useState(false);
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({});
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  const [deliverToOther, setDeliverToOther] = useState(false);
  const [otherReceiverName, setOtherReceiverName] = useState('');
  const [otherReceiverPhone, setOtherReceiverPhone] = useState('');

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'wallet' | 'card_to_card'
  const [onlineGateway, setOnlineGateway] = useState<'zarinpal' | 'zibal' | 'digipay'>('zarinpal');
  const [shippingCarrier, setShippingCarrier] = useState('post'); // 'post' | 'tipax'
  
  // Wholesaler States
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [officialInvoice, setOfficialInvoice] = useState(false);
  
  // Card to Card payment form state
  const [cardSenderCard, setCardSenderCard] = useState('');
  const [cardReceiptUrl, setCardReceiptUrl] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [cardTime, setCardTime] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  
  // Selected Card for deposit
  const [selectedReceiverCardIdx, setSelectedReceiverCardIdx] = useState<number>(-1);

  const [createdDownloadTokens, setCreatedDownloadTokens] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.settings) {
          setShopSettings(data.settings);
          if (!data.settings.zarinpalEnabled && !data.settings.zibalEnabled && data.settings.digipayEnabled) {
            setOnlineGateway('digipay');
          } else if (!data.settings.zarinpalEnabled && data.settings.zibalEnabled) {
            setOnlineGateway('zibal');
          }
          // Set initial card selection
          const cards = data.settings.processedCards || [];
          const activeEligibleCards = cards.filter((c: any) => c.isActive && !c.hasReachedLimit);
          if (activeEligibleCards.length > 0) {
            // Select a random index among the active eligible cards as requested!
            const randIdx = Math.floor(Math.random() * activeEligibleCards.length);
            const selectedOriginalIdx = cards.findIndex((c: any) => c.id === activeEligibleCards[randIdx].id);
            setSelectedReceiverCardIdx(selectedOriginalIdx);
          } else if (cards.length > 0) {
            // If all cards reached limit, fallback to the first active card or first card
            const firstActive = cards.findIndex((c: any) => c.isActive);
            setSelectedReceiverCardIdx(firstActive !== -1 ? firstActive : 0);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => {
        if (res.ok) return res.json();
        if (res.status === 401 || res.status === 404) {
          router.push('/login');
        }
        return null;
      })
      .then(data => {
        if (data && data.user) {
          setBuyerName(data.user.name || '');
          setBuyerEmail(data.user.email || '');
          setBuyerPhone(data.user.phone || '');
          setUserProfile(data.user);
          setIsWholesaler(!!data.user.isWholesaler);
          setWholesaleEnabled(!!data.wholesaleEnabled);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Check if redirecting from ZarinPal payment gateway
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const orderIdParam = params.get('orderId');
    
    if (statusParam === 'success' && orderIdParam) {
      setLoading(true);
      fetch(`/api/checkout/verify-status?orderId=${orderIdParam}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('خطا در دریافت اطلاعات سفارش');
        })
        .then((data) => {
          if (data.success) {
            setSuccessOrder(orderIdParam);
            if (data.downloadTokens) {
              setCreatedDownloadTokens(data.downloadTokens);
            }
            clearCart();
          }
        })
        .catch((err) => {
          console.error(err);
          alert('سفارش شما با موفقیت پرداخت شد اما در نمایش اطلاعات خطایی رخ داد. لطفا به صفحه پروفایل مراجعه کنید.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (statusParam === 'failed' && orderIdParam) {
      alert('پرداخت شما ناموفق بود یا توسط شما لغو شد. در صورت کسر وجه، مبلغ ظرف مدت ۷۲ ساعت به حساب شما بازگردانده می‌شود.');
      router.push('/cart');
    }
  }, [router]);

  
  const { 
    items, 
    updateStockStatus,
    getOriginalTotal,
    getProductDiscountTotal,
    getFinalTotal, 
    getDiscountAmount,
    discountCode,
    applyDiscount,
    removeDiscount,
    clearCart
  } = useCartStore();

  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate cart items stock
  useEffect(() => {
    if (!mounted || items.length === 0) {
      setIsValidating(false);
      return;
    }

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
  }, [mounted]); // Run once on mount to check initial stock

  useEffect(() => {
    const validItems = items.filter(i => i.stockStatus !== 'out_of_stock');
    if (mounted && !isValidating && validItems.length === 0 && !successOrder) {
      router.push('/cart');
    }
  }, [items, mounted, isValidating, router, successOrder]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Validate cart items stock and prices before proceeding with checkout
      try {
        const validateRes = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        
        if (validateRes.ok) {
          const validateData = await validateRes.json();
          if (validateData.items) {
            const { priceIncreased, updatedItems } = updateStockStatus(validateData.items);
            if (priceIncreased) {
              alert(`توجه: قیمت محصول(های) "${updatedItems.join('، ')}" افزایش یافته است. سبد خرید شما با قیمت‌های جدید بروزرسانی شد. لطفاً مبالغ را مجدداً بررسی کنید.`);
              setLoading(false);
              return; // Stop checkout so they can see the updated price
            }
            
            // Re-check if any items are out of stock or not enough
            const hasOutOfStock = validateData.items.some((i: any) => i.stockStatus === 'out_of_stock');
            const hasNotEnough = validateData.items.some((i: any) => i.stockStatus === 'not_enough');
            if (hasOutOfStock || hasNotEnough) {
              alert('موجودی برخی از کالاها تغییر کرده یا ناموجود شده‌اند. سبد خرید شما بروزرسانی شد.');
              setLoading(false);
              return; // Stop checkout so they can see the updated stock/quantities
            }
          }
        }
      } catch (error) {
        console.error('Failed to validate cart before checkout:', error);
      }

      const validItems = items.filter(i => i.stockStatus !== 'out_of_stock');
      
      if (validItems.length === 0) {
        alert('سبد خرید شما خالی است یا کالاهای آن ناموجود شده‌اند');
        setLoading(false);
        return;
      }

      const hasDigitalProduct = validItems.some(item => item.type === 'digital');
      const hasPhysicalProduct = validItems.some(item => item.type !== 'digital');
      let addressString = '';

      if (hasDigitalProduct) {
        if (!buyerName.trim()) {
          alert('لطفا نام و نام خانوادگی خود را وارد کنید');
          setLoading(false);
          return;
        }
        if (!buyerEmail.trim() || !buyerEmail.includes('@')) {
          alert('لطفا ایمیل معتبر خود را وارد کنید (لینک دانلود به این ایمیل ارسال می‌شود)');
          setLoading(false);
          return;
        }
        if (!buyerPhone.trim()) {
          alert('لطفا شماره موبایل خود را وارد کنید (جهت دریافت پیامک تأیید)');
          setLoading(false);
          return;
        }
      }

      if (hasPhysicalProduct) {
        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        addressString = selectedAddress 
          ? `${selectedAddress.province}، ${selectedAddress.city}، ${selectedAddress.street}، پلاک ${selectedAddress.plaque}${selectedAddress.unit ? `، واحد ${selectedAddress.unit}` : ''}`
          : '';

        if (!addressString) {
          alert('لطفا آدرس تحویل را انتخاب کنید');
          setLoading(false);
          return;
        }
      }

      if (paymentMethod === 'card_to_card') {
        if (!cardSenderCard.trim() || cardSenderCard.replace(/\D/g, '').length < 16) {
          alert('لطفا شماره کارت ۱۶ رقمی خود را به طور کامل وارد کنید');
          setLoading(false);
          return;
        }
        if (!cardCode.trim()) {
          alert('لطفا کد رهگیری / شماره ارجاع تراکنش را وارد کنید');
          setLoading(false);
          return;
        }
        if (!cardReceiptUrl) {
          alert('لطفا تصویر رسید بانکی خود را بارگذاری کنید');
          setLoading(false);
          return;
        }
        
        // فقط در صورتی که بیش از یک کارت فعال وجود دارد، انتخاب الزامی است
        const activeCards = (shopSettings?.processedCards || []).filter((c: any) => c.isActive && !c.hasReachedLimit);
        if (activeCards.length > 1 && selectedReceiverCardIdx === -1) {
          alert('لطفا کارت مقصد مورد نظر خود را جهت واریز وجه انتخاب کنید');
          setLoading(false);
          return;
        }
      }

      // Find selected receiver card info
      let receiverCardNumber = shopSettings?.cardNumber || '';
      const cardsList = shopSettings?.processedCards || [];
      if (selectedReceiverCardIdx !== -1 && cardsList[selectedReceiverCardIdx]) {
        receiverCardNumber = cardsList[selectedReceiverCardIdx].cardNumber;
      } else {
        // اگر کارتی انتخاب نشده ولی کارت‌هایی وجود دارند، اولین کارت معتبر را استفاده کن
        const firstValidCard = cardsList.find((c: any) => c.isActive && !c.hasReachedLimit) || cardsList[0];
        if (firstValidCard) {
          receiverCardNumber = firstValidCard.cardNumber;
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, price: i.price })),
          discountCode: discountCode?.code,
          userNotes,
          address: hasPhysicalProduct ? addressString : null,
          deliverToOther: hasPhysicalProduct ? deliverToOther : false,
          otherReceiverName: (hasPhysicalProduct && deliverToOther) ? otherReceiverName : null,
          otherReceiverPhone: (hasPhysicalProduct && deliverToOther) ? otherReceiverPhone : null,
          buyerName: hasDigitalProduct ? buyerName : null,
          buyerEmail: hasDigitalProduct ? buyerEmail : null,
          buyerPhone: hasDigitalProduct ? buyerPhone : null,
          isDigital: hasDigitalProduct && !hasPhysicalProduct,
          paymentMethod,
          onlineGateway: (paymentMethod === 'online' || paymentMethod === 'deposit') ? onlineGateway : null,
          cardToCardReceipt: paymentMethod === 'card_to_card' ? cardReceiptUrl : null,
          cardToCardCode: paymentMethod === 'card_to_card' ? cardCode : null,
          cardToCardSenderCard: paymentMethod === 'card_to_card' ? cardSenderCard : null,
          cardToCardReceiverCard: paymentMethod === 'card_to_card' ? receiverCardNumber : null,
          cardToCardTime: paymentMethod === 'card_to_card' ? cardTime : null,
          shippingCarrier: hasPhysicalProduct ? shippingCarrier : null,
          shippingCost: 0,
          officialInvoice: !!officialInvoice,
          wholesalePaymentType: paymentMethod === 'credit' || paymentMethod === 'deposit' ? paymentMethod : null,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.paymentUrl) {
          // Redirect to ZarinPal payment gateway
          window.location.href = data.paymentUrl;
          return;
        }
        if (data.downloadTokens) {
          setCreatedDownloadTokens(data.downloadTokens);
        }
        setSuccessOrder(data.orderId);
        clearCart();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'خطا در ثبت سفارش');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه');
    } finally {
      setLoading(false);
    }
  };

  const validItems = items.filter(i => i.stockStatus !== 'out_of_stock');
  if (!mounted || (validItems.length === 0 && !successOrder)) return null;

  const originalTotal = getOriginalTotal();
  const productDiscountTotal = getProductDiscountTotal();
  
  // Calculate discountAmount directly in the component to ensure 100% reactivity and correctness
  const discountAmount = (() => {
    if (!discountCode) return 0;
    const activeItems = validItems;
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
      } catch (e) {
        console.error('Error parsing targetCategoryIds in client store:', e);
      }
    }

    const baseTotal = hasCategoryRestriction ? eligibleTotal : (originalTotal - productDiscountTotal);

    if (discountCode.type === 'percentage') {
      return (baseTotal * discountCode.discount) / 100;
    }
    return Math.min(baseTotal, discountCode.discount);
  })();

  const finalTotal = Math.max(0, (originalTotal - productDiscountTotal) - discountAmount);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setTimeout(() => {
            setNewAddress(prev => ({
              ...prev,
              province: 'تهران',
              city: 'تهران',
              street: `ثبت شده از طریق نقشه (مختصات: ${lat.toFixed(4)}، ${lng.toFixed(4)})`,
            }));
            setIsLocating(false);
          }, 1000);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("خطا در دریافت موقعیت مکانی. لطفا دسترسی مرورگر را بررسی کنید.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("مرورگر شما از قابلیت مکان‌یابی پشتیبانی نمی‌کند.");
      setIsLocating(false);
    }
  };

  const selectedAddressObj = addresses.find(a => a.id === selectedAddressId);
  const hasDigitalProduct = validItems.some(item => item.type === 'digital');
  const hasPhysicalProduct = validItems.some(item => item.type !== 'digital');
  const taxAmount = Math.round(finalTotal * 0.09);
  const payTotal = finalTotal + taxAmount;
  const isCreditExceeded = isWholesaler && wholesaleEnabled && paymentMethod === 'credit' && (() => {
    const limit = userProfile?.creditLimit || 0;
    const balance = userProfile?.creditBalance || 0;
    const usableCredit = limit - balance;
    return payTotal > usableCredit;
  })();

  return (
    <>
      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full" dir="rtl">

        {/* Page Header + Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white">تکمیل و پرداخت سفارش</h1>
            <Link href="/cart" className="hidden sm:flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              بازگشت به سبد
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          <ol className="flex items-center gap-1.5 sm:gap-2">
            {/* Step 1 - done */}
            <li className="flex items-center gap-1.5 shrink-0">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">سبد خرید</span>
            </li>
            <span className="flex-1 h-px bg-blue-200 dark:bg-blue-900/50 min-w-[12px]" />
            {/* Step 2 - active */}
            <li className="flex items-center gap-1.5 shrink-0">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">۲</span>
              <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">اطلاعات و پرداخت</span>
            </li>
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700 min-w-[12px]" />
            {/* Step 3 - pending */}
            <li className="flex items-center gap-1.5 shrink-0">
              <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs font-bold">۳</span>
              <span className="text-[11px] sm:text-xs font-bold text-gray-400 dark:text-gray-500">تکمیل سفارش</span>
            </li>
          </ol>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

        {/* Right Column: Details */}
        <div className="flex-1 space-y-6">

        {isValidating && (
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-4 py-2.5 rounded-2xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال بررسی نهایی موجودی و قیمت کالاها...
          </div>
        )}

        {hasDigitalProduct && (
          /* Buyer Information for Digital Products */
          <section className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-55/60 dark:border-gray-800 pb-3 text-base">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              اطلاعات خریدار (محصول دانلودی)
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">نام و نام خانوادگی خریدار</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white font-sans"
                  placeholder="مثال: علی محمدی"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  آدرس ایمیل خریدار <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white font-mono"
                  placeholder="name@example.com"
                  required
                />
                <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 block font-sans">بسیار مهم: لینک‌های دانلود اختصاصی و ایمیل فاکتور به این آدرس ارسال خواهد شد.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">شماره تلفن همراه</label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white text-left font-mono"
                  placeholder="09123456789"
                  required
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block font-sans">جهت دریافت پیامک تأیید خرید و دریافت کد پیگیری.</span>
              </div>
            </div>
          </section>
        )}

        {hasPhysicalProduct && (
          /* Address Selection */
          <section className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                آدرس تحویل
              </h2>
              <button onClick={() => setIsAddressListModalOpen(true)} className="text-blue-600 text-sm font-medium">
                تغییر آدرس
              </button>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl mb-4">
              {selectedAddressObj ? (
                <>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">{selectedAddressObj.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {selectedAddressObj.province}، {selectedAddressObj.city}، {selectedAddressObj.street}، پلاک {selectedAddressObj.plaque}
                    {selectedAddressObj.unit && `، واحد ${selectedAddressObj.unit}`}
                  </p>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>گیرنده: {selectedAddressObj.receiver}</span>
                    <span>تلفن: {selectedAddressObj.phone}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">هنوز آدرسی انتخاب نکرده‌اید.</p>
                  <button 
                    onClick={() => setIsNewAddressModalOpen(true)}
                    className="text-blue-600 text-sm font-medium border border-blue-600 px-4 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    ثبت آدرس جدید
                  </button>
                </div>
              )}
            </div>
            
            {/* Deliver to Another Person */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input 
                  type="checkbox" 
                  checked={deliverToOther}
                  onChange={(e) => setDeliverToOther(e.target.checked)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded" 
                />
                <span className="font-medium text-gray-900 dark:text-white">تحویل به شخص دیگر</span>
              </label>
              
              {deliverToOther && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">نام گیرنده</label>
                    <input
                      type="text"
                      value={otherReceiverName}
                      onChange={(e) => setOtherReceiverName(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: علی محمدی"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">شماره تماس گیرنده</label>
                    <input
                      type="tel"
                      value={otherReceiverPhone}
                      onChange={(e) => setOtherReceiverPhone(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="09..."
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Shipping Method */}
        {hasPhysicalProduct && (
          <section className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              روش ارسال
            </h2>
            <div className="space-y-3">
              <label 
                className={`flex items-center justify-between p-3 border-2 ${shippingCarrier === 'post' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'} rounded-xl cursor-pointer`} 
                onClick={() => setShippingCarrier('post')}
              >
                <div className="flex items-center gap-3">
                  <input type="radio" name="shipping" className="w-5 h-5 text-blue-600 focus:ring-blue-500" checked={shippingCarrier === 'post'} readOnly />
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">پست پیشتاز</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">تحویل ظرف ۳ الی ۵ روز کاری (رایگان)</span>
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </label>

              {shopSettings?.tipaxEnabled && (
                <label 
                  className={`flex items-center justify-between p-3 border-2 ${shippingCarrier === 'tipax' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'} rounded-xl cursor-pointer`} 
                  onClick={() => setShippingCarrier('tipax')}
                >
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" className="w-5 h-5 text-blue-600 focus:ring-blue-500" checked={shippingCarrier === 'tipax'} readOnly />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">تیپاکس (پس‌کرایه)</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">تحویل سریع‌تر، پرداخت هزینه حمل درب منزل هنگام تحویل کالا</span>
                    </div>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-xs border border-blue-500 px-2 py-0.5 rounded">TIPAX</span>
                </label>
              )}

              {isWholesaler && wholesaleEnabled && (
                <>
                  {/* باربری اختصاصی */}
                  <label 
                    className={`flex items-center justify-between p-3 border-2 ${shippingCarrier === 'freight' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'} rounded-xl cursor-pointer`} 
                    onClick={() => setShippingCarrier('freight')}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" className="w-5 h-5 text-blue-600 focus:ring-blue-500" checked={shippingCarrier === 'freight'} readOnly />
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">حمل با باربری / ناوگان اختصاصی</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">محاسبه هوشمند کرایه بر اساس کل وزن و حجم محموله (پرداخت پس از صدور بارنامه)</span>
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </label>

                  {/* تحویل درب کارخانه (Ex-works) */}
                  <label 
                    className={`flex items-center justify-between p-3 border-2 ${shippingCarrier === 'ex_works' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'} rounded-xl cursor-pointer`} 
                    onClick={() => setShippingCarrier('ex_works')}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" className="w-5 h-5 text-blue-600 focus:ring-blue-500" checked={shippingCarrier === 'ex_works'} readOnly />
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">تحویل درب کارخانه / انبار مرکزی (Ex-Works)</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">بارگیری محموله مستقیماً توسط وسایل نقلیه خریدار از درب کارخانه (رایگان)</span>
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </label>
                </>
              )}
            </div>
          </section>
        )}

        {/* Payment Method */}
        <section className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            روش پرداخت
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* اسنپ پی */}
              <div onClick={() => { setPaymentMethod('online'); setOnlineGateway('snapppay'); }} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'online' && onlineGateway === 'snapppay' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                {paymentMethod === 'online' && onlineGateway === 'snapppay' && (
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                )}
                <div className="h-10 flex items-center justify-center w-full">
                  <img src="/logos/snapppay.png" alt="Snapp! Pay" className="h-9 w-auto object-contain max-w-full dark:brightness-110" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white leading-tight">اسنپ‌پی</span>
              </div>

              {/* زرین پال */}
              <div onClick={() => { setPaymentMethod('online'); setOnlineGateway('zarinpal'); }} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'online' && onlineGateway === 'zarinpal' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                {paymentMethod === 'online' && onlineGateway === 'zarinpal' && (
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                )}
                <div className="h-10 flex items-center justify-center w-full">
                  <img src="/logos/zarinpal.png" alt="ZarinPal" className="h-9 w-auto object-contain max-w-full dark:brightness-110" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white leading-tight">زرین‌پال</span>
              </div>

              {/* زیبال */}
              <div onClick={() => { setPaymentMethod('online'); setOnlineGateway('zibal'); }} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'online' && onlineGateway === 'zibal' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                {paymentMethod === 'online' && onlineGateway === 'zibal' && (
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                )}
                <div className="h-10 flex items-center justify-center w-full">
                  <img src="/logos/zibal.png" alt="Zibal" className="h-9 w-auto object-contain max-w-full dark:brightness-110" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white leading-tight">زیبال</span>
              </div>

              {/* دیجی پی */}
              <div onClick={() => { setPaymentMethod('online'); setOnlineGateway('digipay'); }} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'online' && onlineGateway === 'digipay' ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800'}`}>
                {paymentMethod === 'online' && onlineGateway === 'digipay' && (
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                )}
                <div className="h-10 flex items-center justify-center w-full">
                  <img src="/logos/digipay.png" alt="DigiPay" className="h-9 w-auto object-contain max-w-full dark:brightness-110" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white leading-tight">دیجی‌پی</span>
              </div>

              {/* کیف پول */}
              <div onClick={() => setPaymentMethod('wallet')} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                {paymentMethod === 'wallet' && (
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                )}
                <div className="h-10 flex items-center justify-center w-full text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z"/></svg>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white leading-tight">کیف پول</span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">اعتبار: ۵۰,۰۰۰</span>
                </div>
              </div>

              {/* پرداخت در محل */}
              {hasPhysicalProduct && (
                <div onClick={() => setPaymentMethod('cod')} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                  {paymentMethod === 'cod' && (
                    <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                  )}
                  <div className="h-10 flex items-center justify-center w-full text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white leading-tight">پرداخت در محل</span>
                </div>
              )}

              {/* کارت به کارت */}
              {shopSettings?.cardToCardEnabled && (
                <div onClick={() => setPaymentMethod('card_to_card')} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'card_to_card' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                  {paymentMethod === 'card_to_card' && (
                    <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                  )}
                  <div className="h-10 flex items-center justify-center w-full text-emerald-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M6 14h.01M10 14h.01"/></svg>
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white leading-tight">کارت به کارت</span>
                </div>
              )}

              {/* B2B اعتباری */}
              {isWholesaler && wholesaleEnabled && (
                <>
                  <div onClick={() => setPaymentMethod('credit')} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                    {paymentMethod === 'credit' && (
                      <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                    )}
                    <div className="h-10 flex items-center justify-center w-full text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white leading-tight">اعتباری (نسیه)</span>
                  </div>

                  <div onClick={() => { setPaymentMethod('deposit'); if (!shopSettings?.zarinpalEnabled && shopSettings?.zibalEnabled) { setOnlineGateway('zibal'); } else { setOnlineGateway('zarinpal'); } }} className={`relative flex flex-col items-center justify-between text-center gap-1.5 p-3 min-h-[105px] border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'deposit' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}>
                    {paymentMethod === 'deposit' && (
                      <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
                    )}
                    <div className="h-10 flex items-center justify-center w-full text-indigo-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white leading-tight">بیعانه ۳۰٪</span>
                  </div>
                </>
              )}
            </div>

            {/* B2B credit info */}
            {isWholesaler && wholesaleEnabled && paymentMethod === 'credit' && (() => {
              const limit = userProfile?.creditLimit || 0;
              const balance = userProfile?.creditBalance || 0;
              const usableCredit = limit - balance;
              const orderTotal = payTotal;
              const remainingAfter = usableCredit - orderTotal;
              const isExceeded = remainingAfter < 0;

              return (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                    <h4 className="font-black text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Store size={14} />
                      خلاصه وضعیت پرداخت اعتباری
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="block text-[10px] text-gray-400">اعتبار قابل استفاده فعلی:</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">
                          {usableCredit.toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="block text-[10px] text-gray-400">مبلغ این سفارش:</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                          {orderTotal.toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                      <div className={`p-3 rounded-xl border ${isExceeded ? 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/40' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                        <span className="block text-[10px] text-gray-400">اعتبار پس از این سفارش:</span>
                        <span className={`text-sm font-black mt-0.5 block ${isExceeded ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {remainingAfter.toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                    </div>
                    {isExceeded && (
                      <div className="text-red-600 dark:text-red-400 text-[11px] font-black mt-2 flex items-center gap-1.5">
                        <Info size={14} />
                        <span>خطا: مبلغ سفارش بیش از سقف اعتبار قابل استفاده شماست. لطفا سبد خرید خود را ویرایش کنید یا روش پرداخت دیگری انتخاب نمایید.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* B2B deposit info */}
            {isWholesaler && wholesaleEnabled && paymentMethod === 'deposit' && (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/40 rounded-2xl text-xs text-gray-600 dark:text-gray-300 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-150">
                ۳۰٪ مبلغ سفارش به صورت آنلاین بیعانه دریافت شده و مابقی قبل از تحویل بار تسویه می‌گردد.
              </div>
            )}

            {/* کارت به کارت */}
            {shopSettings?.cardToCardEnabled && paymentMethod === 'card_to_card' && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* بخش انتخاب کارت توسط خود کاربر یا چرخش رندم هوشمند */}
                    {(shopSettings.processedCards || []).filter((c: any) => c.isActive && !c.hasReachedLimit).length > 1 && (
                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-gray-700 dark:text-gray-300">کارت مقصد را انتخاب کنید</span>

                        <div className="space-y-2">
                          {(() => {
                            const cards = shopSettings.processedCards || [];

                            return cards.map((card: any, idx: number) => {
                              const isSelected = selectedReceiverCardIdx === idx;
                              const limitReached = !!card.hasReachedLimit;

                              return (
                                <div 
                                  key={card.id || idx}
                                  onClick={() => {
                                    if (limitReached) {
                                      alert('سقف پذیرش این کارت پر شده است. لطفاً کارت فعال دیگری را جهت واریز وجه انتخاب کنید.');
                                      return;
                                    }
                                    setSelectedReceiverCardIdx(idx);
                                  }}
                                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10' 
                                      : limitReached 
                                        ? 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'
                                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{card.cardBankName}</p>
                                      <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400 tracking-wider" dir="ltr">
                                        {card.cardNumber.replace(/(\d{4})/g, '$1-').replace(/-$/, '')}
                                      </p>
                                    </div>
                                  </div>
                                  {limitReached ? (
                                    <span className="text-[9px] font-black text-red-500 shrink-0">تکمیل سقف</span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[90px] shrink-0">{card.cardHolderName}</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* نمایش تک‌کارت فعال یا کارت پیش‌فرض در صورتی که انتخاب چندگانه نیاز نباشد */}
                    {((shopSettings.processedCards || []).filter((c: any) => c.isActive && !c.hasReachedLimit).length <= 1) && (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                        {(() => {
                          const cards = shopSettings.processedCards || [];
                          const activeCard = cards.find((c: any) => c.isActive && !c.hasReachedLimit) || cards[0] || {
                            cardNumber: shopSettings.cardNumber,
                            cardHolderName: shopSettings.cardHolderName,
                            cardBankName: shopSettings.cardBankName,
                            cardSheba: shopSettings.cardSheba
                          };

                          return (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{activeCard.cardBankName || 'بانک مقصد'}</span>
                                <CreditCard className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="font-mono font-bold text-base sm:text-lg tracking-widest text-gray-900 dark:text-white select-all" dir="ltr">
                                  {activeCard.cardNumber.replace(/(\d{4})/g, '$1-').replace(/-$/, '')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard?.writeText(activeCard.cardNumber)}
                                  className="text-gray-400 hover:text-emerald-500 transition-colors shrink-0"
                                  title="کپی شماره کارت"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex justify-between items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <span className="truncate">صاحب کارت: <b className="text-gray-900 dark:text-white font-bold">{activeCard.cardHolderName}</b></span>
                                {activeCard.cardSheba && (
                                  <span className="font-mono shrink-0 select-all" dir="ltr">IR-{activeCard.cardSheba}</span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      مبلغ قابل پرداخت را به کارت بالا واریز کنید، سپس مشخصات و تصویر رسید واریزی را وارد نمایید.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">شماره کارت واریز کننده (۱۶ رقم)</label>
                        <input
                          type="text"
                          maxLength={16}
                          value={cardSenderCard}
                          onChange={(e) => setCardSenderCard(e.target.value.replace(/\D/g, ''))}
                          placeholder="6037xxxxxxxxxxxx"
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-mono tracking-widest text-center outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">شماره ارجاع / پیگیری تراکنش</label>
                        <input
                          type="text"
                          value={cardCode}
                          onChange={(e) => setCardCode(e.target.value)}
                          placeholder="مثلا: 123456"
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">زمان پرداخت (ساعت و دقیقه)</label>
                        <input
                          type="text"
                          value={cardTime}
                          onChange={(e) => setCardTime(e.target.value)}
                          placeholder="مثلا: 14:35"
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">آپلود فیش واریزی (رسید تصویری)</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              setUploadingReceipt(true);
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                
                                const uploadRes = await fetch('/api/media', {
                                  method: 'POST',
                                  body: formData
                                });
                                
                                if (uploadRes.ok) {
                                  const media = await uploadRes.json();
                                  setCardReceiptUrl(media.url);
                                } else {
                                  alert('خطا در بارگذاری تصویر رسید');
                                }
                              } catch (err) {
                                console.error(err);
                                alert('خطا در ارتباط با سرور');
                              } finally {
                                setUploadingReceipt(false);
                              }
                            }}
                            className="hidden"
                            id="receipt-file-input"
                          />
                          <label
                            htmlFor="receipt-file-input"
                            className={`w-full p-2.5 border border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${cardReceiptUrl ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400' : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                          >
                            {uploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : cardReceiptUrl ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            {uploadingReceipt ? 'در حال بارگذاری فیش...' : cardReceiptUrl ? 'تغییر رسید آپلود شده' : 'انتخاب تصویر فیش واریزی'}
                          </label>
                          {cardReceiptUrl && (
                            <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-emerald-500 animate-in zoom-in-95">
                              <img src={cardReceiptUrl} alt="Receipt Preview" className="object-cover w-full h-full" />
                              <button
                                type="button"
                                onClick={() => setCardReceiptUrl('')}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
          </div>
        </section>

        {/* فاکتور رسمی B2B */}
        {isWholesaler && wholesaleEnabled && (
          <section className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              درخواست فاکتور رسمی مالیاتی
            </h2>
            <label className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-950/50 rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={officialInvoice}
                onChange={(e) => setOfficialInvoice(e.target.checked)}
              />
              <div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white block">مایلم فاکتور رسمی با احتساب ارزش افزوده صادر شود</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">اطلاعات حقوقی شرکت شما جهت صدور فاکتور رسمی از پروفایل کاربری دریافت خواهد شد.</span>
              </div>
            </label>
          </section>
        )}

        {/* Order Notes */}
        <section className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            توضیحات سفارش (اختیاری)
          </h2>
          <textarea
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="اگر توضیحات خاصی برای این سفارش دارید اینجا بنویسید..."
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[100px]"
          ></textarea>
        </section>
        </div>

        {/* Left Column: Order Summary */}
        <div className="w-full lg:w-96 space-y-6">
        {/* Order Summary */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 sticky top-24 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <ShoppingBag className="w-[18px] h-[18px]" />
              </span>
              خلاصه سفارش
            </h2>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full ring-1 ring-gray-100 dark:ring-gray-700">
              {validItems.reduce((a, b) => a + b.quantity, 0).toLocaleString('fa-IR')} کالا
            </span>
          </div>

          <div className="p-4">
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto custom-scrollbar -mx-1 px-1">
            {validItems.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <div className="relative w-14 h-14 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 ring-1 ring-gray-100 dark:ring-gray-700">
                  <img src={item.imageUrl || '/placeholder.png'} alt={item.title} className="object-cover w-full h-full" />
                  {item.quantity > 1 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-gray-900/85 dark:bg-white/90 text-white dark:text-gray-900 text-[10px] font-black rounded-bl-lg">
                      {item.quantity.toLocaleString('fa-IR')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 mb-1.5">{item.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                    <span className="text-gray-700 dark:text-gray-300 font-black">{(item.price * item.quantity).toLocaleString('fa-IR')} <span className="font-medium text-gray-400">تومان</span></span>
                    {item.type === 'digital' && (
                      <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold shrink-0 text-[10px]">
                        <span>{item.fileFormat || 'ZIP'}</span>
                        <span>•</span>
                        <span>{item.fileSize || 'دانلود'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Discount Code Input Section */}
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-4 mt-1 mb-4">
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-700 dark:text-gray-300">
              <Tag className="w-4 h-4 text-blue-500" />
              <span>کد تخفیف دارید؟</span>
            </div>
            {discountCode ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/40 p-3 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-green-800 dark:text-green-300 truncate">کد <span className="font-mono font-bold uppercase">{discountCode.code}</span> اعمال شد</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 font-bold">
                      {discountCode.type === 'percentage' ? `${discountCode.discount}٪ تخفیف` : `${discountCode.discount.toLocaleString('fa-IR')} تومان تخفیف`}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={removeDiscount}
                  className="text-red-500 hover:text-red-600 text-[10px] font-black px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700 rounded-lg shadow-sm shrink-0 active:scale-95 transition-all"
                >
                  حذف
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="کد تخفیف را وارد کنید"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center uppercase font-mono tracking-wider"
                  dir="ltr"
                />
                <button 
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={isApplying || !discountInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 active:scale-95 shrink-0"
                >
                  {isApplying ? '...' : 'اعمال'}
                </button>
              </div>
            )}
            {discountMessage.text && (
              <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${discountMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                <span className="w-1 h-1 rounded-full shrink-0 bg-current" />
                <span>{discountMessage.text}</span>
              </p>
            )}
          </div>

          <div className="space-y-2.5 text-xs border-t border-dashed border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <span>مبلغ کالاها</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{originalTotal.toLocaleString('fa-IR')} تومان</span>
            </div>
            
            {productDiscountTotal > 0 && (
              <div className="flex justify-between items-center text-rose-500 font-medium">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> تخفیف کالاها</span>
                <span className="font-bold">- {productDiscountTotal.toLocaleString('fa-IR')} تومان</span>
              </div>
            )}
            
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> تخفیف کد ({discountCode?.code})</span>
                <span className="font-bold">- {discountAmount.toLocaleString('fa-IR')} تومان</span>
              </div>
            )}

            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1"><Receipt className="w-3.5 h-3.5 text-gray-400" /> مالیات بر ارزش افزوده (۹٪)</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{taxAmount.toLocaleString('fa-IR')} تومان</span>
            </div>
            
            {hasPhysicalProduct && (
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 gap-2">
                <span className="flex items-center gap-1 shrink-0"><Truck className="w-3.5 h-3.5 text-gray-400" /> هزینه ارسال</span>
                <span className="font-bold text-gray-700 dark:text-gray-300 text-left text-[11px]">
                  {shippingCarrier === 'tipax' ? 'پس‌کرایه (پرداخت هنگام تحویل)' : 
                   shippingCarrier === 'freight' ? 'پس از بارگیری (محاسبه بر اساس وزن/حجم)' : 
                   shippingCarrier === 'ex_works' ? 'تحویل درب کارخانه (رایگان)' : 'رایگان'}
                </span>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-150 dark:border-gray-800 flex justify-between items-baseline">
              <span className="font-bold text-sm text-gray-900 dark:text-white">{paymentMethod === 'deposit' ? 'کل مبلغ سفارش' : 'مبلغ قابل پرداخت'}</span>
              <span className="font-black text-lg text-gray-900 dark:text-white">{payTotal.toLocaleString('fa-IR')} <span className="text-xs font-medium text-gray-400">تومان</span></span>
            </div>

            {(productDiscountTotal + discountAmount) > 0 && (
              <div className="flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold py-2 rounded-xl mt-1">
                <Sparkles className="w-3.5 h-3.5" />
                {(productDiscountTotal + discountAmount).toLocaleString('fa-IR')} تومان سود شما از این خرید
              </div>
            )}

            {paymentMethod === 'deposit' && (
              <div className="space-y-2 mt-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-xs">
                <div className="flex justify-between font-bold text-indigo-700 dark:text-indigo-400">
                  <span>مبلغ بیعانه (پرداخت اکنون - ۳۰٪)</span>
                  <span>{(payTotal * 0.3).toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>مبلغ تسویه (قبل از تحویل بار - ۷۰٪)</span>
                  <span>{(payTotal * 0.7).toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            )}
            
            {/* Desktop Pay Button */}
            <button 
              onClick={handleCheckout}
              disabled={loading || isCreditExceeded}
              className={`hidden lg:flex w-full items-center justify-center gap-2 ${isCreditExceeded ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed shadow-none' : hasDigitalProduct ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'} text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 mt-6`}
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> در حال پردازش...</>
              ) : isCreditExceeded ? 'اعتبار ناکافی جهت ثبت سفارش' : paymentMethod === 'deposit' ? `پرداخت بیعانه ${(payTotal * 0.3).toLocaleString('fa-IR')} تومان` : paymentMethod === 'credit' ? `ثبت سفارش اعتباری` : `پرداخت ${payTotal.toLocaleString('fa-IR')} تومان`}
            </button>

            <p className="hidden lg:flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mt-3">
              <Lock className="w-3.5 h-3.5" />
              پرداخت امن و رمزنگاری‌شده
            </p>

            <div className="hidden lg:grid grid-cols-3 gap-2 mt-4">
              <div className="flex flex-col items-center gap-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl py-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ضمانت اصالت
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl py-2.5">
                <Lock className="w-4 h-4 text-emerald-500" />
                پرداخت امن
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl py-2.5">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                ضمانت بازگشت
              </div>
            </div>
          </div>
          </div>
        </section>
        </div>
        </div>
      </main>

      {/* Mobile Pay Button Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 pb-safe z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.15)] flex justify-center">
        <div className="w-full max-w-3xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {paymentMethod === 'deposit' ? 'مبلغ بیعانه (۳۰٪)' : 'مبلغ قابل پرداخت'}
              </p>
              <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {(paymentMethod === 'deposit' ? payTotal * 0.3 : payTotal).toLocaleString('fa-IR')}
                <span className="text-xs font-normal text-gray-500 mr-1">تومان</span>
              </p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
              <Lock className="w-3.5 h-3.5" />
              پرداخت امن
            </span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={loading || isCreditExceeded}
            className={`w-full flex items-center justify-center gap-1.5 ${isCreditExceeded ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed shadow-none' : hasDigitalProduct ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'} text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100`}
          >
            {loading ? 'در حال پردازش...' : isCreditExceeded ? 'اعتبار ناکافی جهت ثبت سفارش' : paymentMethod === 'deposit' ? `پرداخت بیعانه ${(payTotal * 0.3).toLocaleString('fa-IR')} تومان` : paymentMethod === 'credit' ? `ثبت سفارش اعتباری` : `پرداخت ${payTotal.toLocaleString('fa-IR')} تومان`}
          </button>
        </div>
      </div>

      {/* Address List Modal */}
      {isAddressListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a222c] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                انتخاب آدرس
              </h2>
              <button 
                onClick={() => setIsAddressListModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label 
                    key={addr.id} 
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <input 
                      type="radio" 
                      name="address" 
                      checked={selectedAddressId === addr.id}
                      onChange={() => {
                        setSelectedAddressId(addr.id);
                        setIsAddressListModalOpen(false);
                      }}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-900 dark:text-white">{addr.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {addr.province}، {addr.city}، {addr.street}، پلاک {addr.plaque}
                        {addr.unit && `، واحد ${addr.unit}`}
                      </p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>گیرنده: {addr.receiver}</span>
                        <span>تلفن: {addr.phone}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a222c] flex justify-between items-center">
              <button 
                onClick={() => {
                  setIsAddressListModalOpen(false);
                  setNewAddress({});
                  setIsNewAddressModalOpen(true);
                }}
                className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
              >
                <Plus size={18} />
                ثبت آدرس جدید
              </button>
              <button 
                onClick={() => setIsAddressListModalOpen(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
              >
                تایید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Address Modal */}
      {isNewAddressModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a222c] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                ثبت آدرس جدید
              </h2>
              <button 
                onClick={() => setIsNewAddressModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Location Auto-Fetch Button */}
              <button 
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="w-full mb-6 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-blue-200 dark:border-blue-900/30 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Crosshair size={28} className={isLocating ? 'animate-spin' : ''} />
                <span className="font-bold text-sm">
                  {isLocating ? 'در حال دریافت موقعیت مکانی...' : 'مسیریابی و ثبت خودکار آدرس از طریق نقشه (لوکیشن)'}
                </span>
                <span className="text-xs opacity-70">
                  برای راحتی شما، مرورگر به صورت خودکار آدرس را پیدا می‌کند
                </span>
              </button>

              <form id="newAddressForm" onSubmit={async (e) => {
                e.preventDefault();
                if (!newAddress.title || !newAddress.street) return;

                setIsSubmittingAddress(true);
                try {
                  const res = await fetch('/api/profile/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newAddress),
                  });
                  
                  if (res.ok) {
                    const data = await res.json();
                    const addedAddress = {
                      ...data.address,
                      province: data.address.state,
                      postalCode: data.address.zipCode,
                      isDefault: addresses.length === 0
                    };
                    setAddresses([addedAddress, ...addresses]);
                    setSelectedAddressId(addedAddress.id);
                    setIsNewAddressModalOpen(false);
                    setNewAddress({});
                  } else {
                    if (res.status === 401 || res.status === 404) {
                      alert('جلسه شما منقضی شده است یا حساب کاربری یافت نشد. لطفاً دوباره وارد شوید.');
                      router.push('/login');
                    } else {
                      alert('خطا در ثبت آدرس');
                    }
                  }
                } catch (error) {
                  console.error('Error saving address:', error);
                  alert('خطا در ارتباط با سرور');
                } finally {
                  setIsSubmittingAddress(false);
                }
              }} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">عنوان آدرس</label>
                    <input 
                      required
                      type="text" 
                      placeholder="مثال: خانه، محل کار"
                      value={newAddress.title || ''}
                      onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">کد پستی</label>
                    <input 
                      type="text" 
                      placeholder="کد پستی 10 رقمی"
                      value={newAddress.postalCode || ''}
                      onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">استان</label>
                    <input 
                      required
                      type="text" 
                      placeholder="استان"
                      value={newAddress.province || ''}
                      onChange={e => setNewAddress({...newAddress, province: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">شهر</label>
                    <input 
                      required
                      type="text" 
                      placeholder="شهر"
                      value={newAddress.city || ''}
                      onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">خیابان / کوچه</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="خیابان اصلی، خیابان فرعی، کوچه..."
                    value={newAddress.street || ''}
                    onChange={e => setNewAddress({...newAddress, street: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">پلاک</label>
                    <input 
                      required
                      type="text" 
                      placeholder="پلاک"
                      value={newAddress.plaque || ''}
                      onChange={e => setNewAddress({...newAddress, plaque: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">واحد (اختیاری)</label>
                    <input 
                      type="text" 
                      placeholder="واحد"
                      value={newAddress.unit || ''}
                      onChange={e => setNewAddress({...newAddress, unit: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">نام گیرنده</label>
                    <input 
                      required
                      type="text" 
                      placeholder="نام و نام خانوادگی تحویل گیرنده"
                      value={newAddress.receiver || ''}
                      onChange={e => setNewAddress({...newAddress, receiver: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">شماره موبایل گیرنده</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="09..."
                      value={newAddress.phone || ''}
                      onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a222c] flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsNewAddressModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                انصراف
              </button>
              <button 
                type="submit"
                form="newAddressForm"
                disabled={isSubmittingAddress}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <Check size={18} />
                {isSubmittingAddress ? 'در حال ثبت...' : 'ثبت آدرس'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 max-w-lg w-full text-center relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">پرداخت با موفقیت انجام شد!</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">سفارش شما با شماره پیگیری زیر ثبت گردید.</p>
            
            <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl mb-5 border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">کد پیگیری سفارش</p>
              <p className="text-base font-mono font-bold text-purple-600 dark:text-purple-400 tracking-wider">{successOrder.slice(-8).toUpperCase()}</p>
            </div>

            {paymentMethod === 'credit' && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl mb-5 text-right space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>مبلغ کسر شده از اعتبار:</span>
                  <span className="text-gray-900 dark:text-white">{payTotal.toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex justify-between border-t border-indigo-100/50 dark:border-indigo-900/20 pt-1.5 text-indigo-700 dark:text-indigo-400">
                  <span>باقی‌مانده اعتبار شما:</span>
                  <span>{Math.max(0, (userProfile?.creditLimit || 0) - (userProfile?.creditBalance || 0) - payTotal).toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            )}

            {createdDownloadTokens.length > 0 && (
              <div className="text-right space-y-3 mb-6 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-4 rounded-2xl">
                <h3 className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5 border-b border-purple-100 dark:border-purple-900/20 pb-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  لینک‌های دانلود فوری کالا:
                </h3>
                
                <div className="space-y-3">
                  {createdDownloadTokens.map((tok, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-purple-100 dark:border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{tok.productTitle}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          <span>فرمت: <b className="font-mono text-purple-600 dark:text-purple-400">{tok.fileFormat}</b></span>
                          <span>•</span>
                          <span>حجم: <b>{tok.fileSize}</b></span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-gray-400">
                          <span>تعداد دفعات مجاز دانلود: <b>{tok.maxDownloads > 0 ? `${tok.maxDownloads} بار` : 'نامحدود'}</b></span>
                          <span>اعتبر لینک: <b className="text-red-500">{tok.expiresAt || 'همیشگی'}</b></span>
                        </div>
                      </div>
                      
                      <a 
                        href={`/api/downloads/${tok.token}`}
                        download
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 shadow-md shadow-purple-500/10 active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        دانلود فوری فایل
                      </a>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1 bg-white/60 dark:bg-black/20 p-2.5 rounded-xl text-[10px] text-gray-500 leading-relaxed border border-purple-50/50 dark:border-purple-900/10">
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    ایمیل حاوی لینک‌های دانلود اختصاصی به ایمیل شما ارسال شد.
                  </div>
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    پیامک تأیید خرید و کد پیگیری به شماره موبایل شما ارسال گردید.
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {createdDownloadTokens.length > 0 && (
                <Link href="/profile/downloads" className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm shadow-purple-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  مشاهده در بخش «دانلودهای من» پروفایل
                </Link>
              )}
              <a 
                href={`/api/orders/${successOrder}/proforma`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>دانلود پیش‌فاکتور (PDF)</span>
              </a>
              <Link href={`/profile/orders/${successOrder}`} className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors">
                مشاهده جزئیات و فاکتور سفارش
              </Link>
              <Link href="/" className="block w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-xs transition-colors">
                بازگشت به صفحه اصلی فروشگاه
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}