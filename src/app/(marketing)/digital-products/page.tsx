import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Globe, ShieldCheck, Download } from 'lucide-react';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import StructuredData from '@/components/marketing/StructuredData';
import { breadcrumbSchema } from '@/lib/marketing-schema';
import RelatedLinks from '@/components/marketing/sections/RelatedLinks';

export const metadata: Metadata = buildMarketingMetadata({
  title: 'فروش محصولات دیجیتال، فایل و دوره',
  description:
    'با برسانا فایل، دوره، PDF، قالب و محصولات دیجیتال را با پرداخت آنلاین، تحویل و دانلود امن، محدودیت دانلود و گزارش فروش بفروشید.',
  path: '/digital-products',
});

export default function DigitalProductsPage() {
  const useCases = [
    { t: 'فایل‌های آموزشی و ویدئوها', d: 'فروش دوره‌های تخصصی، پکیج‌های ویدئویی و فایل‌های صوتی به صورت پیوندهای امن و سریع.' },
    { t: 'کتاب‌های الکترونیکی و جزوات PDF', d: 'فروش انواع PDF، کتاب‌های راهنما، جزوات کنکوری و فایل‌های ارائه‌های درسی و دانشگاهی.' },
    { t: 'قالب‌ها، ابزارها و لایسنس‌ها', d: 'ارائه فایل‌های فشرده، لایسنس‌های نرم‌افزاری، کدهای آماده، فونت‌ها و فایل‌های گرافیکی.' }
  ];

  const features = [
    { t: 'تحویل ۱۰۰٪ خودکار کالا', d: 'به محض پرداخت موفق خریدار در درگاه بانکی، سیستم لینک‌های دانلود را به صورت ایمن تولید و نمایش می‌دهد.' },
    { t: 'محدودیت تعداد و زمان دانلود', d: 'برای جلوگیری از سوءاستفاده، می‌توانید تعیین کنید لینک دانلود پس از ۳ بار یا پس از ۴۸ ساعت منقضی شود.' },
    { t: 'محدودیت IP و دانلود امن', d: 'سیستم برسانا با پنهان‌سازی آدرس واقعی فایل‌ها و بررسی IP، مانع از انتشار لینک‌های دانلود در گروه‌ها می‌شود.' },
    { t: 'پشتیبانی از چند فایل دانلودی', d: 'امکان ثبت چندین فایل مجزا با فرمت‌های گوناگون در قالب یک محصول واحد.' }
  ];

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'محصولات دیجیتال', path: '/digital-products' },
        ])}
      />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Download className="w-4 h-4 text-blue-500" />
            <span>ویژه فروش فایل، پکیج‌های آموزشی و لایسنس</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            فروش فایل و محصول دیجیتال با دانلود و تحویل کاملاً امن
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            محصولات مجازی، دوره‌ها، لایسنس‌ها، قالب‌ها و فایل‌های گرافیکی خود را بدون هاست دانلود جداگانه، با درگاه پرداخت معتبر ایرانی و ارسال آنی لینک پس از خرید بفروشید.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register?type=digital"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>فروش محصول دیجیتال را شروع کن</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">چه محصولات دیجیتالی را می‌توان فروخت؟</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {useCases.map((u, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-6 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white">{u.t}</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">ابزارهای مدیریت و محافظت از فایل‌های فروشی</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((s, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-3">
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

      {/* AI for Digital Products */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase">هوش مصنوعی مولد برسانا</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">تولید سریع صفحات فرود (Landing Pages) برای دوره‌ها</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            کافی است سرفصل‌های فایل آموزشی یا دوره خود را به دستیار بدهید تا مقاله‌ای سئوشده، متقاعدکننده و جذاب برای ترغیب مخاطب به خرید، تولید بخش FAQ کالا و ایجاد جدول سیلابس درسی به همراه کلمات کلیدی گوگل را برایتان تولید کند.
          </p>
        </div>
      </section>

      <RelatedLinks
        links={[
          { title: 'سئو و تولید محتوا', desc: 'برای دوره‌ها و فایل‌ها صفحه فرود سئوشده بسازید.', href: '/seo-content' },
          { title: 'ابزارهای بازاریابی', desc: 'کد تخفیف، کمپین و باشگاه مشتریان برای فروش بیشتر.', href: '/marketing-tools' },
          { title: 'پرداخت و ارسال', desc: 'درگاه بومی و تحویل آنی لینک دانلود پس از پرداخت.', href: '/payments-shipping' },
        ]}
      />

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">امپراتوری دیجیتال خود را راه‌اندازی کنید</h2>
          <div className="flex justify-center gap-3">
            <Link href="/register?type=digital" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              فروش فایل را همین حالا آغاز کنید
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
