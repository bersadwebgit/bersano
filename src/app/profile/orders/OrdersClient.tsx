'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Search, Filter, Download, ChevronDown, ChevronUp, MapPin, Truck, CalendarDays, CreditCard, CheckCircle2, Clock, Package, PackageX, RotateCcw, Info, Printer, Eye, Store, Loader2 } from 'lucide-react';

interface OrderItem {
  id: string;
  title: string;
  imageUrl: string;
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
  items: OrderItem[];
  isWholesale?: boolean;
  wholesalePaymentType?: string | null;
  wholesaleDepositAmount?: number;
  wholesaleSettlementAmount?: number;
  proformaUrl?: string | null;
  officialInvoice?: boolean;
}

const tabsConfig = [
  { id: 'current', label: 'جاری', icon: Clock },
  { id: 'delivered', label: 'تحویل شده', icon: CheckCircle2 },
  { id: 'returned', label: 'مرجوعی', icon: RotateCcw },
  { id: 'cancelled', label: 'لغو شده', icon: PackageX },
];

const statusConfig = {
  current: { label: 'جاری', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  delivered: { label: 'تحویل شده', color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
  returned: { label: 'مرجوعی', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
  cancelled: { label: 'لغو شده', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
};

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('current');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetch('/api/cart/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Add items to cart
        data.itemsToAdd.forEach((item: any) => {
          addToCart(item, item.quantity);
        });

        if (data.skippedItems.length > 0) {
          alert(`برخی از کالاها به دلیل عدم موجودی یا تغییرات حذف شدند:\n${data.skippedItems.join('\n')}`);
        } else {
          alert('کالاها با موفقیت به سبد خرید اضافه شدند.');
        }

        router.push('/cart');
      } else {
        alert(data.error || 'خطا در سفارش مجدد');
      }
    } catch (err) {
      console.error('Error reordering:', err);
      alert('خطای ارتباط با سرور');
    } finally {
      setReorderingId(null);
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getOrderCounts = () => {
    const counts: Record<string, number> = {
      current: 0, delivered: 0, returned: 0, cancelled: 0
    };
    initialOrders.forEach(order => {
      if (counts[order.status] !== undefined) {
        counts[order.status]++;
      }
    });
    return counts;
  };

  const getExactStatusLabel = (exactStatus: string) => {
    switch (exactStatus) {
      case 'pending': return 'در انتظار پرداخت';
      case 'paid': return 'پرداخت شده';
      case 'shipped': return 'ارسال شده';
      case 'delivered': return 'تحویل شده';
      case 'returned': return 'مرجوعی';
      case 'cancelled': return 'لغو شده';
      default: return 'جاری';
    }
  };

  const counts = getOrderCounts();
  const filteredOrders = initialOrders.filter(o => o.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          سفارش‌های من
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex overflow-x-auto custom-scrollbar">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-colors flex-1 justify-center ${
                  isActive 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800/50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#24303f] p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <PackageX size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400">هیچ سفارشی در این بخش وجود ندارد.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrders.includes(order.id);
            const statusStyle = statusConfig[order.status as keyof typeof statusConfig];

            return (
              <div key={order.id} className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all">
                {/* General Info (Always Visible) */}
                <div 
                  onClick={() => toggleOrderDetails(order.id)}
                  className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${statusStyle.color}`}>
                          {getExactStatusLabel(order.exactStatus)}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{order.id}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-gray-400" />
                          <span>{order.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />
                          <span>تحویل: {order.deliveryTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Truck size={14} className="text-gray-400" />
                          <span>{order.shippingType}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Package size={14} className="text-gray-400" />
                          <span>کد مرسوله: {order.trackingCode}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between lg:justify-end gap-6 lg:border-r lg:border-gray-100 dark:lg:border-gray-800 lg:pr-6">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 mb-1">مبلغ خریداری شده</span>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {order.totalAmount.toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500">تومان</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Product Images Preview */}
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-1 custom-scrollbar">
                    {order.items.map((item, idx) => (
                      <Link href={`/product/${item.id}`} onClick={(e) => e.stopPropagation()} key={idx} className="relative w-12 h-12 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0 group">
                        <Image src={item.imageUrl} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-gray-50/50 dark:bg-[#1a222c]/30 border-t border-gray-100 dark:border-gray-800 p-4 sm:p-5 text-xs sm:text-sm space-y-4">
                    {order.isWholesale && (
                      <div className="w-full bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 space-y-3">
                        <h4 className="font-black text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          <Store size={14} />
                          جزئیات خرید عمده (B2B)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                          <div>
                            <span className="block text-[10px] text-slate-400">نوع پرداخت عمده:</span>
                            <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {order.wholesalePaymentType === 'deposit' ? 'پرداخت بیعانه' : 'پرداخت اعتباری'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">مبلغ بیعانه پرداخت شده:</span>
                            <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {order.wholesaleDepositAmount ? `${order.wholesaleDepositAmount.toLocaleString('fa-IR')} تومان` : '۰ تومان'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">مبلغ باقی‌مانده:</span>
                            <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {order.wholesaleSettlementAmount ? `${order.wholesaleSettlementAmount.toLocaleString('fa-IR')} تومان` : '۰ تومان'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">رسمی بودن فاکتور:</span>
                            <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {order.officialInvoice ? 'بله (فاکتور رسمی)' : 'خیر'}
                            </span>
                          </div>
                        </div>

                        {order.wholesalePaymentType === 'deposit' && order.totalAmount > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                              <span>درصد پرداخت شده:</span>
                              <span>{Math.round(((order.wholesaleDepositAmount || 0) / order.totalAmount) * 100)}٪</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.round(((order.wholesaleDepositAmount || 0) / order.totalAmount) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-gray-600 dark:text-gray-400">
                          این سفارش در تاریخ <strong className="text-gray-900 dark:text-white">{order.date}</strong> ثبت شده و شامل <strong className="text-gray-900 dark:text-white">{order.items.length} کالا</strong> است.
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          مبلغ نهایی پرداخت شده: <strong className="text-blue-600 dark:text-blue-400 text-sm font-bold">{order.paidAmount.toLocaleString('fa-IR')} تومان</strong> ({order.paymentType})
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/profile/orders/${order.fullId}`}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <Eye size={15} />
                          <span>مشاهده و پیگیری سفارش</span>
                        </Link>
                        <Link
                          href={`/orders/${order.fullId}/invoice?view=customer`}
                          target="_blank"
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          <Printer size={15} />
                          <span>مشاهده فاکتور</span>
                        </Link>
                        {order.proformaUrl && (
                          <a
                            href={order.proformaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                          >
                            <Download size={15} />
                            <span>دانلود پیش‌فاکتور</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleReorder(order.fullId)}
                          disabled={reorderingId === order.fullId}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {reorderingId === order.fullId ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <RotateCcw size={15} />
                          )}
                          <span>سفارش مجدد</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
