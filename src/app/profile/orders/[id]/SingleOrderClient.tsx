'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { 
  CalendarDays, 
  Clock, 
  Truck, 
  Package, 
  CreditCard, 
  Info, 
  ArrowRight, 
  Printer, 
  Check, 
  Copy, 
  AlertCircle, 
  XCircle, 
  ExternalLink,
  CheckCircle2,
  Star,
  MessageSquare
} from 'lucide-react';

interface OrderItem {
  id: string;
  title: string;
  imageUrl: string;
  type?: string | null;
  quantity: number;
  price: number;
  downloadToken?: string | null;
  downloadCount?: number;
  maxDownloads?: number;
  expiresAt?: string | null;
  hasReviewed?: boolean;
  reviewStatus?: string | null;
  reviewRating?: number | null;
  reviewComment?: string | null;
}

interface Order {
  id: string;
  fullId: string;
  date: string;
  status: string;
  exactStatus: string;
  deliveryTime: string;
  shippingType: string;
  trackingCode: string;
  totalAmount: number;
  shippingCost: number;
  packagingCost: number;
  discount: number;
  paidAmount: number;
  paymentType: string;
  paymentStatus: string;
  paymentDate: string;
  transactionId: string;
  userNotes?: string | null;
  adminNotes?: string | null;
  cardToCardReceipt?: string | null;
  cardToCardSenderCard?: string | null;
  cardToCardTime?: string | null;
  items: OrderItem[];
}

