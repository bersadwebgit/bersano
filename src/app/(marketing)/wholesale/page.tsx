import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Layers, ShieldCheck } from 'lucide-react';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import StructuredData from '@/components/marketing/StructuredData';
import { breadcrumbSchema } from '@/lib/marketing-schema';
import RelatedLinks from '@/components/marketing/sections/RelatedLinks';

export const metadata: Metadata = buildMarketingMetadata({
  title: 'فروشگاه عمده‌فروشی آنلاین (B2B)',
  description:
    'با برسانا فروشگاه عمده‌فروشی آنلاین بسازید؛ قیمت پله‌ای، حداقل سفارش (MOQ)، گروه‌بندی مشتری، اعتبار و بیعانه و مدیریت سفارش عمده را یک‌جا داشته باشید.',
  path: '/wholesale',
});

export default function WholesalePage() {
  const pains = [
    { t: 'قیمت‌های متفاوت برای مشتریان مختلف', d: 'ارسال دستی قیمت‌های گوناگون به بنکدار، نماینده و خریدار معمولی زمان‌بر و مستعد خطا است.' },
    { t: 'ثبت سفارش‌های تلفنی و فرسایشی', d: 'یادداشت کردن دستی کدهای کالا، متراژ، کارتن یا تعداد کل فاکتورها لابلای مکالمات تلفنی بسیار نادقیق است.' },
    { t: 'مدیریت سخت فیش‌ها و خریدهای اعتباری', d: 'کنترل چک‌ها، سقف اعتبار خریداران عمده و واریز بیعانه برای پیش‌فاکتورها به صورت کاملاً غیرمکانیزه و دفتری.' },
    { t: 'حداقل تعداد سفارش (MOQ)', d: 'تلاش برای جلوگیری از فروش جزیی کالاها به کاربران عمومی در پلتفرم عمده‌فروشی.' }
  ];

  const features = [
    { t: 'قیمت عمده پله‌ای (Wholesale Tiers)', d: 'تعیین قیمت‌های داینامیک بر اساس تعداد سفارش (مثال: بالای ۵ کارتن تخفیف بیشتر).' },
    { t: 'حداقل تعداد سفارش (MOQ)', d: 'تعریف MOQ مجزا برای هر کالا تا کاربران عمومی قادر به سفارش کاتالوگ با تعداد جزیی نباشند.' },
    { t: 'گروه‌بندی خریداران و نمایندگان', d: 'تعریف سطوح مختلف مشتریان (طلایی، نقره‌ای، همکار) به همراه نمایش خودکار فاکتور قیمت‌های مرتبط با هر گروه.' },
    { t: 'خرید اعتباری و پرداخت بیعانه', d: 'امکان اعطای سقف اعتبار خرید به همکاران تایید شده و دریافت بیعانه به همراه فاکتورهای چاپی رسمی.' }
  ];

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'عمده‌فروشی (B2B)', path: '/wholesale' },
        ])}
      />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>سامانه تخصصی فروشگاه‌های عمده‌فروشی و B2B</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            فروش عمده کالا را هوشمند و کاملاً منظم مدیریت کنید
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            اگر با فروش تلفنی، فاکتورهای چاپی فرسایشی، چک‌های بدون سیستم و مدیریت دستی نمایندگان درگیرید، برسانا به شما کمک می‌کند سامانه خرید B2B اختصاصی خود را فعال کنید.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register?type=wholesale"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>راه‌اندازی فروشگاه عمده‌فروشی</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Pains */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">دردسرهای سنتی ثبت سفارش و فروش عمده</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {pains.map((p, idx) => (
              <div key={idx} className="flex gap-4 p-5 rounded-2xl border border-red-100/50 bg-red-500/5 items-start">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 shrink-0 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-950 dark:text-white">{p.t}</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions / Features */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">قابلیت‌های بی‌نظیر B2B در برسانا</h2>
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

      {/* AI for Wholesale */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase">هوش مصنوعی مولد برسانا</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">دستیار تحلیلی و بهینه‌ساز کمپین عمده‌فروشی</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            کافی است به دستیار بنویسید «همکارانی که در دو ماه گذشته خرید عمده نداشته‌اند را پیدا کن و تخفیف ۵ درصدی روی دسته ابزارها برایشان پیامک کن». دستیار ما بلافاصله لیست نمایندگان را فیلتر کرده، کدتخفیف "COOP-SPECIAL" را آماده کرده و متن پیامک پیشنهادی را برای اعمال نهایی به شما نمایش می‌دهد.
          </p>
        </div>
      </section>

      <RelatedLinks
        links={[
          { title: 'فروش محصولات دیجیتال', desc: 'فایل، لایسنس و دوره را کنار فروش عمده عرضه کنید.', href: '/digital-products' },
          { title: 'پرداخت و ارسال', desc: 'درگاه بومی، خرید اعتباری و بیعانه و کد رهگیری خودکار.', href: '/payments-shipping' },
          { title: 'تعرفه‌ها', desc: 'امکانات B2B در پلن رشد؛ متناسب با ابعاد کسب‌وکار.', href: '/pricing' },
        ]}
      />

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">همین امروز پلتفرم B2B خود را دیجیتالی کنید</h2>
          <div className="flex justify-center gap-3">
            <Link href="/register?type=wholesale" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              راه‌اندازی فروشگاه عمده‌فروشی
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
