import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Globe, ShieldCheck, Gift, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ابزارهای بازاریابی برسانا | تخفیف، باشگاه مشتریان و افزایش فروش',
  description: 'با ابزارهای بازاریابی برسانا کد تخفیف، پیشنهاد شگفت‌انگیز، باشگاه مشتریان، امتیاز وفاداری، نظرات و کمپین‌های فروش بسازید.',
};

export default function MarketingToolsPage() {
  const discounts = [
    { t: 'کدهای تخفیف درصدی و مبلغ ثابت', d: 'تعریف کدهای تخفیف متنوع مانند OFF50 با امکان تعیین سقف کسر مبلغ و تعداد دفعات استفاده.' },
    { t: 'محدودیت به کالا یا دسته‌بندی‌ها', d: 'تعیین تخفیف انحصاری برای یک محصول خاص یا کل کالاهای دسته آرایشی.' },
    { t: 'تخفیف ویژه اولین خرید', d: 'ترغیب بازدیدکنندگان جدید به خرید با کد تخفیف مخصوص اولین تراکنش موفق.' },
    { t: 'محدودیت به شماره موبایل یا تاریخ', d: 'کدهای تخفیف انحصاری برای یک مشتری VIP یا زمان‌بندی تاریخ انقضای کمپین.' }
  ];

  const loyalties = [
    { t: 'گروه‌بندی خریداران و اعضای VIP', d: 'دسته‌بندی مشتریان پرخرید و نمایش تخفیف‌های خودکار و انحصاری برای آنها.' },
    { t: 'سیستم وفاداری و امتیاز خرید', d: 'اعطای امتیاز به ازای هر خرید موفق به طوری که در خریدهای بعدی تخفیف داینامیک بگیرند.' },
    { t: 'استوری‌های شاپبل (Instagram-like Stories)', d: 'قرار دادن بخش استوری‌های جذاب در بالای سایت با امکان پیوند دادن مستقیم استوری به صفحه خرید کالا.' }
  ];

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Gift className="w-4 h-4 text-blue-500" />
            <span>ابزارهای نوین بازاریابی، رشد فروش و امتیازهای وفاداری</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            ابزارهای هوشمند بازاریابی برای چندبرابر کردن فروش
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            برسانا مجهز به قوی‌ترین پنل مارکتینگ بومی است تا مشتریان گذری را به خریداران دائمی تبدیل کند. از ایجاد کدهای تخفیف پله‌ای تا باشگاه مشتریان، استوری‌های اینستاگرامی و هوش مصنوعی مولد کمپین.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>فروشگاهت را به ابزار رشد مجهز کن</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Discount Tools */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">سیستم کوپن و کدهای تخفیف هوشمند</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {discounts.map((d, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-6 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <span>{d.t}</span>
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loyalty tools */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">باشگاه مشتریان و ویژگی‌های ارتباط خریدار</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {loyalties.map((l, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>{l.t}</span>
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{l.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI marketing support */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase">هوش مصنوعی مولد برسانا</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">طراحی هوشمند متن استوری‌ها و کمپین‌های مارکتینگ</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            کافی است به دستیار بنویسید «کمپینی برای فروش پالتوهای زمستانه طراحی کن». هوش مصنوعی فوراً با تکیه بر موجودی کاتالوگ شما، درصد تخفیف بهینه را پیشنهاد داده، کدتخفیف "WINTER-COAT" را تعریف کرده و متنی فوق‌العاده جذاب برای استوری‌های شاپ‌بل سایت و اس‌ام‌اس مشتریان تدارک می‌بیند.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">از ابزارهای فروش سنتی جلوتر حرکت کنید</h2>
          <div className="flex justify-center gap-3">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              شروع رایگان ساخت فروشگاه
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
