'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Check, 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  HelpCircle as QuestionIcon,
  Smile,
  Shield,
  Clock,
  Star,
  RefreshCw
} from 'lucide-react';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Quiz States
  const [quizStep, setQuizStep] = useState(0); // 0 means not started, 1-5 questions, 6 result
  const [answers, setAnswers] = useState({
    products: '',
    wholesale: '',
    domain: '',
    aiUsage: '',
    team: ''
  });

  const pricingPlans = [
    {
      id: 'start',
      name: 'شروع',
      desc: 'مناسب برای تست ایده، راه‌اندازی اولیه و فروشگاه‌های خانگی نوپا',
      price: 'رایگان',
      period: 'همیشگی',
      priceValue: 0,
      features: [
        'فروشگاه آماده با دامنه پیش‌فرض برسانا',
        'ثبت تا ۲۰ محصول فیزیکی',
        'قالب پایه و ریسپانسیو موبایل',
        'درگاه پرداخت عمومی و پیش‌فرض',
        'دستیار هوش مصنوعی (۵ درخواست در روز)',
        'پشتیبانی تیکتی پایه'
      ],
      ctaText: 'شروع ساده',
      ctaLink: '/register?plan=start'
    },
    {
      id: 'professional',
      name: 'حرفه‌ای',
      desc: 'برای کسب‌وکارهایی که فروش جدی دارند و می‌خواهند برند خود را بسازند',
      price: billingPeriod === 'monthly' ? '۲۹۰,۰۰۰' : '۲۳۰,۰۰۰',
      period: billingPeriod === 'monthly' ? 'تومان / ماهانه' : 'تومان / ماهانه (پرداخت سالانه)',
      badge: 'پیشنهاد برسانا برای شروع جدی فروش',
      priceValue: 290000,
      features: [
        'محصولات نامحدود (فیزیکی و دیجیتال)',
        'اتصال دامنه اختصاصی (.ir و .com)',
        'ابزارهای سئو خودکار و پیشرفته',
        'سیستم وبلاگ و تولید محتوا',
        'کدهای تخفیف متنوع و هوشمند',
        'چت آنلاین اختصاصی با خریداران',
        'دستیار هوش مصنوعی (۱۰۰ درخواست در روز)',
        'باشگاه مشتریان و سیستم امتیاز وفاداری'
      ],
      ctaText: 'انتخاب پکیج پیشنهادی',
      ctaLink: '/register?plan=professional'
    },
    {
      id: 'growth',
      name: 'رشد',
      desc: 'برای فروشگاه‌های بزرگ، تیم‌های چند نفره و عمده‌فروشان خلاق',
      price: billingPeriod === 'monthly' ? '۶۹۰,۰۰۰' : '۵۵۰,۰۰۰',
      period: billingPeriod === 'monthly' ? 'تومان / ماهانه' : 'تومان / ماهانه (پرداخت سالانه)',
      priceValue: 690000,
      features: [
        'همه‌ امکانات پکیج حرفه‌ای',
        'امکان افزودن ۵ همکار (Staff/Roles)',
        'سیستم اختصاصی عمده‌فروشی (B2B)',
        'تعیین قیمت‌های پله‌ای و MOQ',
        'سیستم پیشرفته Import / Export اکسل',
        'دستیار هوش مصنوعی نامحدود متکی بر RAG',
        'اتصال چند دامنه همزمان',
        'پشتیبانی تلفنی و تلگرامی اختصاصی'
      ],
      ctaText: 'مشاوره برای فروشگاه بزرگ',
      ctaLink: '/register?plan=growth'
    }
  ];

  const faqs = [
    {
      q: "برسانا چه فرقی با فروشگاه‌سازهای معمولی دارد؟",
      a: "فروشگاه‌سازهای معمولی فقط به شما فرم‌های پیچیده و قالب خام می‌دهند. اما برسانا یک پلتفرم هوشمند است؛ شما می‌توانید با زبان فارسی با فروشگاه خود چت کنید و دستیار هوشمند کارهایی مثل ثبت محصول، تولید سئو، تغییر ظاهر و تحلیل فروش را برایتان انجام می‌دهد."
    },
    {
      q: "RAG در برسانا یعنی چه؟",
      a: "فناوری RAG (Retrieval-Augmented Generation) به هوش مصنوعی اجازه می‌دهد قبل از پاسخ دادن، داده‌های واقعی فروشگاه شما (محصولات، سفارش‌ها، مشتریان و تنظیمات) را جستجو و تحلیل کند. این یعنی پاسخ‌ها کاملاً دقیق و متناسب با کسب‌وکار شماست، نه پاسخ‌های عمومی و فرضی."
    },
    {
      q: "آیا AI بدون تایید من تغییرات را ذخیره می‌کند؟",
      a: "خیر؛ امنیت و کنترل کامل در دست شماست. هوش مصنوعی برسانا ابتدا پیش‌نمایش (Preview) تغییرات پیشنهادی را به شما نشان می‌دهد و تنها پس از تایید و کلیک شما، تغییرات در دیتابیس ذخیره می‌شوند."
    },
    {
      q: "آیا می‌توانم با زبان فارسی به فروشگاه دستور بدهم؟",
      a: "بله؛ برسانا کاملاً برای زبان فارسی بهینه‌سازی شده است. شما می‌توانید به راحتی بنویسید «محصولات کم‌فروش این ماه را پیدا کن و برایشان تخفیف پیشنهاد بده» و سیستم دستور شما را به درستی درک و اجرا می‌کند."
    },
    {
      q: "آیا AI به محصولات و سفارش‌های من دسترسی دارد؟",
      a: "بله؛ دستیار هوشمند برای ارائه تحلیل‌های دقیق و انجام دستورات شما، به داده‌های کاتالوگ محصولات و سفارش‌ها دسترسی دارد. این دسترسی کاملاً ایزوله و در سطح فروشگاه خودتان (Row-Level Isolation) است و هیچ فروشگاه دیگری به داده‌های شما دسترسی نخواهد داشت."
    },
    {
      q: "آیا برای استفاده نیاز به برنامه‌نویسی دارم؟",
      a: "خیر؛ راه‌اندازی و مدیریت فروشگاه در برسانا ۱۰۰٪ بدون نیاز به دانش فنی یا برنامه‌نویسی است. تمام کارها از طریق گفت‌وگو با دستیار هوشمند و پنل مدیریت بسیار ساده انجام می‌شود."
    }
  ];

  const comparisonRows = [
    { feature: 'تعداد محصولات ثبت شده', start: 'تا ۲۰ محصول', pro: 'نامحدود', growth: 'نامحدود' },
    { feature: 'اتصال دامنه اختصاصی', start: '✗', pro: '✓ (.ir و .com)', growth: '✓ (چند دامنه)' },
    { feature: 'دستیار هوش مصنوعی (AI)', start: '۵ درخواست / روز', pro: '۱۰۰ درخواست / روز', growth: 'نامحدود (پیشرفته)', isAi: true },
    { feature: ' RAG زنده روی کاتالوگ و فاکتورها', start: '✗', pro: '✗', growth: '✓ (کامل)', isAi: true },
    { feature: 'فروش کالا دانلودی و دیجیتال', start: '✗', pro: '✓', growth: '✓' },
    { feature: 'درگاه‌های پرداخت موازی', start: 'عمومی و واسط', pro: 'مستقیم و اختصاصی', growth: 'مستقیم، کارت‌به‌کارت و پیش‌فاکتور' },
    { feature: 'سیستم عمده‌فروشی (B2B)', start: '✗', pro: '✗', growth: '✓ (قیمت پله‌ای و MOQ)' },
    { feature: 'تعداد همکاران فروشگاه (Staff)', start: 'فقط مدیر اصلی', pro: 'فقط مدیر اصلی', growth: 'تا ۵ همکار مستقل' },
    { feature: 'باشگاه مشتریان و وفاداری', start: '✗', pro: '✓', growth: '✓ (پیشرفته)' },
    { feature: 'درون‌ریزی/برون‌ریزی اکسل', start: '✗', pro: '✗', growth: '✓ (کامل با AI)' }
  ];

  const startQuiz = () => setQuizStep(1);

  const handleQuizAnswer = (key: string, value: string) => {
    const updatedAnswers = { ...answers, [key]: value };
    setAnswers(updatedAnswers);
    if (quizStep < 5) {
      setQuizStep(quizStep + 1);
    } else {
      setQuizStep(6); // Show result
    }
  };

  const getRecommendedPlan = () => {
    // Logic for recommendation
    if (answers.wholesale === 'yes' || answers.team === 'yes' || answers.products === 'large') {
      return pricingPlans[2]; // Growth plan
    }
    if (answers.products === 'medium' || answers.domain === 'yes' || answers.aiUsage === 'daily' || answers.aiUsage === 'heavy') {
      return pricingPlans[1]; // Pro plan
    }
    return pricingPlans[0]; // Start plan
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setAnswers({
      products: '',
      wholesale: '',
      domain: '',
      aiUsage: '',
      team: ''
    });
  };

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-12 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Star className="w-4 h-4 fill-blue-500/20" />
            <span>پلن‌های عادلانه و منعطف برای تمام ابعاد تجاری</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            تعرفه‌های شفاف برای ساخت فروشگاه هوشمند
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            با پکیج مناسب شروع کنید و هر زمان فروشگاه شما رشد کرد، امکانات بیشتری مثل AI، دامنه اختصاصی، چت، عمده‌فروشی و Staff را فعال کنید.
          </p>

          {/* Billing period selector */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={`text-xs font-bold ${billingPeriod === 'monthly' ? 'text-blue-600' : 'text-slate-400'}`}>پرداخت ماهانه</span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="w-12 h-6 bg-blue-600 rounded-full p-1 transition-colors relative cursor-pointer"
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${billingPeriod === 'yearly' ? 'left-1' : 'left-7'}`} />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${billingPeriod === 'yearly' ? 'text-blue-600' : 'text-slate-400'}`}>پرداخت سالانه</span>
              <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-0.5 rounded-full">۲۰٪ تخفیف</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => {
            const isRecommended = plan.id === 'professional';
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 flex flex-col justify-between relative overflow-hidden transition-all hover:scale-102 ${
                  isRecommended 
                    ? 'border-blue-500 shadow-xl ring-4 ring-blue-500/10 scale-102 md:-translate-y-2' 
                    : 'border-slate-150 dark:border-slate-800'
                }`}
              >
                {isRecommended && (
                  <div className="absolute top-3 left-3 bg-orange-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded-full shadow-sm animate-pulse">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-950 dark:text-white">{plan.name}</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{plan.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl justify-center">
                    <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{plan.price}</span>
                    <span className="text-[9px] text-slate-400 font-black">{plan.period}</span>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800" />

                  <ul className="space-y-3.5 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link
                    href={plan.ctaLink}
                    className={`w-full text-center block py-3.5 rounded-xl text-xs font-black transition-all active:scale-[0.98] ${
                      isRecommended
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Package recommendation quiz */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-900 p-6 sm:p-10 shadow-inner">
          
          {quizStep === 0 && (
            <div className="text-center space-y-6">
              <div className="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <QuestionIcon className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm sm:text-md font-black text-slate-950 dark:text-white">نمی‌دانید کدام پکیج مناسب کسب‌وکار شماست؟</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed max-w-md mx-auto">
                  به ۵ سوال کوتاه درباره کسب‌وکارتان پاسخ دهید تا هوشمندترین پکیج متناسب با نیاز خود را دریافت کنید.
                </p>
              </div>
              <button
                onClick={startQuiz}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              >
                شروع آزمون پیشنهاد پکیج
              </button>
            </div>
          )}

          {/* Question 1 */}
          {quizStep === 1 && (
            <div className="space-y-6">
              <span className="text-[10px] font-black text-blue-600">سوال ۱ از ۵</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">تعداد حدودی تنوع محصولات شما چقدر است؟</h4>
              <div className="grid gap-3">
                {[
                  { id: 'small', l: 'کمتر از ۲۰ محصول' },
                  { id: 'medium', l: 'بین ۲۰ تا ۵۰۰ محصول' },
                  { id: 'large', l: 'بیش از ۵۰۰ محصول' }
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleQuizAnswer('products', o.id)}
                    className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all cursor-pointer"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 2 */}
          {quizStep === 2 && (
            <div className="space-y-6">
              <span className="text-[10px] font-black text-blue-600">سوال ۲ از ۵</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">آیا فروش به صورت عمده یا همکار (B2B) دارید؟</h4>
              <div className="grid gap-3">
                {[
                  { id: 'yes', l: 'بله؛ برای بنکداران، همکاران یا مغازه‌داران قیمت پله‌ای یا MOQ دارم.' },
                  { id: 'no', l: 'خیر؛ فقط به صورت تک‌فروشی و مصرف‌کننده نهایی کار می‌کنم.' }
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleQuizAnswer('wholesale', o.id)}
                    className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all cursor-pointer"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 3 */}
          {quizStep === 3 && (
            <div className="space-y-6">
              <span className="text-[10px] font-black text-blue-600">سوال ۳ از ۵</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">آیا می‌خواهید دامنه اختصاصی مانند (.ir یا .com) متصل کنید؟</h4>
              <div className="grid gap-3">
                {[
                  { id: 'yes', l: 'بله؛ حتماً می‌خواهم برند رسمی خودم را روی دامنه شخصی ثبت کنم.' },
                  { id: 'no', l: 'خیر؛ برای شروع استفاده از زیردامنه پیش‌فرض برسانا کافی است.' }
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleQuizAnswer('domain', o.id)}
                    className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all cursor-pointer"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 4 */}
          {quizStep === 4 && (
            <div className="space-y-6">
              <span className="text-[10px] font-black text-blue-600">سوال ۴ از ۵</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">چقدر قصد دارید از قابلیت‌های هوش مصنوعی (تولید سئو، محصول، چت) استفاده کنید؟</h4>
              <div className="grid gap-3">
                {[
                  { id: 'light', l: 'خیلی کم؛ ترجیح می‌دهم بیشتر مشخصات را خودم دستی وارد کنم.' },
                  { id: 'daily', l: 'روزانه؛ برای تولید متن سئو و مشخصات محصولات به آن نیاز دارم.' },
                  { id: 'heavy', l: 'بسیار زیاد؛ تمایل دارم با دستورات گفت‌وگویی کل کارهای انبار و فاکتورها را مدیریت کنم.' }
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleQuizAnswer('aiUsage', o.id)}
                    className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all cursor-pointer"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 5 */}
          {quizStep === 5 && (
            <div className="space-y-6">
              <span className="text-[10px] font-black text-blue-600">سوال ۵ از ۵</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">آیا تیم فروش یا همکاران پشتیبانی دارید که نیاز به دسترسی اختصاصی داشته باشند؟</h4>
              <div className="grid gap-3">
                {[
                  { id: 'yes', l: 'بله؛ تمایل دارم همکاران من دسترسی محدود به فاکتورها یا پاسخ به تیکت‌ها داشته باشند.' },
                  { id: 'no', l: 'خیر؛ فقط خودم به عنوان مدیر اصلی، فروشگاه را اداره خواهم کرد.' }
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleQuizAnswer('team', o.id)}
                    className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all cursor-pointer"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Result */}
          {quizStep === 6 && (
            <div className="text-center space-y-6 animate-fadeIn">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                <Smile className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-emerald-500">پیشنهاد هوشمند برسانا</span>
                <h3 className="text-sm sm:text-md font-black text-slate-950 dark:text-white">
                  پکیج پیشنهادی برای شما: پلن «{getRecommendedPlan().name}»
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed max-w-sm mx-auto">
                  بر اساس پاسخ‌های شما، امکانات پکیج {getRecommendedPlan().name} تطابق ۱۰۰ درصدی با نیازهای تجاری شما دارد.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-sm mx-auto flex items-center justify-between">
                <div className="text-right">
                  <span className="text-xs font-black text-slate-950 dark:text-white block">{getRecommendedPlan().name}</span>
                  <span className="text-[10px] text-slate-400 font-bold">شروع تستی رایگان با تمام امکانات</span>
                </div>
                <Link href={getRecommendedPlan().ctaLink} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2 rounded-xl">
                  ثبت نام با این پلن
                </Link>
              </div>

              <button onClick={resetQuiz} className="text-[10px] font-black text-slate-400 hover:text-slate-600 underline flex items-center gap-1 mx-auto">
                <RefreshCw className="w-3 h-3" />
                <span>شروع مجدد آزمون</span>
              </button>
            </div>
          )}

        </div>
      </section>

      {/* Detailed comparison table */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">جدول مقایسه دقیق ویژگی‌ها</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] sm:text-xs font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">قابلیت‌ها</th>
                  <th className="p-4 text-center">شروع</th>
                  <th className="p-4 text-center">حرفه‌ای</th>
                  <th className="p-4 text-center">رشد</th>
                </tr>
              </thead>
              <tbody className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                    <td className="p-4 font-black text-slate-900 dark:text-white flex items-center gap-1">
                      {row.isAi && <Sparkles className="w-3.5 h-3.5 text-orange-500" />}
                      <span>{row.feature}</span>
                    </td>
                    <td className="p-4 text-center">{row.start}</td>
                    <td className="p-4 text-center font-black text-slate-800 dark:text-slate-200">{row.pro}</td>
                    <td className="p-4 text-center font-black text-blue-600 dark:text-blue-400">{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">پاسخ به سوالات متداول مالی</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-5 text-right flex items-center justify-between gap-4 text-slate-900 dark:text-white hover:bg-slate-50 transition-all cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-black">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              
              {openFaq === idx && (
                <div className="px-6 pb-5 pt-1 text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed border-t border-slate-100 dark:border-slate-800">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-blue-600 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black">می‌توانید ساده شروع کنید و حرفه‌ای رشد کنید</h2>
          <p className="text-xs sm:text-sm font-semibold opacity-90">
            ثبت‌نام کنید، ظاهر و قالب را انتخاب کنید و کاتالوگ فروشگاه را با دستیار هوشمند آماده کنید.
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/register" className="bg-white text-blue-600 hover:bg-blue-50 text-xs font-black px-8 py-3.5 rounded-2xl shadow-md">
              شروع رایگان ساخت فروشگاه
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
