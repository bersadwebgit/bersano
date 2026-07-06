import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Check, Store, Heart, AlertCircle, ShoppingCart, Percent, Share2, Globe, ShieldCheck, Scale, ArrowLeft } from 'lucide-react';

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
  title: 'فروش در اینستاگرام یا فروشگاه برسانا؟',
  description: 'مقایسه جامع فروش دستی در دایرکت و کامنت اینستاگرام در برابر سبد خرید هوشمند و فاکتور اتوماتیک در فروشگاه ابری برسانا.',
};

export default function CompareInstagramPage() {
  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-pink-500/10 text-pink-600 dark:text-pink-400 px-4 py-2 rounded-full text-xs font-black">
            <InstagramIcon className="w-4 h-4" />
            <span>مقایسه فرآیند دایرکت سنتی با پرداخت شتابی</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            اینستاگرام برای جذب مخاطب عالی است؛ برای ثبت سفارش کافی نیست!
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            ما بر این باوریم که پیج اینستاگرام شما باارزش‌ترین سرمایه برای جذب ترافیک است. اما نباید این ترافیک گران‌بها را با پاسخ دستی در دایرکت، هدر دهید. پیج را به عنوان قلاب جذب مخاطب نگه دارید و فرآیند ثبت و پرداخت را به برسانا بسپارید.
          </p>

          <div className="flex pt-4 justify-center">
            <Link
              href="/register?source=instagram"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>فروشگاه لینک بیو خود را بساز</span>
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
                  <th className="p-4">فرآیند فروش</th>
                  <th className="p-4 text-center">دایرکت و پی‌ام (روش دستی)</th>
                  <th className="p-4 text-center bg-blue-600/5 text-blue-600">برسانا (سبد خرید هوشمند)</th>
                </tr>
              </thead>
              <tbody className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                {[
                  { f: 'جذب مخاطب و تعامل', c: 'عالی و نامحدود', b: 'منوط به ترافیک بیو پیج شما' },
                  { f: 'مدیریت و ثبت اطلاعات خریدار', c: 'کپی-پیست‌های تکراری آدرس و خطا در بسته‌ها', b: 'ثبت ۱۰۰٪ خودکار توسط خریدار در پنل خرید' },
                  { f: 'فرآیند واریز و فیش‌های بانکی', d: 'کارت‌به‌کارت نادقیق و ریسک بالای فیش‌های جعلی فوتوشاپی', b: 'درگاه پرداخت بومی شتابی زیبال/زرین‌پال با واریز مستقیم' },
                  { f: 'مدیریت موجودی انبار کالا', d: 'ذهنی یا یادداشتی لابلای پیام‌ها و ناهماهنگی مستمر', b: 'کاهش اتوماتیک کالا از انبار به محض تراکنش موفق' },
                  { f: 'پیگیری کد رهگیری پستی', d: 'ارسال تک‌به‌تک عکس رسید پست به خریداران در دایرکت', b: 'پیامک خودکار کد رهگیری پس از دریافت بارنامه پستی' },
                  { f: 'تولید محصول با هوش مصنوعی', d: '✗ خیر؛ فاقد ابزارهای تجاری و RAG', b: '✓ بله؛ ساخت کالا در کاتالوگ با تحلیل کپشن پست اینستاگرام', isAi: true }
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
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">وقت آن است از دایرکت فرساینده خلاص شوید</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-lg mx-auto">
            ترافیک پیج اینستاگرام خود را با درگاه آنلاین شیک و سیستم حمل بومی برسانا بیمه کنید. شروع کاملاً رایگان است.
          </p>
          <div className="flex justify-center">
            <Link href="/register?source=instagram" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              ساخت رایگان فروشگاه پیج با برسانا
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
