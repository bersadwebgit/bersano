import type { Metadata } from 'next';
import Link from 'next/link';
import { getMarketingCMSContent } from '@/lib/marketing-cms';
import { 
  Sparkles, 
  Database, 
  ArrowLeft, 
  ArrowRight, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  HelpCircle, 
  ArrowRightLeft, 
  Check,
  Store,
  FileText,
  Users,
  ShoppingCart
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getMarketingCMSContent();
  return {
    title: `هوش مصنوعی برسانا | ${cms.metaTitle}`,
    description: `دستیار هوشمند فروشگاه شما متکی بر آخرین مدل‌های هوش مصنوعی و معماری RAG. ${cms.metaDesc}`,
  };
}

export default async function AIPage() {
  const cms = await getMarketingCMSContent();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": cms.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-radial from-orange-500/5 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-full text-xs font-black">
            <Sparkles className="w-4 h-4 fill-amber-500" />
            <span>فناوری نوین RAG و دستیار هوشمند فروشگاهی</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            هوش مصنوعی برسانا؛ دستیار واقعی فروشگاه شما
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            در برسانا، AI فقط متن تولید نمی‌کند. دستیار هوشمند فروشگاه شما با محصولات، سفارش‌ها، مشتریان، تنظیمات و محتوای فروشگاه کار می‌کند و با کمک RAG پاسخ‌ها و پیشنهادهای دقیق‌تری می‌دهد.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all w-full sm:w-auto active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              <span>امتحان فروشگاه‌ساز AI</span>
            </Link>
            <Link
              href="#prompts"
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 px-8 py-3.5 rounded-2xl text-xs font-black transition-all w-full sm:w-auto active:scale-95"
            >
              <span>مشاهده نمونه پرامپت‌ها</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* RAG Diagram & Simple Explanation */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              RAG یعنی AI فقط حدس نمی‌زند؛ از داده‌های فروشگاه شما کمک می‌گیرد
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              RAG به برسانا کمک می‌کند هنگام پاسخ‌دادن یا پیشنهاد دادن، به محصولات، دسته‌بندی‌ها، سفارش‌ها، مشتریان، تنظیمات و محتوای فروشگاه شما رجوع کند.
            </p>
          </div>

          {/* Glowing Visual Flow Diagram */}
          <div className="bg-slate-50 dark:bg-slate-950 p-6 sm:p-10 rounded-3xl border border-slate-150 dark:border-slate-850 shadow-inner relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 items-center relative z-10">
              
              {/* Step 1: Store Data Nodes */}
              <div className="lg:col-span-2 space-y-3">
                <div className="text-center lg:text-right text-[10px] font-black text-slate-400 mb-2">۱. منابع داده زنده فروشگاه:</div>
                {[
                  { label: "کاتالوگ محصولات و موجودی انبار", icon: ShoppingCart, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
                  { label: "تاریخچه سفارش‌ها و تراکنش‌ها", icon: FileText, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
                  { label: "پروفایل مشتریان و رفتار خرید", icon: Users, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
                  { label: "تنظیمات عمومی و چیدمان صفحات", icon: Store, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" }
                ].map((node, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs hover:border-blue-500/30 transition-all">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${node.color}`}>
                      <node.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{node.label}</span>
                  </div>
                ))}
              </div>

              {/* Connector 1 */}
              <div className="hidden lg:flex justify-center items-center text-blue-500">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-0.5 w-12 bg-gradient-to-l from-blue-500 to-transparent animate-pulse" />
                  <ArrowLeft className="w-5 h-5 animate-bounce" />
                </div>
              </div>

              {/* Step 2: Central RAG Hub */}
              <div className="lg:col-span-1.5 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-blue-500/30 dark:border-blue-500/20 p-6 rounded-3xl shadow-lg relative group">
                <div className="absolute inset-0 bg-blue-500/3 rounded-3xl blur-md group-hover:bg-blue-500/5 transition-all" />
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 relative z-10">
                  <Database className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white relative z-10 text-center">جستجوی هوشمند RAG</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-1 text-center relative z-10">تحلیل معنایی و استخراج داده‌های مرتبط کاتالوگ</p>
              </div>

              {/* Connector 2 */}
              <div className="hidden lg:flex justify-center items-center text-orange-500">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-0.5 w-12 bg-gradient-to-l from-orange-500 to-transparent animate-pulse" />
                  <ArrowLeft className="w-5 h-5 animate-bounce" />
                </div>
              </div>

              {/* Step 3: AI Engine */}
              <div className="lg:col-span-1.5 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-orange-500/30 dark:border-orange-500/20 p-6 rounded-3xl shadow-lg relative group">
                <div className="absolute inset-0 bg-orange-500/3 rounded-3xl blur-md group-hover:bg-orange-500/5 transition-all" />
                <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4 relative z-10">
                  <Cpu className="w-7 h-7" />
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white relative z-10 text-center">پاسخ دقیق AI</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-1 text-center relative z-10">پردازش با مدل‌های برتر (Claude/Gemini)</p>
              </div>

              {/* Connector 3 */}
              <div className="hidden lg:flex justify-center items-center text-emerald-500">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-0.5 w-12 bg-gradient-to-l from-emerald-500 to-transparent animate-pulse" />
                  <ArrowLeft className="w-5 h-5 animate-bounce" />
                </div>
              </div>

              {/* Step 4: Final Action */}
              <div className="lg:col-span-1 flex flex-col items-center justify-center bg-emerald-600 text-white p-5 rounded-3xl shadow-lg relative">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 stroke-[3px]" />
                </div>
                <h4 className="text-xs font-black text-center">اجرای عملیات</h4>
                <p className="text-[9px] text-emerald-100 font-bold mt-1 text-center">با تایید نهایی مدیر</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* What makes Bersana different */}
      <section className="py-16 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              فرق برسانا با فروشگاه‌سازهای معمولی چیست؟
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { type: 'normal', title: 'فروشگاه‌سازهای سنتی', points: ['فقط قالب و فرمهای پیچیده تکراری', 'محتوای کالا به صورت کاملاً دستی و کند', 'گزارش‌های عددی ساده بدون بینش تحلیلی', 'هوش تجاری صفر و عدم شناخت نسبت به داده‌های کالا'] },
              { type: 'bersana', title: 'فروشگاه‌ساز هوشمند برسانا', points: ['گفت‌وگوی فارسی روان با دیتابیس کالاها', 'تولید محصول کامل، FAQ و محتوا با AI در چند ثانیه', 'تحلیل هوشمند سفارش‌های ناموفق و رفتار خریداران', ' RAG زنده متکی بر PostgreSQL و پایگاه داده اختصاصی'] }
            ].map((col, i) => (
              <div
                key={i}
                className={`p-6 rounded-3xl border ${
                  col.type === 'bersana'
                    ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-lg ring-4 ring-blue-500/5'
                    : 'bg-white/80 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{col.title}</h3>
                  {col.type === 'bersana' && <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />}
                </div>
                <ul className="space-y-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {col.points.map((pt, pi) => (
                    <li key={pi} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${col.type === 'bersana' ? 'text-blue-500' : 'text-slate-400'}`} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* AI Capabilities Cards */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">توانمندی‌های هوش مصنوعی برسانا</h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              نگاهی گذرا به قابلیت‌های دستیار تجاری هوش مصنوعی ما برای تسهیل فروشگاه‌داری شما.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { t: 'تولید محصول کامل', d: 'تنها با وارد کردن نام کالا، توضیحات جذاب، ویژگی‌ها، تگ‌ها و قیمت مناسب را ایجاد کنید.' },
              { t: 'تولید SEO محصول', d: 'تولید متاتگ‌های تخصصی، عنوان‌های سئو کلیک‌خور و توضیحات بهینه‌سازی شده برای گوگل.' },
              { t: 'تولید سوالات متداول (FAQ)', d: 'ساخت بخش FAQ غنی متصل به مشخصات فنی کالا با اسکیما مارک‌آپ خودکار.' },
              { t: 'تولید مقالات وبلاگ', d: 'تولید وبلاگ‌پست‌های عمیق، غنی و سئو فرندلی بر اساس کاتالوگ فروشگاه با زمان‌بندی انتشار.' },
              { t: 'تحلیل پیشرفته فروش و مالی', d: 'یافتن الگوهای خرید، بهترین روزها و ساعات فروش، و بیشترین عوامل لغو سفارشات.' },
              { t: 'کمپین تخفیف هوشمند B2B/B2C', d: 'پیشنهاد تخفیف‌های زمان‌دار و جذاب بر اساس کالاها و گروه‌های مشتریان وفادار.' },
              { t: 'کنترل چیدمان با پرامپت', d: 'ویرایش هدر، فوتر، اسلایدرها و رنگ‌های اصلی فروشگاه تنها با نوشتن جملات کوتاه.' },
              { t: 'وارد کردن هوشمند (Import)', d: 'استخراج کالاها از فایل‌های اکسل، متن‌های کپشن اینستاگرام و ساخت خودکار کاتالوگ.' },
              { t: 'حافظه اختصاصی فروشگاه', d: 'دستیار شما همیشه یاد می‌گیرد؛ او اطلاعات برند، قوانین ارسال و لحن دلخواهتان را از بر است.' }
            ].map((cap, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-6 hover:shadow-md transition-all space-y-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-950 dark:text-white">{cap.t}</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{cap.d}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Prompts Section */}
      <section id="prompts" className="py-16 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">چند پرامپت نمونه برای شروع</h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              با فروشگاهتان این‌گونه صحبت کنید؛ برایتان در کسری از ثانیه انجام می‌دهد:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cms.prompts.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl hover:shadow-md transition-all space-y-3">
                <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md">
                  {p.outputType}
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-relaxed">
                  «{p.prompt}»
                </p>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400">خروجی دستیار برسانا:</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    {p.outputPreview}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Safety & Control Section */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 items-center bg-blue-50 dark:bg-blue-950/30 border border-blue-100/50 dark:border-blue-900/30 rounded-3xl p-6 sm:p-10">
            <div className="md:col-span-3 text-center">
              <div className="w-16 h-16 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xs font-black text-slate-950 dark:text-white">امنیت و کنترل</h3>
            </div>
            <div className="md:col-span-9 space-y-3">
              <h4 className="text-xs font-black text-slate-950 dark:text-white">عملیات با نظارت و تایید نهایی شما انجام می‌شود</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                هوش مصنوعی مولد برسانا هرگز تغییری در داده‌های حساس کالا، حساب‌ها یا فاکتورها را بدون اجازه مستقیم شما ذخیره نمی‌کند. دستیار ابتدا پیش‌نمایش تغییر (Preview) را نمایش داده و تنها پس از کلیک شما بر روی دکمه «تایید و اعمال»، تراکنش دیتابیسی را نهایی می‌کند.
              </p>
              <ul className="text-[10px] text-slate-400 font-bold space-y-1 list-disc list-inside">
                <li>ثبت رویدادها و لاگ‌های سیستمی تمام عملیات هوش مصنوعی</li>
                <li>امکان کنترل مجوزها بر اساس نقش همکاران (Staff Roles)</li>
                <li>مدیریت سقف بودجه و کوتای مصرفی توکن‌های هوش مصنوعی</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">سوالات متداول هوش مصنوعی</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {cms.faqs.map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-3 shadow-xs hover:shadow-md transition-all">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-blue-600 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black">فروشگاهی بساز که فقط نمایش ندهد؛ بفهمد و کمک کند</h2>
          <p className="text-xs sm:text-sm font-semibold opacity-90 max-w-2xl mx-auto leading-relaxed">
            امکانات منحصربه‌فرد هوش مصنوعی برسانا را همین امروز بر روی فروشگاه تستی خود به صورت رایگان بررسی کنید.
          </p>
          <div className="flex pt-4 justify-center">
            <Link href="/register" className="flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>شروع رایگان ساخت فروشگاه AI</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
