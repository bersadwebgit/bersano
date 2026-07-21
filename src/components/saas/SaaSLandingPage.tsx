'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Store,
  ArrowLeft,
  ChevronDown,
  Check,
  Zap,
  Smartphone,
  Globe,
  Users,
  Database,
  FileText,
  ShoppingCart,
  TrendingUp,
  Package,
  CreditCard,
  Search,
} from 'lucide-react';
import { type MarketingContent } from '@/lib/marketing-cms';

export default function SaaSLandingPage({ content }: { content: MarketingContent }) {
  const router = useRouter();
  const [activePromptTab, setActivePromptTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  const handlePhoneSubmit = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      router.push(`/register?phone=${cleaned}`);
    } else if (cleaned.length > 0) {
      setPhoneError(true);
      phoneRef.current?.focus();
      setTimeout(() => setPhoneError(false), 1800);
    } else {
      router.push('/register');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPhone(val);
    if (phoneError) setPhoneError(false);
  };

  const { heroTitle, heroSubtitle, features, faqs, pricing, comparisons } = content;

  const aiPrompts = [
    {
      badge: 'تحلیل هوشمند',
      prompt: 'محصولات کم‌فروش این ماه را پیدا کن و برایشان تخفیف پیشنهاد بده',
      steps: ['پیش‌نمایش آماده شد', 'منتظر تایید شما', 'آماده اجرا'],
      title: 'نتیجه آماده تایید',
      result: 'تولید عنوان، ویژگی‌ها، تگ‌ها، سایزبندی و قیمت به صورت کاملاً خودکار و دسته‌بندی شده در دیتابیس.',
      color: 'blue',
    },
    {
      badge: 'سئو و محتوا',
      prompt: 'برای این محصول توضیح SEO بساز',
      steps: ['تحلیل کلمات کلیدی', 'متا و Schema تولید شد', 'منتظر تایید شما'],
      title: 'محتوای سئو آماده شد',
      result: 'عنوان: خرید کفش ورزشی چرم طبیعی | برسانا\nمتا: بهترین کفش ورزشی با چرم درجه یک، ارسال رایگان و ضمانت بازگشت کالا.',
      color: 'purple',
    },
    {
      badge: 'بازاریابی',
      prompt: 'مشتریان VIP را شناسایی کن و تخفیف بده',
      steps: ['مشتریان VIP شناسایی شدند', 'کد تخفیف ساخته شد', 'منتظر تایید شما'],
      title: 'کمپین مشتریان وفادار',
      result: 'کد: VIP-SPECIAL (تخفیف ۲۰٪ مخصوص ۴۸ مشتری طلایی)\nپیامک پیشنهادی: «سلام [نام] عزیز، تخفیف ویژه برسانا منتظر شماست.»',
      color: 'emerald',
    },
    {
      badge: 'مدیریت فروشگاه',
      prompt: 'صفحه اصلی را برای فروش تابستانی آماده کن',
      steps: ['متن بنر ساخته شد', 'چیدمان پیشنهاد شد', 'منتظر تایید شما'],
      title: 'بروزرسانی صفحه اصلی',
      result: 'بنر هیرو: «جشنواره تابستانی با تخفیف‌های داغ تا ۵۰٪»\nپیشنهاد: نمایش محصولات شگفت‌انگیز در بالای صفحه و تغییر رنگ‌بندی.',
      color: 'orange',
    },
  ];

  const colorMap: Record<string, { badge: string; step: string; dot: string }> = {
    blue: { badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-100 dark:border-blue-900/50', step: 'bg-blue-500/10 text-blue-600', dot: 'bg-blue-500' },
    purple: { badge: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-900/50', step: 'bg-purple-500/10 text-purple-600', dot: 'bg-purple-500' },
    emerald: { badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50', step: 'bg-emerald-500/10 text-emerald-600', dot: 'bg-emerald-500' },
    orange: { badge: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 border-orange-100 dark:border-orange-900/50', step: 'bg-orange-500/10 text-orange-600', dot: 'bg-orange-500' },
  };

  const activeColor = colorMap[aiPrompts[activePromptTab].color];

  return (
    <div dir="rtl" className="marketing-page marketing-home overflow-x-hidden bg-white text-right font-sans dark:bg-slate-950">

      {/* ════════════════════════════ 1. HERO ════════════════════════════ */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">

        {/* ── Background layers ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35] dark:opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 100%)',
          }}
        />

        {/* Soft glow orb */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-r from-blue-500/10 via-indigo-500/8 to-violet-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* ── Floating notification cards — desktop only ── */}
        <div className="hidden xl:block pointer-events-none select-none" aria-hidden="true">

          {/* Card A — top-right: new order */}
          <div
            className="absolute top-14 right-[3vw] w-52 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-lg shadow-slate-200/60 dark:shadow-slate-950/60 animate-float-subtle"
            style={{ animationDelay: '0s', animationDuration: '4s' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-900 dark:text-white">سفارش جدید دریافت شد</div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">کفش ورزشی × ۲ — تازه وارد</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse block" />
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">۲ دقیقه پیش</span>
            </div>
          </div>

          {/* Card B — mid-right: AI done */}
          <div
            className="absolute top-52 right-[2vw] w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-orange-100/70 dark:border-orange-900/30 rounded-2xl p-3.5 shadow-lg shadow-orange-100/40 dark:shadow-slate-950/60 animate-float-subtle"
            style={{ animationDelay: '1.2s', animationDuration: '5s' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-900 dark:text-white">هوش مصنوعی</div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">محتوای سئو آماده شد</div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-orange-600 dark:text-orange-400 font-black">منتظر تایید شما</span>
                <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-orange-400 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Card C — top-left: sales stats */}
          <div
            className="absolute top-20 left-[3vw] w-48 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-emerald-100/70 dark:border-emerald-900/30 rounded-2xl p-3.5 shadow-lg shadow-emerald-100/40 dark:shadow-slate-950/60 animate-float-subtle"
            style={{ animationDelay: '0.6s', animationDuration: '4.5s' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-900 dark:text-white">این ماه</div>
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black mt-0.5">فروش +۴۵٪ رشد کرد</div>
              </div>
            </div>
            {/* Mini sparkline bars */}
            <div className="flex items-end gap-0.5 mt-2.5 h-6">
              {[3, 5, 4, 6, 5, 7, 8].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-emerald-400/60 dark:bg-emerald-600/50"
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>
          </div>

          {/* Card D — mid-left: product count */}
          <div
            className="absolute top-56 left-[2vw] w-52 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-lg shadow-slate-200/60 dark:shadow-slate-950/60 animate-float-subtle"
            style={{ animationDelay: '2s', animationDuration: '3.8s' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-900 dark:text-white">۲۴۰ محصول فعال</div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">موجودی به‌روزرسانی شد</div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2.5">
              {[true, true, true, true, false].map((active, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${active ? 'bg-violet-400 dark:bg-violet-600' : 'bg-slate-100 dark:bg-slate-800'}`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ── Main content ── */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-600/5 dark:bg-blue-500/10 border border-blue-600/10 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full text-[11px] font-black">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20 animate-pulse" />
              <span>فروشگاه‌ساز هوشمند فارسی</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-950 dark:text-white leading-[1.2] tracking-tight">
              {heroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
              {heroSubtitle}
            </p>

            {/* ── Phone CTA ── */}
            <div className="w-full max-w-md mx-auto pt-2 space-y-3">

              {/* Input bar */}
              <div className={`flex items-center bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-lg transition-all duration-200 ${
                phoneError
                  ? 'border-2 border-red-400 dark:border-red-500 shadow-red-200/40 dark:shadow-red-900/30'
                  : 'border border-slate-200 dark:border-slate-700 shadow-slate-200/50 dark:shadow-slate-900/50 focus-within:border-blue-400 dark:focus-within:border-blue-600 focus-within:shadow-blue-100/50 dark:focus-within:shadow-blue-950/50'
              }`}>
                {/* Phone icon */}
                <div className="px-3 text-slate-400 dark:text-slate-500 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                  placeholder="شماره موبایل خود را وارد کنید"
                  dir="ltr"
                  maxLength={11}
                  className="flex-1 bg-transparent py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal outline-none text-right"
                />
                <button
                  onClick={handlePhoneSubmit}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm shadow-blue-500/20 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-200 animate-pulse" />
                  <span className="hidden sm:inline">ساخت فروشگاه رایگان</span>
                  <span className="sm:hidden">ثبت‌نام</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Error hint */}
              {phoneError && (
                <p className="text-[11px] text-red-500 font-bold text-center">
                  شماره موبایل معتبر نیست — مثال: ۰۹۱۲۳۴۵۶۷۸۹
                </p>
              )}

              {/* Secondary links */}
              <div className="flex items-center justify-center gap-5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                <Link href="/register" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  ثبت‌نام بدون شماره
                </Link>
                <span className="text-slate-200 dark:text-slate-700">•</span>
                <Link href="/demo" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
                  <span>مشاهده دمو</span>
                  <ArrowLeft className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Trust note */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              راه‌اندازی سریع &nbsp;•&nbsp; بدون نیاز به دانش فنی &nbsp;•&nbsp; شروع رایگان
            </p>

          </div>

          {/* Product promises */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: 'بدون کدنویسی', label: 'راه‌اندازی فروشگاه' },
              { value: 'مستقل', label: 'دامنه و برند شما' },
              { value: 'یکپارچه', label: 'پرداخت و ارسال' },
              { value: 'با تأیید شما', label: 'دستیار هوشمند فارسی' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-xs"
              >
                <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">{stat.value}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 2. HOW IT WORKS ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-4 py-1.5 rounded-full border border-blue-100/60 dark:border-blue-900/60">نحوه کار</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white mt-3">از ایده تا فروش، در سه قدم</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">بدون درگیری فنی؛ فروشگاه حرفه‌ای‌تان را راه بیندازید و رشد دهید.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Connector line desktop */}
            <div className="hidden sm:block absolute top-10 right-[calc(33.33%+16px)] left-[calc(33.33%+16px)] h-0.5 bg-gradient-to-l from-blue-200 via-blue-300 to-blue-200 dark:from-blue-900 dark:via-blue-800 dark:to-blue-900" />

            {[
              { step: '۱', icon: Store, title: 'ثبت‌نام و انتخاب نام فروشگاه', desc: 'در چند دقیقه فروشگاه شما روی زیردامنه اختصاصی آماده می‌شود.', color: 'bg-blue-600' },
              { step: '۲', icon: Package, title: 'افزودن محصول با کمک هوش مصنوعی', desc: 'محصول را وارد کنید؛ توضیح، سئو و دسته‌بندی به‌صورت هوشمند پیشنهاد می‌شود.', color: 'bg-indigo-600' },
              { step: '۳', icon: ShoppingCart, title: 'مدیریت با گفت‌وگوی فارسی', desc: 'قیمت، موجودی، محتوا و تحلیل فروش را با پیام ساده مدیریت کنید؛ هر تغییر با پیش‌نمایش و تایید شما اجرا می‌شود.', color: 'bg-violet-600' },
            ].map((item, i) => (
              <div key={i} className="relative bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 group">
                <div className={`w-12 h-12 ${item.color} text-white rounded-2xl flex items-center justify-center shadow-lg mb-4 text-sm font-black group-hover:scale-105 transition-transform`}>
                  {item.step}
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 3. AI DEMO (INTERACTIVE) ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-orange-600 bg-orange-50 dark:bg-orange-950/60 px-4 py-1.5 rounded-full border border-orange-100/60 dark:border-orange-900/60">پنل مدیریت برسانا</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white mt-3">دستور شما</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">پیش‌نمایش ← تایید ← اجرا</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 items-start">

            {/* Prompt list */}
            <div className="lg:col-span-2 space-y-2.5">
              {aiPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePromptTab(idx)}
                  className={`w-full text-right p-4 rounded-2xl border transition-all cursor-pointer group ${
                    activePromptTab === idx
                      ? 'bg-slate-950 dark:bg-white border-slate-900 dark:border-white shadow-md'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`text-[9px] font-black block mb-1 ${activePromptTab === idx ? 'text-slate-400 dark:text-slate-500' : 'text-orange-500'}`}>
                    {p.badge}
                  </span>
                  <span className={`text-xs font-black leading-snug ${activePromptTab === idx ? 'text-white dark:text-slate-900' : 'text-slate-800 dark:text-slate-100'}`}>
                    «{p.prompt}»
                  </span>
                </button>
              ))}
            </div>

            {/* Result panel */}
            <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 overflow-hidden shadow-sm">
              {/* Panel header */}
              <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className={`w-2.5 h-2.5 rounded-full ${activeColor.dot} animate-pulse`} />
                <span className="text-xs font-black text-slate-900 dark:text-white">دستیار هوشمند برسانا در حال پردازش...</span>
                <span className={`mr-auto text-[9px] font-black px-2.5 py-1 rounded-lg border ${activeColor.badge}`}>
                  {aiPrompts[activePromptTab].badge}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end gap-2.5">
                  <div className="bg-blue-600 text-white text-xs font-medium px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                    {aiPrompts[activePromptTab].prompt}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 shrink-0">
                    شما
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Steps */}
                    <div className="flex flex-wrap gap-2">
                      {aiPrompts[activePromptTab].steps.map((step, si) => (
                        <div key={si} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black ${si < 2 ? activeColor.step : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          <Check className={`w-3 h-3 ${si < 2 ? '' : 'opacity-30'}`} />
                          {step}
                        </div>
                      ))}
                    </div>

                    {/* Preview card */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{aiPrompts[activePromptTab].title}</h4>
                        <span className="text-[9px] text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">آماده تایید</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                        {aiPrompts[activePromptTab].result}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex gap-2">
                      <Link href="/register" className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm shadow-blue-500/10">
                        تایید و اعمال در فروشگاه
                      </Link>
                      <button className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        رد کردن
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel footer note */}
              <div className="px-5 pb-4">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-center">
                  * تمام تغییرات پس از تایید شما در فروشگاه اعمال می‌شوند — هوش مصنوعی بدون اجازه هیچ چیز را تغییر نمی‌دهد
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════ 4. PAIN POINTS ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-slate-950 dark:bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-blue-300">چرا برسانا</span>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">فروش آنلاین نباید این‌قدر سخت باشد</h2>
            <p className="text-sm text-slate-400 font-medium max-w-xl mx-auto">اگر با این چالش‌ها روبه‌رو هستید، برسانا دقیقاً برای شما ساخته شده است.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '💬', title: 'دایرکت شلوغ و سفارش‌های گم‌شده', desc: 'پاسخ‌گویی دستی در دایرکت، ثبت سفارش با کاغذ و پیگیری کارت‌به‌کارت، فروش را کند و پرخطا می‌کند.' },
              { icon: '📉', title: 'وابستگی به الگوریتم پلتفرم', desc: 'کاهش دیده‌شدن، محدودیت و ریسک بسته‌شدن پیج یعنی همه‌چیز روی زمینی است که مال شما نیست.' },
              { icon: '🧩', title: 'هزینه و پیچیدگی سایت اختصاصی', desc: 'سایت اختصاصی گران، زمان‌بر و نیازمند نگهداری فنی مداوم است؛ برای کسب‌وکار نوپا صرفه ندارد.' },
            ].map((p, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all duration-200 group">
                <span className="text-2xl block mb-3">{p.icon}</span>
                <h3 className="text-sm font-black text-white mb-2">{p.title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════ 5. FEATURES ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-4 py-1.5 rounded-full border border-blue-100/60 dark:border-blue-900/60">امکانات</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white mt-3">هرآنچه برای فروش حرفه‌ای لازم دارید</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">ابزارهای واقعی و کاربردی، دسته‌بندی‌شده بر اساس نتیجه‌ای که برای کسب‌وکار شما می‌سازند.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => {
              const featureIcons = { Zap, Smartphone, Sparkles, Globe, Database, Users };
              const FeatureIcon = featureIcons[feat.icon as keyof typeof featureIcons] || Sparkles;
              const aiTag = ['Sparkles', 'Database', 'Users'].includes(feat.icon);
              return (
              <div key={feat.id || i} className={`group relative rounded-3xl border p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${aiTag ? 'bg-orange-500/2 border-orange-200/50 dark:border-orange-800/30 hover:border-orange-300 dark:hover:border-orange-700/50' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900'}`}>
                {aiTag && (
                  <span className="absolute top-4 left-4 text-[9px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/50 border border-orange-100 dark:border-orange-900/50 px-2 py-0.5 rounded-md">
                    AI
                  </span>
                )}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${aiTag ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'}`}>
                  <FeatureIcon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-xs whitespace-pre-line text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
              </div>
            )})}
          </div>

          <div className="mt-8 text-center">
            <Link href="/features" className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400">
              مشاهده همه امکانات
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 6. SOLUTIONS ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-blue-600">راهکارها</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">برای هر مدل کسب‌وکار، یک راهکار مشخص</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">برسانا با نیاز واقعی صنف شما هماهنگ می‌شود، نه برعکس.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { href: '/instagram-shop', icon: Store, title: 'فروشگاه اینستاگرامی', desc: 'مخاطب دایرکت را به خریدار وفادار تبدیل کنید' },
              { href: '/wholesale', icon: Users, title: 'عمده‌فروشی و B2B', desc: 'قیمت پله‌ای، حداقل سفارش و پنل نمایندگان' },
              { href: '/digital-products', icon: FileText, title: 'محصولات دیجیتال', desc: 'فروش فایل و لایسنس با تحویل امن و آنی' },
              { href: '/payments-shipping', icon: CreditCard, title: 'پرداخت و ارسال', desc: 'درگاه‌های محلی و مدیریت یکپارچه ارسال' },
              { href: '/seo-content', icon: Search, title: 'سئو و تولید محتوا', desc: 'رتبه گرفتن در گوگل با محتوای تولیدشده هوشمند' },
              { href: '/marketing-tools', icon: TrendingUp, title: 'ابزارهای بازاریابی', desc: 'کد تخفیف، باشگاه مشتریان و کمپین هدفمند' },
            ].map((solution) => (
              <Link key={solution.href} href={solution.href} className="group flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/50 dark:text-blue-400">
                  <solution.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-slate-900 dark:text-white">{solution.title}</span>
                  <span className="mt-1.5 block text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">{solution.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 7. COMPARISON ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-blue-600">مقایسه منصفانه</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">برسانا در کنار گزینه‌های دیگر</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">مقایسه‌ای شفاف تا با آگاهی کامل تصمیم بگیرید.</p>
          </div>

          <h3 className="mb-5 text-center text-sm font-black text-slate-800 dark:text-slate-200">مقایسه برسانا با اینستاگرام و فروشگاه‌ساز معمولی</h3>

          <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[520px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-[11px] font-black border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-slate-600 dark:text-slate-300 text-right">معیار</th>
                    <th className="p-4 text-center text-slate-500 dark:text-slate-400">اینستاگرام</th>
                    <th className="p-4 text-center text-slate-500 dark:text-slate-400">فروشگاه‌ساز معمولی</th>
                    <th className="p-4 text-center bg-blue-500/5 text-blue-600 dark:text-blue-400">برسانا</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="p-4 text-xs font-black text-slate-900 dark:text-white">{row.feature}</td>
                      <td className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">{String(row.instagram)}</td>
                      <td className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">{String(row.standard)}</td>
                      <td className="p-4 text-center text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-500/3">{String(row.bersana)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 8. PRICING ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-4 py-1.5 rounded-full border border-blue-100/60 dark:border-blue-900/60">تعرفه‌ها</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white mt-3">قیمت شفاف، بدون هزینه پنهان</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">با پلن رایگان شروع کنید و هر زمان فروش‌تان رشد کرد، ارتقا دهید.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((plan) => {
              const isRecommended = plan.id === 'professional';
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 ${
                    isRecommended
                      ? 'border-blue-500 dark:border-blue-500 shadow-xl shadow-blue-500/10 bg-gradient-to-b from-blue-500/5 to-white dark:from-blue-500/10 dark:to-slate-950 md:-translate-y-3'
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3.5 right-6 bg-orange-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-sm">
                      {plan.badge || 'پیشنهاد برسانا برای شروع جدی فروش'}
                    </div>
                  )}
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-black text-slate-950 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">{plan.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1 py-4 border-y border-slate-100 dark:border-slate-800">
                      <span className="text-3xl font-black text-slate-950 dark:text-white">{plan.price}</span>
                      <span className="text-xs text-slate-400 font-bold">{plan.period}</span>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link
                      href={plan.ctaLink}
                      className={`w-full text-center block py-3.5 rounded-2xl text-xs font-black transition-all active:scale-[0.98] ${
                        isRecommended
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      {plan.ctaText}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link href="/pricing" className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400">
              مقایسه کامل پلن‌ها
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 9. FAQ ════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">سوالات متداول</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">پاسخ به پرسش‌های رایج</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-right flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-black text-slate-900 dark:text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ 10. FINAL CTA ════════════════════════════ */}
      <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-900/30 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-2 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-200 animate-pulse" />
            <span>شروع رایگان</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            همین امروز فروشگاه هوشمند خود را بسازید
          </h2>

          <p className="text-sm sm:text-base text-blue-100 font-medium max-w-2xl mx-auto leading-relaxed">
            راه‌اندازی سریع است و برای شروع نیازی به پرداخت ندارید. رشد فروش را از همین امروز آغاز کنید.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-2xl text-sm font-black shadow-xl shadow-blue-900/30 transition-all w-full sm:w-auto active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-orange-500 fill-orange-400 animate-pulse" />
              <span>ساخت فروشگاه رایگان</span>
            </Link>
            <Link
              href="/demo"
              className="flex items-center justify-center gap-2 bg-blue-800/60 hover:bg-blue-800 border border-blue-500/30 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all w-full sm:w-auto active:scale-[0.98]"
            >
              <span>مشاهده دمو</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 pt-4 text-xs text-blue-200 font-medium">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> شروع رایگان</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> بدون نیاز به کارت بانکی</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> پشتیبانی فارسی</span>
          </div>
        </div>
      </section>

    </div>
  );
}
