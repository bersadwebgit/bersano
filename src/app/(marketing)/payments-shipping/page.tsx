import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Globe, ShieldCheck, CreditCard, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'پرداخت، ارسال و مدیریت سفارش در برسانا',
  description: 'پرداخت آنلاین، کارت‌به‌کارت، ارسال، تیپاکس، پست، فاکتور، کد رهگیری و مدیریت سفارش را در فروشگاه برسانا فعال کنید.',
};

export default function PaymentsShippingPage() {
  const payments = [
    { name: 'درگاه پرداخت مستقیم زیبال (Zibal)', desc: 'تسویه‌حساب خودکار روزانه به همراه پایداری عالی درگاه‌های پرداخت شتاب.' },
    { name: 'درگاه معتبر زرین‌پال (Zarinpal)', desc: 'متداول‌ترین روش فعال‌سازی کارت‌خوان اینترنتی بدون نیاز به اینماد برای شروع کار.' },
    { name: 'پرداخت اعتباری اسنپ‌پی (SnappPay)', desc: 'امکان خرید اقساطی در ۴ قسط برای خریداران با هدف افزایش نرخ تبدیل سبد خرید.' },
    { name: 'پرداخت کارت‌به‌کارت و بیعانه', desc: 'بارگذاری سریع تصویر فیش واریزی توسط خریدار و تایید نهایی سفارش پس از بررسی فیش.' }
  ];

  const shipping = [
    { name: 'پست جمهوری اسلامی ایران', desc: 'محاسبه هزینه‌های پستی بر اساس وزن کل کالاها و کد پستی مبدا و مقصد.' },
    { name: 'شرکت خدمات رسانی تیپاکس (Tipax)', desc: 'ارسال سریع کالاها و ثبت خودکار آدرس و صدور بارنامه الکترونیکی بومی.' },
    { name: 'پیک شهری و پس‌کرایه', desc: 'تحویل کالا با روشهای متنوع پیک موتوری و امکان پرداخت کرایه حمل در محل.' }
  ];

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <span>یکپارچگی پرداخت، درگاه، فاکتور و سامانه حمل بار</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            درگاه‌های پرداخت و ارسال کالا در یک سیستم یکپارچه
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            برسانا فراتر از یک ویترین تزئینی است. فروشگاه شما مجهز به درگاه‌های پرداخت شتابی، کارت‌به‌کارت هوشمند، و اتصالات بومی به شبکه‌های پستی پست ایران و تیپاکس با صدور خودکار کد رهگیری است.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>فروشگاه با پرداخت و ارسال کامل بساز</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Payment methods */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">روش‌های پرداخت شتابی و اعتباری</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {payments.map((p, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-6 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span>{p.name}</span>
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping Methods */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">راه‌کارهای ارسال کالا و کدهای بارنامه</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {shipping.map((s, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>{s.name}</span>
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI for order analysis */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase">هوش مصنوعی مولد برسانا</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">تحلیل هوشمند لغو سفارشات و خطاهای پرداخت</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            دستیار هوشمند برسانا با اتصال به فاکتورها، تراکنش‌های ناقص درگاه زرین‌پال یا لغوشده را بررسی کرده و الگوها را گزارش می‌دهد (مانند: مشتریان دوشنبه بعد از ظهر بیشتر به دلیل خطای اتصال درگاه خرید را رها کرده‌اند یا کرایه بالای بارنامه تیپاکس عامل لغو سبد خرید بوده است) تا تصمیمات بهینه‌تری بگیرید.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">فروشگاه آماده خود را با درگاه آنلاین تحویل بگیرید</h2>
          <div className="flex justify-center gap-3">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              ثبت نام و اتصال به درگاه
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
