import type { Metadata } from 'next';
import Link from 'next/link';
import { getMarketingCMSContent } from '@/lib/marketing-cms';
import { 
  Sparkles, Check, Store, ShieldCheck, CreditCard, Ship, 
  Users, Percent, Globe, MessageSquare, Database, FileText, 
  ArrowLeft, ArrowRight, Zap, ShoppingBag, Truck, LayoutTemplate 
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getMarketingCMSContent();
  return {
    title: `امکانات برسانا | ${cms.metaTitle}`,
    description: `بررسی جامع ابزارهای بومی و هوشمند فروش کالا، فاکتور، درگاه پرداخت، ارسال و هوش مصنوعی. ${cms.metaDesc}`,
  };
}

export default async function FeaturesPage() {
  const cms = await getMarketingCMSContent();

  const categories = [
    {
      id: 'storefront',
      title: 'طراحی فروشگاه (Storefront)',
      icon: LayoutTemplate,
      items: [
        'صفحه اصلی کاملاً داینامیک و قابل تنظیم با پرامپت',
        'مدیریت ساختار هدر، فوتر، منوها و دسته‌بندی‌ها',
        'طراحی ریسپانسیو اختصاصی برای اپلیکیشن موبایل',
        'اسلایدرها، بنرهای عریض، کادرهای شگفت‌انگیز و بنرهای میانی',
        'بخش استوری‌های شبیه اینستاگرام با امکان پخش ویدئو',
        'چیدمان‌های شاپبل (Shoppable Sets) برای کلیک مستقیم روی تصویر'
      ]
    },
    {
      id: 'catalog',
      title: 'کاتالوگ و انبار محصولات',
      icon: ShoppingBag,
      items: [
        'پشتیبانی کامل از محصولات فیزیکی و محصولات دانلودی (فایل/لایسنس)',
        'تعریف تنوع رنگ، سایز، متریال، گارانتی و قیمت‌های متغیر',
        'مدیریت لحظه‌ای موجودی انبار کالاها با هشدار اتمام',
        'گالری تصاویر فشرده شده خودکار (WebP) و بارگذاری ویدئو کالا',
        'سیستم برندها و پیوند سریع کالا به برندهای رسمی',
        'تعریف قیمت‌های پله‌ای برای فروشندگان عمده (B2B)'
      ]
    },
    {
      id: 'ai-tools',
      title: 'ابزارهای تخصصی هوش مصنوعی',
      icon: Sparkles,
      items: [
        'تولید خودکار محصول کامل با مشخصات بر اساس نام کالا',
        'تولید عنوان سئو، توضیحات سئو و اسکیما مارک‌آپ گوگل با AI',
        'تولید بخش سوالات متداول (FAQ) کالا با یک کلیک',
        'دریافت اطلاعات دقیق فنی کالاها از کاتالوگ منابع رسمی',
        'تولید تخصصی پست‌های بلاگ هماهنگ با کاتالوگ شما',
        'پردازش و درون‌ریزی (Import) هوشمند لیست کالاها از اکسل'
      ]
    },
    {
      id: 'orders',
      title: 'مدیریت سفارش‌ها و ارسال',
      icon: Truck,
      items: [
        'پیگیری گام به گام وضعیت سفارش (در حال پردازش، ارسال شده، لغوشده)',
        'صدور خودکار فاکتور خرید و پیش‌فاکتورهای چاپی استاندارد',
        'اتصال بومی به تیپاکس، شرکت پست جمهوری اسلامی و پیک شهری',
        'محاسبه خودکار و داینامیک هزینه‌های ارسال و کد رهگیری پستی',
        'ثبت رویدادها در تایم‌لاین سفارش و فاکتور مرجوعی',
        'سیستم چاپ دسته‌ای بسته‌ها و آدرس‌های پستی برای انباردار'
      ]
    },
    {
      id: 'payments',
      title: 'درگاه‌های پرداخت بومی',
      icon: CreditCard,
      items: [
        'اتصال مستقیم به پرداخت یارهای معتبر: زرین‌پال، زیبال و دیجی‌پی',
        'امکان پرداخت کارت‌به‌کارت با قابلیت بارگذاری عکس فیش بانکی',
        'پشتیبانی از سیستم پرداخت اعتباری و اقساطی اسنپ‌پی (SnappPay)',
        'امکان واریز بیعانه برای پیش‌خرید کالاهای گران‌قیمت یا عمده',
        'تسویه‌حساب خودکار روزانه طبق قوانین بانک مرکزی'
      ]
    },
    {
      id: 'marketing',
      title: 'ابزارهای بازاریابی و سئو',
      icon: Percent,
      items: [
        'ساخت کدهای تخفیف درصدی، مبلغ ثابت، اولین خرید و ارسال رایگان',
        'کدهای تخفیف محدود به کالا، دسته‌بندی یا شماره موبایل‌های خاص',
        'سیستم امتیازدهی و باشگاه مشتریان وفادار (VIP Groups)',
        'تعریف بنر پیشنهادات زمان‌دار و کمپین‌های تبلیغاتی هوشمند',
        'نقشه سایت (Sitemap.xml) و فایل Robots.txt کاملاً خودکار',
        'پست‌های مرتبط، تگ‌های داینامیک و وبلاگ پیشرفته'
      ]
    }
  ];

  return (
    <div className="marketing-page min-h-screen bg-white pb-20 text-right font-sans dark:bg-slate-950">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Zap className="w-4 h-4 fill-blue-500/20" />
            <span>امکانات کامل و حرفه‌ای فروشگاه‌ساز هوشمند</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            همه ابزارهای فروش آنلاین، در یک بستر یکپارچه و هوشمند
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            برسانا فراتر از یک قالب کاتالوگ است. ما پنل مدیریت، درگاه، سیستم‌های پستی ایرانی، باشگاه مشتریان، سئو، تولید محتوای هوشمند و هوش مصنوعی مولد RAG را در یک پلتفرم گرد آورده‌ایم.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>ساخت آنی فروشگاه در ۶۰ ثانیه</span>
            </Link>
          </div>
        </div>
      </section>

      {/* AI-First Highlight Box */}
      <section className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 text-white rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-2xl">
            <span className="text-[10px] font-black bg-white/15 px-3 py-1 rounded-full uppercase">هسته اول-هوش مصنوعی (AI-First)</span>
            <h3 className="text-xl sm:text-2xl font-black">هر بخش از فروشگاه به هوش مصنوعی متصل است</h3>
            <p className="text-xs sm:text-sm font-semibold opacity-90 leading-relaxed">
              کاتالوگ، چت با مشتریان، تولید سئو، تحلیل لغو سفارشات و بررسی موجودی‌ها همگی به صورت متمرکز از طریق پردازش موازی و دیتابیس بومی PostgreSQL مدیریت و بهینه می‌شوند.
            </p>
          </div>
          <Link href="/ai" className="bg-white hover:bg-blue-50 text-blue-600 text-xs font-black px-6 py-3.5 rounded-2xl shadow-md shrink-0 active:scale-95 transition-all">
            بررسی نحوه کارکرد AI
          </Link>
        </div>
      </section>

      {/* Features Categories Grid */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Icon className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                    <h3 className="text-sm sm:text-md font-black text-slate-950 dark:text-white">{cat.title}</h3>
                  </div>

                  <ul className="space-y-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {cat.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform Capabilities / Technology */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">زیرساخت فنی قدرتمند و فوق سریع</h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              طراحی شده بر روی برترین معماری‌های روز دنیا برای تامین پایداری و بازدهی بی‌رقیب فروشگاه‌ها.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
            {[
              { t: 'سرعت لود بی‌نظیر (Next.js)', d: 'صفحات فروشگاه به صورت Incremental Static Regeneration با کش داینامیک در کمتر از ۵۰۰ میلی‌ثانیه لود می‌شوند.' },
              { t: 'پایگاه داده ایزوله (Multi-Tenant)', d: 'مشتریان روی یک هسته واحد ولی با رویکرد Row-Level Isolation داده‌ها میزبانی می‌شوند تا امنیت ۱۰۰٪ تضمین گردد.' },
              { t: 'پایداری بالا با Redis Caching', d: 'ذخیره‌سازی سریع پرکوئری‌ترین اطلاعات مانند محصولات برتر، دسته‌ها و تنظیمات عمومی برای سرعت لود بالا.' }
            ].map((tech, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white">{tech.t}</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{tech.d}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Pricing and Final CTA */}
      <section className="py-20 bg-slate-50/50 dark:bg-slate-950/20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">آماده‌اید تا امکانات را بررسی کنید؟</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-xl mx-auto">
            تست ۱۴ روزه ما نیاز به وارد کردن اطلاعات پرداخت ندارد. فروشگاه هوشمند خود را بسازید و تمام ابزارها را بررسی کنید.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              شروع رایگان ساخت فروشگاه
            </Link>
            <Link href="/pricing" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 px-8 py-3.5 rounded-2xl text-xs font-black transition-all">
              مشاهده تعرفه‌ها
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
