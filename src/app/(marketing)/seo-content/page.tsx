import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Globe, ShieldCheck, FileText, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سئو فروشگاه با برسانا | تولید محتوا و SEO با هوش مصنوعی',
  description: 'با برسانا برای محصولات فروشگاه SEO title، meta description، FAQ، schema و مقاله بلاگ تولید کنید و از گوگل مشتری بگیرید.',
};

export default function SeoContentPage() {
  const features = [
    { t: 'تولید اتوماتیک SEO Title و Meta Description', d: 'هوش مصنوعی بر اساس نام کالا، برند و قیمت، تگ‌های سئوی کلیک‌خور و استاندارد (زیر ۶۰ کاراکتر) خلق می‌کند.' },
    { t: 'اسکیما مارک‌آپ خودکار (Schema.org JSON-LD)', d: 'تزریق خودکار اسکیماهای استاندارد Product، FAQ و Article به کدهای صفحه جهت ایندکس شدن عالی در نتایج گوگل.' },
    { t: 'وبلاگ تخصصی و تولید مقاله با AI', d: 'برسانا با بررسی کاتالوگ شما مقالات تخصصی و سئوشده را زمان‌بندی و منتشر می‌کند تا ورودی گوگل بگیرید.' },
    { t: 'نقشه سایت زنده (Sitemap.xml) و Robots.txt', d: 'تولید خودکار sitemap و robots با بروزرسانی آنی کالاها برای کراولرهای گوگل.' }
  ];

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Search className="w-4 h-4 text-blue-500" />
            <span>رتبه‌های اول گوگل با هوش مصنوعی سئوکار برسانا</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            از گوگل مشتری هدفمند بگیرید؛ با سئو و هوش مصنوعی
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            بیش از ۶۰٪ خریداران اینترنتی مستقیماً کالای خود را در گوگل سرچ می‌کنند. برسانا هسته فروشگاه شما را طوری سئو می‌کند که بدون یک کلمه برنامه‌نویسی یا کار دستی، بهترین رتبه را بگیرید.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>فروشگاه سئوشده بساز</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">امکانات فوق‌العاده سئو فنی و تولید محتوا</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((s, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5px]" />
                </div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">{s.t}</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Seo tools prompt example */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase">هوش مصنوعی مولد برسانا</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">تولید خودکار ۵ سوال متداول کلیدی گوگل (FAQ Schema)</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            کافی است با دستیار چت کنید: «برای کفش پیاده‌روی ریباک FAQ بساز». هوش مصنوعی فوراً سوالاتی که کاربران واقعاً در گوگل جستجو می‌کنند را بر اساس مشخصات فنی کالا تولید کرده و کدهای JSON-LD آن را به صورت نامحسوس در هدر صفحه محصول ثبت می‌کند تا در بخش ریچ-اسنیپت گوگل نمایش داده شوید.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">فروشگاه شما شایسته رتبه‌های برتر گوگل است</h2>
          <div className="flex justify-center gap-3">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              ثبت نام و شروع سئو کالاها
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
