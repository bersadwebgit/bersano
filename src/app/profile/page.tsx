import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ArrowLeft, CreditCard, CheckCircle, User } from 'lucide-react';
import WelcomeBox from '@/components/profile/WelcomeBox';
import ProfileStats from '@/components/profile/ProfileStats';
import CompleteProfileModal from '@/components/complete-profile-modal';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  const token = customerToken;
  
  if (!token) {
    redirect('/login');
  }

  let payload;
  try {
    const verified = await jwtVerify(token, key);
    payload = verified.payload;
  } catch (err) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { 
      id: payload.id as string,
      shopId: payload.shopId as string
    }
  });

  if (!user) {
    redirect('/login');
  }

  const needsProfileCompletion = !!(
    user.name && user.name.startsWith('کاربر ')
  );

  const settings = await prisma.shopSettings.findUnique({
    where: { shopId: user.shopId }
  });

  // Wholesaler B2B Reports & Prediction Logic
  const wholesaleEnabled = settings?.wholesaleEnabled || false;
  let b2bStats: any = null;

  if (user.isWholesaler && wholesaleEnabled) {
    const b2bOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        shopId: user.shopId,
        isWholesale: true
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const b2bTotalSpend = b2bOrders.reduce((sum, o) => sum + o.finalAmount, 0);
    const b2bTotalDiscount = b2bOrders.reduce((sum, o) => sum + o.discountAmount, 0);
    const totalItemsOrdered = b2bOrders.reduce((sum, o) => sum + o.items.reduce((acc, i) => acc + i.quantity, 0), 0);

    // Predict next order
    const productFrequency: Record<string, { product: any; count: number; totalQty: number }> = {};
    b2bOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productFrequency[item.productId]) {
          productFrequency[item.productId] = {
            product: item.product,
            count: 0,
            totalQty: 0
          };
        }
        productFrequency[item.productId].count += 1;
        productFrequency[item.productId].totalQty += item.quantity;
      });
    });

    const frequentProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate prediction days: average interval
    let predictedDays = 14;
    if (b2bOrders.length >= 2) {
      const dates = b2bOrders.map(o => new Date(o.createdAt).getTime()).sort((a, b) => a - b);
      const diffs = [];
      for (let i = 1; i < dates.length; i++) {
        diffs.push(dates[i] - dates[i-1]);
      }
      const avgDiffMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      predictedDays = Math.max(3, Math.round(avgDiffMs / (1000 * 60 * 60 * 24)));
    }

    b2bStats = {
      spend: b2bTotalSpend,
      discount: b2bTotalDiscount,
      ordersCount: b2bOrders.length,
      itemsCount: totalItemsOrdered,
      predictions: frequentProducts.map(fp => ({
        id: fp.product.id,
        title: fp.product.title,
        imageUrl: fp.product.imageUrl || '/placeholder.png',
        suggestedQty: Math.max(fp.product.moq || 1, Math.round(fp.totalQty / fp.count)),
        daysRemaining: predictedDays
      }))
    };
  }

  // Fetch real data
  const realOrders = await prisma.order.findMany({
    where: { 
      userId: user.id,
      shopId: user.shopId
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  const totalOrdersCount = await prisma.order.count({
    where: { 
      userId: user.id,
      shopId: user.shopId
    }
  });

  const currentOrdersCount = await prisma.order.count({
    where: { 
      userId: user.id,
      shopId: user.shopId,
      status: { notIn: ['delivered', 'cancelled', 'returned'] }
    }
  });

  const addressesCount = await prisma.address.count({
    where: { 
      userId: user.id,
      shopId: user.shopId
    }
  });

  // Map real orders to the format expected by the UI
  const recentOrders = realOrders.map(order => {
    let statusLabel = 'جاری';
    let statusColor = 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';

    if (order.status === 'delivered') {
      statusLabel = 'تحویل شده';
      statusColor = 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
    } else if (order.status === 'cancelled') {
      statusLabel = 'لغو شده';
      statusColor = 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
    } else if (order.status === 'returned') {
      statusLabel = 'مرجوعی';
      statusColor = 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
    }

    return {
      id: order.id.slice(-6).toUpperCase(),
      date: new Date(order.createdAt).toLocaleDateString('fa-IR'),
      amount: order.finalAmount.toLocaleString('fa-IR'),
      status: statusLabel,
      statusColor,
      items: order.items.map(item => ({
        title: item.product.title,
        imageUrl: item.product.imageUrl || '/placeholder.png'
      }))
    };
  });

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Complete Profile Modal for users registering with phone/OTP */}
      <CompleteProfileModal 
        isOpen={needsProfileCompletion} 
        userPhone={user.phone || ''} 
        shopName={settings?.shopName || ''}
        logoUrl={settings?.logoUrl || ''}
      />
      
      {/* Welcome Section */}
      <WelcomeBox userName={user.name || 'کاربر'} />

      {/* Stats Grid */}
      <ProfileStats 
        totalOrdersCount={totalOrdersCount} 
        currentOrdersCount={currentOrdersCount} 
        addressesCount={addressesCount} 
      />

      {/* B2B Wholesaler Profitability Reports, Stats & Predictions Dashboard */}
      {user.isWholesaler && wholesaleEnabled && b2bStats && (
        <section className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">پنل آمار خرید و تحلیل هوشمند (B2B)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">کل حجم خرید عمده شما</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{b2bStats.spend.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">تومان</span></span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">مجموع تخفیف‌های سودآور دریافتی</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{b2bStats.discount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">تومان</span></span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">تعداد سفارشات عمده ثبت شده</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{b2bStats.ordersCount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">سفارش</span></span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">تعداد کل اقلام خریداری شده</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{b2bStats.itemsCount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">عدد کالا</span></span>
            </div>
          </div>

          {/* Predictions (Next Order Predictions) */}
          <div>
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 20h.01"/></svg>
              پیش‌بینی سفارش بعدی بر اساس تحلیل خریدهای دوره‌ای شما:
            </h3>

            {b2bStats.predictions.length === 0 ? (
              <p className="text-xs text-slate-400">دیتای کافی جهت پیش‌بینی دوره‌ای سفارشات شما وجود ندارد. سفارشات عمده ثبت شده شما بررسی خواهد شد.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {b2bStats.predictions.map((p: any, idx: number) => (
                  <div key={idx} className="flex gap-3 p-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-950/40 rounded-xl items-center">
                    <div className="w-10 h-10 rounded-lg relative overflow-hidden bg-white dark:bg-slate-900 border shrink-0">
                      <img src={p.imageUrl} alt={p.title} className="object-cover w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate mb-0.5">{p.title}</h4>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">پیشنهاد خرید: {p.suggestedQty.toLocaleString('fa-IR')} عدد</p>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[9px] font-black px-2 py-1 rounded-full">
                        {p.daysRemaining.toLocaleString('fa-IR')} روز آینده
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        
        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-slate-200/80 dark:border-gray-800 flex flex-col h-full overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#1a222c]/50">
            <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">سفارشات اخیر</h2>
            <Link href="/profile/orders" className="text-xs md:text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              همه
              <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="flex flex-col gap-3 p-3 md:p-4 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-gray-400">
                هیچ سفارشی یافت نشد.
              </div>
            ) : (
              recentOrders.map((order, index) => (
                <Link href="/profile/orders" key={index} className="p-3 md:p-4 bg-white dark:bg-[#1a222c] rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-gray-700 transition-all flex flex-col gap-3 group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{order.id}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${order.statusColor}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">{order.date}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50/80 dark:bg-[#1a222c] border border-slate-200/60 dark:border-gray-800 rounded-xl p-1.5 pl-3">
                        <div className="w-8 h-8 rounded-lg relative overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0">
                          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-gray-300 line-clamp-1 max-w-[120px]">{item.title}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-200/60 dark:border-gray-800/50 group-hover:border-indigo-100 dark:group-hover:border-gray-700 transition-colors">
                    <span className="text-xs text-slate-500">مبلغ کل</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                      {order.amount} <span className="text-[10px] font-normal text-slate-500">تومان</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-4 md:p-5 flex flex-col h-full">
          <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4">حساب کاربری</h2>
          
          <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50/80 dark:bg-gray-800/30 rounded-2xl border border-slate-200/80 dark:border-gray-800/50">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm relative flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {user.avatarUrl ? (
                <Image 
                  src={user.avatarUrl} 
                  alt="Profile" 
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="w-8 h-8 md:w-10 md:h-10" />
              )}
            </div>
            <div className="overflow-hidden">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white truncate">{user.name || 'کاربر'}</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 mt-0.5 truncate dir-ltr text-right">{user.phone || user.email || 'بدون ایمیل'}</p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-gray-800/50 rounded-xl border border-slate-200/60 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                <CreditCard size={16} className="text-indigo-500" />
                <span className="text-sm font-medium">موجودی</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-white">0 تومان</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-gray-800/50 rounded-xl border border-slate-200/60 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-sm font-medium">وضعیت</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">فعال</span>
            </div>
          </div>

          <Link 
            href="/profile/security"
            className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-slate-200/80 dark:border-gray-700"
          >
            ویرایش اطلاعات
          </Link>
        </div>

      </div>
    </div>
  );
}
