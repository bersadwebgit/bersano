import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Globe, ShieldCheck, Scale, ArrowLeft } from 'lucide-react';
import { getMarketingCMSContent } from '@/lib/marketing-cms';

export const metadata: Metadata = {
  title: 'برسانا یا طراحی سایت اختصاصی؟ مقایسه برای فروشگاه آنلاین',
  description: 'مقایسه جامع هزینه‌ها، زمان راه‌اندازی، نگهداری و قابلیت‌های مارکتینگ و هوش مصنوعی در برسانا در برابر طراحی سایت اختصاصی.',
};

export default async function CompareCustomWebsitePage() {
  const cms = await getMarketingCMSContent();

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Scale className="w-4 h-4 text-blue-500" />
            <span>مقایسه فنی و اقتصادی روش‌های راه‌اندازی سایت</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            برسانا یا طراحی سایت اختصاصی؟
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            ما بر این باوریم که کدهای اختصاصی ارزش بالایی دارند، اما زمان طولانی توسعه، هزینه‌های کمرشکن نگهداری، عدم بهینه‌سازی بومی سئو و فقدان ابزارهای هوش مصنوعی می‌تواند کسب‌وکارها را در شروع راه فلج کند.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>قبل از هزینه سنگین، برسانا را امتحان کن</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Grid Table */}
      <section className="py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] sm:text-xs font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">ویژگی</th>
                  <th className="p-4 text-center">طراحی سایت اختصاصی (وردپرس/برنامه‌نویسی)</th>
                  <th className="p-4 text-center bg-blue-600/5 text-blue-600">برسانا (هوشمند ابری)</th>
                </tr>
              </thead>
              <tbody className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                {[
                  { f: 'زمان راه‌اندازی اولیه', c: 'از چندین هفته تا چند ماه انتظار فرساینده', b: 'کامل‌ترین فروشگاه در کمتر از ۶۰ ثانیه' },
                  { f: 'هزینه‌های راه‌اندازی و توسعه', c: 'حداقل ۱۰ الی ۵۰ میلیون تومان هزینه پیش‌پرداخت', b: 'رایگان (تست ۱۴ روزه) / کاملاً اقتصادی' },
                  { f: 'نیاز به برنامه‌نویس و پشتیبان فنی', d: 'بله؛ برای تغییر کوچک در قالب یا رفع باگ‌ها ناچار به پرداخت مستمر هستید', b: 'خیر؛ ۱۰۰٪ مستقل و خودکار بدون نیاز به کدنویسی' },
                  { f: 'سرعت لود فرانت و هاستینگ', d: 'متغیر و منوط به هاست‌های گران‌قیمت اشتراکی یا اختصاصی', b: 'سرعت لود زیر ۵۰۰ میلی‌ثانیه با Next.js و Redis' },
                  { f: 'دستیار چت با کاتالوگ و فاکتور (AI)', d: 'خیر؛ وجود ندارد یا افزونه‌های خارجی بسیار گران‌قیمت', b: '✓ (دستیار هوشمند با زبان فارسی بومی)', isAi: true },
                  { f: 'RAG زنده روی داده‌های انبار', d: '✗ خیر؛ وجود ندارد', b: '✓ بله؛ هسته هوش مصنوعی متصل به دیتابیس اختصاصی شما است', isAi: true },
                  { f: 'ثبت محصول از کپشن اینستاگرام', d: '✗ خیر؛ وجود ندارد', b: '✓ بله؛ پردازش کپشن پست‌ها و ساخت آنی کالا در کاتالوگ', isAi: true }
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                    <td className="p-4 font-black text-slate-900 dark:text-white flex items-center gap-1">
                      {row.isAi && <Sparkles className="w-3.5 h-3.5 text-orange-500" />}
                      <span>{row.f}</span>
                    </td>
                    <td className="p-4 text-center text-red-500">{row.c || row.d}</td>
                    <td className="p-4 text-center bg-blue-600/5 font-black text-blue-600 dark:text-blue-400">{row.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">انتخاب با شماست؛ هزینه سنگین یا بهره‌وری هوشمند؟</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-lg mx-auto">
            تست ۱۴ روزه برسانا کاملاً رایگان است. ما پیشنهاد می‌کنیم قبل از بستن هر قراردادی، فروشگاه خود را با برسانا بسازید و بسنجید.
          </p>
          <div className="flex justify-center">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              ساخت رایگان فروشگاه با برسانا
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