const statusConfig = {
  current: { label: 'جاری', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' },
  delivered: { label: 'تحویل شده', color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30' },
  returned: { label: 'مرجوعی', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30' },
  cancelled: { label: 'لغو شده', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30' },
};

export default function SingleOrderClient({ order }: { order: Order }) {
  const router = useRouter();
  const { addToCart } = useCartStore();
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedTransaction, setCopiedTransaction] = useState(false);

  // States for delivery confirmation
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // States for product reviews
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [submittingReviews, setSubmittingReviews] = useState<Record<string, boolean>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewSuccesses, setReviewSuccesses] = useState<Record<string, string>>({});
  const [hoveredStars, setHoveredStars] = useState<Record<string, number>>({});

  const handleConfirmDelivery = async () => {
    try {
      setIsSubmittingDelivery(true);
      setDeliveryError(null);
      const res = await fetch(`/api/profile/orders/${order.fullId}/deliver`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطایی رخ داده است.');
      }
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setDeliveryError(err.message || 'خطا در تایید تحویل سفارش.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handleSubmitReview = async (productId: string) => {
    const rating = reviewRatings[productId] || 5;
    const comment = reviewComments[productId] || '';

    if (!comment.trim()) {
      setReviewErrors(prev => ({ ...prev, [productId]: 'لطفاً متن نظر خود را وارد کنید.' }));
      return;
    }

    try {
      setReviewErrors(prev => ({ ...prev, [productId]: '' }));
      setReviewSuccesses(prev => ({ ...prev, [productId]: '' }));
      setSubmittingReviews(prev => ({ ...prev, [productId]: true }));

      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطایی رخ داده است.');
      }

      setReviewSuccesses(prev => ({ ...prev, [productId]: 'نظر شما با موفقیت ثبت شد و پس از تایید مدیریت نمایش داده خواهد شد.' }));
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setReviewErrors(prev => ({ ...prev, [productId]: err.message || 'خطا در ثبت نظر.' }));
    } finally {
      setSubmittingReviews(prev => ({ ...prev, [productId]: false }));
    }
  };

  const getExactStatusLabel = (exactStatus: string) => {
    switch (exactStatus) {
      case 'pending': return 'در انتظار پرداخت';
      case 'paid': return 'پرداخت شده / در حال آماده‌سازی';
      case 'shipped': return 'ارسال شده';
      case 'delivered': return 'تحویل شده';
      case 'returned': return 'مرجوعی';
      case 'cancelled': return 'لغو شده';
      default: return 'جاری';
    }
  };

  const handleCopyTracking = () => {
    if (!order.trackingCode || order.trackingCode === '-') return;
    navigator.clipboard.writeText(order.trackingCode);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleCopyTransaction = () => {
    if (!order.transactionId || order.transactionId === '-') return;
    navigator.clipboard.writeText(order.transactionId);
    setCopiedTransaction(true);
    setTimeout(() => setCopiedTransaction(false), 2000);
  };

  const statusStyle = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.current;

  // Stepper steps
  const steps = [
    { id: 'pending', label: 'ثبت سفارش', icon: Package },
    { id: 'paid', label: 'پرداخت شده', icon: CreditCard },
    { id: 'shipped', label: 'ارسال شده', icon: Truck },
    { id: 'delivered', label: 'تحویل شده', icon: CheckCircle2 },
  ];

  const getStepStatus = (stepId: string) => {
    const statusOrder = ['pending', 'paid', 'shipped', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(order.exactStatus);
    
    if (currentStatusIndex === -1) return 'inactive';

    const stepIndex = statusOrder.indexOf(stepId);
    if (stepIndex < currentStatusIndex) {
      return 'completed';
    } else if (stepIndex === currentStatusIndex) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  const getProgressWidth = () => {
    switch (order.exactStatus) {
      case 'pending': return '0%';
      case 'paid': return '33.33%';
      case 'shipped': return '66.66%';
      case 'delivered': return '100%';
      default: return '0%';
    }
  };

  const isNormalFlow = ['pending', 'paid', 'shipped', 'delivered'].includes(order.exactStatus);

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/profile/orders" 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#24303f] shadow-sm border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                جزئیات سفارش <span className="font-mono text-gray-500 dark:text-gray-400 text-base sm:text-lg">#{order.id}</span>
              </h1>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusStyle.color}`}>
                {getExactStatusLabel(order.exactStatus)}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ثبت شده در {order.date}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-col sm:flex-row">
          <button
            onClick={() => {
              for (const item of order.items) {
                addToCart({
                  id: item.id,
                  title: item.title,
                  price: item.price,
                  imageUrl: item.imageUrl,
                  type: item.type || 'physical'
                }, item.quantity);
              }
              router.push('/cart');
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>سفارش مجدد (تکرار سفارش)</span>
          </button>

          <Link
            href={`/orders/${order.fullId}/invoice?view=customer`}
            target="_blank"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto"
          >
            <Printer size={16} />
            <span>مشاهده و چاپ فاکتور</span>
          </Link>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden space-y-6 p-4 sm:p-6">
        
        {/* 1. Order Status Stepper or Banner */}
        {!isNormalFlow ? (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            order.exactStatus === 'cancelled' 
              ? 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-800 dark:text-red-400' 
              : 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/20 text-orange-800 dark:text-orange-400'
          }`}>
            {order.exactStatus === 'cancelled' ? <XCircle className="flex-shrink-0 mt-0.5" size={20} /> : <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />}
            <div>
              <h4 className="font-bold text-sm">
                سفارش {order.exactStatus === 'cancelled' ? 'لغو شده است' : 'مرجوع شده است'}
              </h4>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">
                {order.exactStatus === 'cancelled' 
                  ? 'این سفارش لغو شده و دیگر در چرخه پردازش قرار ندارد. در صورت کسر وجه، مبلغ تا ۷۲ ساعت آینده به حساب شما بازگردانده خواهد شد.' 
                  : 'کالاهای این سفارش مرجوع شده‌اند. برای اطلاعات بیشتر می‌توانید با پشتیبانی تماس بگیرید.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-[#1a222c] rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 space-y-6">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">وضعیت سفارش شما</h3>
            
            <div className="relative flex items-center justify-between w-full px-2 sm:px-6">
              {/* Stepper Progress Bar */}
              <div className="absolute right-6 left-6 top-5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full -z-0">
                <div 
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: getProgressWidth() }}
                />
              </div>

              {/* Steps */}
              {steps.map((step) => {
                const stepStatus = getStepStatus(step.id);
                const StepIcon = step.icon;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center relative z-10 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      stepStatus === 'completed'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-none'
                        : stepStatus === 'active'
                        ? 'bg-white dark:bg-[#24303f] border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 shadow-md shadow-blue-100 dark:shadow-none scale-110'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-transparent'
                    }`}>
                      {stepStatus === 'completed' ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <StepIcon size={18} />
                      )}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold mt-2.5 transition-colors ${
                      stepStatus === 'active'
                        ? 'text-blue-600 dark:text-blue-400'
                        : stepStatus === 'completed'
                        ? 'text-gray-900 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm Delivery Banner */}
        {['paid', 'shipped'].includes(order.exactStatus) && (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Package size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">بسته خود را تحویل گرفته‌اید؟</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0.5 leading-relaxed">
                  در صورتی که مرسوله خود را دریافت کرده‌اید، لطفاً جهت تکمیل خرید و فعال شدن بخش نظرسنجی، دکمه زیر را کلیک کنید.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 flex-shrink-0">
              <button
                onClick={handleConfirmDelivery}
                disabled={isSubmittingDelivery}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isSubmittingDelivery ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} strokeWidth={2.5} />
                )}
                <span>بسته را تحویل گرفتم</span>
              </button>
              {deliveryError && (
                <span className="text-[11px] text-red-500 font-bold">{deliveryError}</span>
              )}
            </div>
          </div>
        )}

        {/* 2. Delivery & Tracking Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shipping Info Card */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/10">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Truck size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block">روش ارسال و زمان تحویل</span>
              <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 truncate block">
                {order.shippingType} {order.deliveryTime && order.deliveryTime !== '-' ? `| تحویل: ${order.deliveryTime}` : ''}
              </span>
            </div>
          </div>

          {/* Tracking Code Card */}
          {order.trackingCode && order.trackingCode !== '-' ? (
            <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/20 bg-blue-50/20 dark:bg-blue-950/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <Package size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 block">کد رهگیری مرسوله پستی</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white block truncate">
                    {order.trackingCode}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={handleCopyTracking}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-95"
                  title="کپی کد رهگیری"
                >
                  {copiedTracking ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
                <a
                  href={`https://tracking.post.ir/?id=${order.trackingCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95"
                  title="رهگیری مستقیم از پست"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/10">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0">
                <Package size={20} />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">کد رهگیری مرسوله</span>
                <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">هنوز ثبت نشده است</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Products List */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 dark:bg-blue-500 rounded-full" />
            مرسوله سفارش <span className="text-xs font-normal text-gray-500">({order.items.length} کالا)</span>
          </h3>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-4 sm:px-5 bg-gray-50/10 dark:bg-gray-800/5">
            {order.items.map((item, idx) => {
              const isDigital = item.type === 'digital';
              return (
                <div key={idx} className="py-5 first:pt-4 last:pb-5 space-y-4">
                  {/* Item Details and Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative w-16 h-16 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0">
                        <Image 
                          src={item.imageUrl} 
                          alt={item.title} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h5 className="font-bold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                          <Link href={`/product/${item.id}`}>{item.title}</Link>
                        </h5>
                        
                        {isDigital ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/20">
                            محصول دانلودی
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-750">
                            کالای فیزیکی
                          </span>
                        )}
                        
                        {isDigital && item.downloadToken && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1 pt-1 font-medium">
                            <span>
                              محدودیت دانلود: <strong className="text-gray-700 dark:text-gray-300">{item.maxDownloads && item.maxDownloads > 0 ? `${item.downloadCount} از ${item.maxDownloads}` : 'نامحدود'}</strong>
                            </span>
                            {item.expiresAt && (
                              <span>
                                انقضا: <strong className="text-gray-700 dark:text-gray-300">{item.expiresAt}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto sm:min-w-[140px]">
                      <Link 
                        href={`/product/${item.id}`}
                        className="flex-1 sm:flex-none text-center py-2 px-4 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        مشاهده کالا
                      </Link>
                      {isDigital && item.downloadToken && (
                        <a 
                          href={`/api/downloads/${item.downloadToken}`}
                          download
                          className="flex-1 sm:flex-none text-center py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm shadow-purple-100 dark:shadow-none"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          دانلود فایل
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Review / Survey Section (Only when order is delivered) */}
                  {order.exactStatus === 'delivered' && (
                    <div className="bg-gray-50/50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mt-2 space-y-3">
                      {item.hasReviewed ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">امتیاز ثبت شده شما:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={14}
                                    className={`${
                                      star <= (item.reviewRating || 5)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-200 dark:text-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            {item.reviewStatus === 'pending' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                در انتظار تایید مدیریت
                              </span>
                            )}
                            {item.reviewStatus === 'approved' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                                تایید شده و منتشر شده
                              </span>
                            )}
                            {item.reviewStatus === 'rejected' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                رد شده توسط مدیریت
                              </span>
                            )}
                          </div>
                          
                          <div className="bg-white dark:bg-[#24303f] border border-gray-100 dark:border-gray-800 p-3 rounded-lg text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-[10px] text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                              <MessageSquare size={12} />
                              <span>دیدگاه ثبت شده شما:</span>
                            </p>
                            {item.reviewComment}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">امتیاز شما به این کالا:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const currentRating = reviewRatings[item.id] || 5;
                                const hoveredRating = hoveredStars[item.id] || 0;
                                const activeRating = hoveredRating > 0 ? hoveredRating : currentRating;
                                
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRatings(prev => ({ ...prev, [item.id]: star }))}
                                    onMouseEnter={() => setHoveredStars(prev => ({ ...prev, [item.id]: star }))}
                                    onMouseLeave={() => setHoveredStars(prev => ({ ...prev, [item.id]: 0 }))}
                                    className="transition-transform active:scale-125 focus:outline-none"
                                  >
                                    <Star
                                      size={18}
                                      className={`${
                                        star <= activeRating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={reviewComments[item.id] || ''}
                              onChange={(e) => setReviewComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="نظرسنجی و ثبت نظر: دیدگاه و تجربه خرید خود را بنویسید (دیدگاه شما پس از تایید مدیریت منتشر می‌شود)..."
                              className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#24303f] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              {reviewErrors[item.id] && (
                                <span className="text-xs text-red-500 font-bold">{reviewErrors[item.id]}</span>
                              )}
                              {reviewSuccesses[item.id] && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-bold">{reviewSuccesses[item.id]}</span>
                              )}
                              {!reviewErrors[item.id] && !reviewSuccesses[item.id] && <div />}
                              
                              <button
                                type="button"
                                onClick={() => handleSubmitReview(item.id)}
                                disabled={submittingReviews[item.id]}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-end"
                              >
                                {submittingReviews[item.id] && (
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                                <span>ثبت نظر</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Payment & Financial Summary (Receipt Style) */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 dark:bg-blue-500 rounded-full" />
            اطلاعات مالی و پرداخت
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Breakdown */}
            <div className="bg-gray-50 dark:bg-[#1a222c] rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 space-y-3.5 relative overflow-hidden">
              {/* Receipt decorative circle cuts */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#24303f] hidden md:block" />
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#24303f] hidden md:block" />

              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Info size={14} className="text-blue-500" />
                خلاصه صورتحساب
              </h4>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>قیمت کالاها:</span>
                  <span className="font-bold">{order.totalAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
                {order.shippingCost > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>هزینه ارسال:</span>
                    <span className="font-bold">{order.shippingCost.toLocaleString('fa-IR')} تومان</span>
                  </div>
                )}
                {order.packagingCost > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>هزینه بسته‌بندی:</span>
                    <span className="font-bold">{order.packagingCost.toLocaleString('fa-IR')} تومان</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-red-500 font-medium">
                    <span>تخفیف / سود شما از خرید:</span>
                    <span className="font-bold">({order.discount.toLocaleString('fa-IR')}-) تومان</span>
                  </div>
                )}
                
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white font-bold text-sm">مبلغ نهایی پرداخت شده:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-base sm:text-lg">
                    {order.paidAmount.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 dark:bg-[#1a222c] rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 space-y-3.5">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <CreditCard size={14} className="text-blue-500" />
                جزئیات تراکنش
              </h4>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>روش پرداخت:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{order.paymentType}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>وضعیت پرداخت:</span>
                  <span className={`font-bold ${order.paymentStatus === 'موفق' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>تاریخ پرداخت:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{order.paymentDate}</span>
                </div>
                {order.transactionId && order.transactionId !== '-' && (
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                    <span>کد پیگیری تراکنش:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                        {order.transactionId}
                      </span>
                      <button
                        onClick={handleCopyTransaction}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                        title="کپی کد پیگیری"
                      >
                        {copiedTransaction ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card to Card Receipt Details */}
              {order.cardToCardReceipt && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <CreditCard size={14} />
                    <span>رسید کارت به کارت</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <div>کارت مبدا: <span className="font-mono text-gray-800 dark:text-gray-200 font-bold">{order.cardToCardSenderCard || '-'}</span></div>
                    <div>زمان پرداخت: <span className="text-gray-800 dark:text-gray-200 font-bold">{order.cardToCardTime || '-'}</span></div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-1">تصویر فیش ارسالی:</span>
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#24303f]">
                      <img src={order.cardToCardReceipt} alt="Card to Card Receipt" className="object-cover w-full h-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Notes Section */}
        {(order.userNotes || order.adminNotes) && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 dark:bg-blue-500 rounded-full" />
              توضیحات و پیام‌ها
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.userNotes && (
                <div className="bg-gray-50/50 dark:bg-[#1a222c]/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 block mb-1.5">توضیحات شما هنگام ثبت سفارش</span>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {order.userNotes}
                  </p>
                </div>
              )}
              {order.adminNotes && (
                <div className="bg-blue-50/30 dark:bg-blue-950/10 p-4 rounded-xl border border-blue-100/30 dark:border-blue-900/20">
                  <span className="text-[10px] text-blue-500 dark:text-blue-400 block mb-1.5 font-bold">پیام فروشگاه برای شما</span>
                  <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-300 leading-relaxed font-medium">
                    {order.adminNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
