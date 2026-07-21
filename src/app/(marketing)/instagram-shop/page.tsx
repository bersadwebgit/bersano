import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2 } from 'lucide-react';

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const metadata: Metadata = {
  title: 'ساخت فروشگاه برای پیج اینستاگرام | برسانا',
  description: 'تبدیل پیج اینستاگرام به فروشگاه آنلاین هوشمند. از شر دایرکت‌های تکراری، پیگیری فیش کارت‌به‌کارت و مدیریت دستی انبار خلاص شوید و با کارت‌خوان اینترنتی بفروشید.',
};

export default function InstagramShopPage() {
  const pains = [
    { t: 'قیمت پرسیدن‌های مکرر و خسته‌کننده', d: 'ساعت‌ها وقت برای پاسخ به «قیمت دایرکت» تلف می‌شود در حالی که نیمی از افراد هرگز خرید نمی‌کنند.' },
    { t: 'فیش‌های واریزی جعلی و کلاهبرداری', d: 'تطبیق دستی رسیدهای بانکی کارت‌به‌کارت هم وقت‌گیر است و هم احتمال روبرو شدن با فیش‌های فوتوشاپی زیاد است.' },
    { t: 'سفارش‌های گم‌شده لابلای پیام‌ها', d: 'ثبت آدرس، کد پستی و مشخصات مشتری در یادداشت‌های موبایل یا اکسل دستی قطعاً به خطا و بسته‌های اشتباه منجر می‌شود.' },
    { t: 'عدم موجودی مشخص و نارضایتی مشتری', d: 'فروختن محصولی که موجودی آن به اتمام رسیده به دلیل ناهماهنگی دایرکت، خریداران را به شدت کلافه می‌کند.' }
  ];

  const solutions = [
    { t: 'لینک اختصاصی بیو (Bio Link)', d: 'یک ویترین شکیل و فوق سریع برای پیج شما. کافی است مشتری روی لینک بیو کلیک کند تا تمام محصولات را ببیند.' },
    { t: 'فرآیند خرید یک‌مرحله‌ای (Mobile Cart)', d: 'طراحی اول-موبایل به صورتی که مشتری تنها در ۳ گام کالا را انتخاب، آدرس را وارد و از درگاه شتابی پرداخت کند.' },
    { t: 'محاسبه هزینه‌های ارسال و کد رهگیری پستی', d: 'سیستم بومی پست و تیپاکس به صورت خودکار هزینه ارسال را حساب کرده و کد رهگیری را پس از ارسال برای مشتری پیامک می‌کند.' },
    { t: 'ثبت محصول هوشمند با هوش مصنوعی', d: 'کافی است کپشن یکی از پست‌های اینستاگرامتان را کپی کرده و به هوش مصنوعی برسانا بدهید؛ خودش کالا، قیمت، سایزها و سئو را برای کاتالوگ آماده می‌کند.' }
  ];

  return (
    <div className="marketing-page min-h-screen bg-white pb-20 text-right font-sans dark:bg-slate-950">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-pink-500/10 text-pink-600 dark:text-pink-400 px-4 py-2 rounded-full text-xs font-black">
            <InstagramIcon className="w-4 h-4" />
            <span>ویژه فروشندگان و بلاگرهای اینستاگرامی</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            از دایرکت فرساینده اینستاگرام به فروشگاه هوشمند برسید
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            اگر فروش شما در دایرکت، واتساپ یا کامنت‌ها گم می‌شود، برسانا به شما کمک می‌کند لینک فروشگاه بسازید، سفارش‌ها را منظم کنید و با AI سریع‌تر محصول و محتوا آماده کنید.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register?source=instagram"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>فروشگاه مخصوص پیج من را بساز</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Pains Grid */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">کسب‌وکار اینستاگرامی وقتی که کار فرسایشی دستی می‌شود</h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold">
              فروش در اینستاگرام عالی است، اما برای مدیریت سفارشات و مقیاس‌پذیری طراحی نشده است.
            </p>
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

      {/* Solutions Grid */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">راه‌حل چیست؟ پیوند ترافیک پیج به سبد خرید برسانا</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {solutions.map((s, idx) => (
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

      {/* AI Cap integration on Instagram caption parsing */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full uppercase">هوش مصنوعی مولد برسانا</span>
              <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">ساخت خودکار کالا از روی کپشن پست شما!</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-xl">
                تنها با کپی کردن کپشن پست پیجتان (مانند مشخصات لباس، سایز، قیمت به تومان) و پیست کردن آن در دستیار، هوش مصنوعی ما آن را پردازش کرده و کاتالوگی بی‌نقص به همراه گالری تصاویر، قیمت‌گذاری، تگ‌ها و سئوی پیشرفته ایجاد می‌کند. دیگر نیازی به تکمیل فرم‌های پردردسر کالا ندارید!
              </p>
            </div>
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-8 h-8 fill-orange-500/10" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">همین امروز دکمه خرید آنلاین پیجتان را فعال کنید</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
            راه‌اندازی فروشگاه بیو اینستاگرام نیاز به دانش فنی ندارد. با پکیج رایگان شروع کنید و به سادگی فروش پیج خود را رشد دهید.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/register?source=instagram" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              ساخت رایگان فروشگاه پیج
            </Link>
            <Link href="/compare/instagram" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 px-8 py-3.5 rounded-2xl text-xs font-black transition-all">
              مقایسه با اینستاگرام
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
