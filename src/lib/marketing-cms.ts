import { prisma } from '@/lib/prisma';

export interface FeatureCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface DemoCard {
  id: string;
  title: string;
  type: string;
  desc: string;
  features: string[];
  aiCapabilities: string[];
  image: string;
  ctaLink: string;
  storeType?: string;
  suitableFor?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  desc: string;
  price: string;
  period: string;
  features: string[];
  badge?: string;
  ctaText: string;
  ctaLink: string;
}

export interface ComparisonRow {
  feature: string;
  instagram: string | boolean;
  standard: string | boolean;
  bersana: string | boolean;
  isAi?: boolean;
}

export interface PromptExample {
  id: string;
  prompt: string;
  outputType: string;
  outputPreview: string;
}

export interface MarketingContent {
  metaTitle: string;
  metaDesc: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  features: FeatureCard[];
  faqs: FAQItem[];
  demos: DemoCard[];
  pricing: PricingPlan[];
  comparisons: ComparisonRow[];
  prompts: PromptExample[];
}

const DEFAULT_FEATURES: FeatureCard[] = [
  { 
    id: '1', 
    title: 'سرعت لود زیر ۵۰۰ میلی‌ثانیه', 
    desc: 'با فناوری پیشرفته Next.js و کشینگ تهاجمی، صفحات فروشگاه شما در کسری از ثانیه لود می‌شوند تا مشتریان را از دست ندهید.', 
    icon: 'Zap', 
    color: 'blue' 
  },
  { 
    id: '2', 
    title: 'طراحی اول-موبایل (Mobile-First)', 
    desc: 'بیش از ۸۰٪ خریدهای اینترنتی با موبایل انجام می‌شود. قالب‌های ما ۱۰۰٪ برای موبایل بهینه‌سازی شده‌اند.', 
    icon: 'Smartphone', 
    color: 'indigo' 
  },
  { 
    id: '3', 
    title: 'دستیار تولید محتوا و سئو', 
    desc: 'دستور: برای این محصول توضیح سئو بنویس\nخروجی: عنوان SEO، توضیح متا، FAQ و Schema\nنتیجه: آماده‌تر برای جذب مشتری از گوگل', 
    icon: 'Sparkles', 
    color: 'purple' 
  },
  { 
    id: '4', 
    title: 'اتصال دامنه اختصاصی', 
    desc: 'می‌توانید دامنه شخصی خود (مانند yourdomain.com) را به راحتی متصل کنید تا برند شما مستقل دیده شود.', 
    icon: 'Globe', 
    color: 'amber' 
  },
  { 
    id: '5', 
    title: 'دستیار تحلیل انبار و موجودی', 
    desc: 'دستور: محصولات کم‌فروش این ماه را پیدا کن\nخروجی: لیست کالاها با پیشنهاد تخفیف هوشمند\nنتیجه: تخلیه سریع انبار و افزایش نقدینگی', 
    icon: 'Database', 
    color: 'rose' 
  },
  { 
    id: '6', 
    title: 'دستیار بازاریابی و مشتریان VIP', 
    desc: 'دستور: مشتریان VIP را جدا کن و کمپین تخفیف پیشنهاد بده\nخروجی: شناسایی خریداران وفادار و ساخت کد تخفیف اختصاصی\nنتیجه: افزایش نرخ بازگشت مشتری و وفاداری به برند', 
    icon: 'Users', 
    color: 'emerald' 
  }
];

const DEFAULT_FAQS: FAQItem[] = [
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

const DEFAULT_DEMOS: DemoCard[] = [
  {
    id: 'apparel',
    title: 'فروشگاه پوشاک مدرن (Bersana Fashion)',
    type: 'پوشاک و مد',
    desc: 'طراحی مینیمال و لوکس، گالری تصاویر پیشرفته، فیلترهای سایز و رنگ، و فرآیند خرید سریع در موبایل.',
    features: ['تنوع رنگ و سایز', 'سبد خرید هوشمند', 'اسلایدر و استوری زنده'],
    aiCapabilities: ['تولید خودکار ژورنال با پرامپت', 'تولید سئو و تگ‌های هوشمند پوشاک'],
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=fashion',
    storeType: 'فروشگاه پوشاک و مد',
    suitableFor: 'مزون‌ها، برندهای لباس، کیف و کفش و اکسسوری'
  },
  {
    id: 'beauty',
    title: 'فروشگاه آرایشی و زیبایی (Bersana Beauty)',
    type: 'آرایشی و بهداشتی',
    desc: 'نمایش بی‌نظیر جزئیات محصول، امتیازدهی و نظرات خریداران، و چرخ‌فلک برندهای برتر.',
    features: ['نظرات و امتیازات تصویری', 'دسته بندی برندها', 'سیستم تخفیف ویژه'],
    aiCapabilities: ['تولید خودکار توضیحات فنی لوازم آرایشی', 'پیشنهاد خودکار محصولات مکمل با RAG'],
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=beauty',
    storeType: 'فروشگاه آرایشی و زیبایی',
    suitableFor: 'فروشگاه‌های لوازم آرایشی، بهداشتی، مراقبت پوست و عطر'
  },
  {
    id: 'digital',
    title: 'فروشگاه کالای دیجیتال (Bersana Tech)',
    type: 'کالای دیجیتال و جانبی',
    desc: 'جدول مقایسه مشخصات فنی، سیستم گارانتی، گالری ویدئویی و اطلاع‌رسانی موجودی مجدد.',
    features: ['جدول مشخصات فنی پیشرفته', 'سیستم مقایسه کالا', 'خبرم کن موجود شد'],
    aiCapabilities: ['کسب مشخصات فنی معتبر از منابع جهانی با AI', 'تحلیل هوشمند قیمت‌گذاری رقبا'],
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=tech',
    storeType: 'فروشگاه کالای دیجیتال',
    suitableFor: 'فروشندگان موبایل، لپ‌تاپ، لوازم جانبی و قطعات الکترونیکی'
  },
  {
    id: 'wholesale',
    title: 'فروشگاه عمده‌فروشی آنلاین (Bersana B2B)',
    type: 'عمده‌فروشی و توزیع',
    desc: 'پنل تخصصی نمایندگان خرید، قیمت پله‌ای بر اساس تعداد (Wholesale Tiers)، MOQ و خرید اعتباری.',
    features: ['حداقل تعداد سفارش (MOQ)', 'لیست قیمت‌های پله‌ای', 'فروش فقط اعتباری / بیعانه'],
    aiCapabilities: ['تحلیل کمپین‌های فروش عمده', 'پیشنهاد قیمت پله‌ای بهینه بر اساس حاشیه سود'],
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=b2b',
    storeType: 'فروشگاه عمده‌فروشی آنلاین (B2B)',
    suitableFor: 'تولیدکنندگان، بنکداران، شرکت‌های پخش و واردکنندگان کالا'
  }
];

const DEFAULT_PRICING: PricingPlan[] = [
  {
    id: 'start',
    name: 'شروع',
    desc: 'مناسب برای تست ایده، راه‌اندازی اولیه و فروشگاه‌های خانگی نوپا',
    price: 'رایگان',
    period: 'همیشگی',
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
    price: '۲۹۰,۰۰۰',
    period: 'تومان / ماهانه',
    badge: 'پیشنهاد برسانا برای شروع جدی فروش',
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
    price: '۶۹۰,۰۰۰',
    period: 'تومان / ماهانه',
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

const DEFAULT_COMPARISONS: ComparisonRow[] = [
  { feature: 'ساخت فروشگاه', instagram: '۱ ساعت (ساخت پیج)', standard: 'چندین روز (نیاز به هاست و قالب)', bersana: '۶۰ ثانیه (آنی و آماده فروش)' },
  { feature: 'مدیریت محصول', instagram: 'دستی در دایرکت و پست‌ها', standard: 'فرم‌های پیچیده و کند', bersana: 'ثبت و ویرایش با پرامپت فارسی' },
  { feature: 'تولید محتوا', instagram: 'کاملاً دستی و زمان‌بر', standard: 'خارج از سیستم (نیاز به نویسنده)', bersana: 'تولید خودکار متن و مقاله با AI' },
  { feature: 'سئو (SEO)', instagram: 'ندارد (فقط هشتگ)', standard: 'نیاز به افزونه‌های گران‌قیمت', bersana: 'تولید خودکار Schema و متا با AI' },
  { feature: 'تحلیل سفارش', instagram: 'ندارد (بررسی تک‌تک فیش‌ها)', standard: 'گزارش‌های عددی خام', bersana: 'تحلیل هوشمند علل لغو و رفتار خرید' },
  { feature: 'شناخت داده', instagram: 'ندارد', standard: 'ندارد', bersana: 'درک کامل محصولات و مشتریان با RAG', isAi: true },
  { feature: 'تغییر صفحه اصلی', instagram: 'غیرممکن (فقط چیدمان پست)', standard: 'نیاز به طراح یا ویرایشگر پیچیده', bersana: 'تغییر چیدمان و رنگ‌ها با یک پرامپت' },
  { feature: 'هوش مصنوعی (AI)', instagram: '✗ ندارد', standard: '✗ ندارد (یا فقط تولید متن ساده)', bersana: '✓ دستیار هوشمند با عاملیت واقعی', isAi: true },
  { feature: 'پایگاه دانش (RAG)', instagram: '✗ ندارد', standard: '✗ ندارد', bersana: '✓ جستجوی معنایی و درک عمیق کاتالوگ', isAi: true }
];

const DEFAULT_PROMPTS: PromptExample[] = [
  {
    id: '1',
    prompt: 'محصولات کم‌فروش این ماه را پیدا کن و برایشان تخفیف پیشنهاد بده',
    outputType: 'مدیریت محصولات',
    outputPreview: 'تولید عنوان، ویژگی‌ها، تگ‌ها، سایزبندی و قیمت به صورت کاملاً خودکار و دسته‌بندی شده در دیتابیس.'
  },
  {
    id: '2',
    prompt: 'برای فروشگاه من ۱۰ محصول جدید با توضیح سئو بساز',
    outputType: 'سئو و محتوا',
    outputPreview: 'تولید JSON-LD Schema، عنوان سئو (۵۵ کاراکتر)، متا دسکریپشن کلیک‌خور و ۵ سوال متداول کلیدی.'
  },
  {
    id: '3',
    prompt: 'صفحه اصلی فروشگاه را مدرن‌تر کن',
    outputType: 'تحلیل انبار',
    outputPreview: 'نمایش لیست ۸ محصولی که موجودی آنها زیر ۵ عدد است، به همراه دکمه اعمال شارژ یا اطلاع‌رسانی.'
  },
  {
    id: '4',
    prompt: 'برای مشتریان پرخرید این ماه کمپین تخفیف پیشنهاد بده',
    outputType: 'بازاریابی هوشمند',
    outputPreview: 'شناسایی مشتریان VIP، طراحی کد تخفیف اختصاصی "VIP-SUMMER" و پیشنهاد متن پیامک اطلاع‌رسانی.'
  },
  {
    id: '5',
    prompt: 'سفارش‌های لغوشده این هفته را تحلیل کن',
    outputType: 'تحلیل مالی و سفارشات',
    outputPreview: 'یافتن الگو (مثلاً عدم اتصال درگاه زیبال در روز دوشنبه یا هزینه بالای پست) و پیشنهاد راهکار عملی.'
  }
];

export async function getMarketingCMSContent(): Promise<MarketingContent> {
  try {
    const keys = [
      'saas_meta_title',
      'saas_meta_desc',
      'saas_hero_title',
      'saas_hero_subtitle',
      'saas_primary_cta',
      'saas_secondary_cta',
      'saas_features',
      'saas_faqs',
      'saas_demos',
      'saas_pricing',
      'saas_comparisons',
      'saas_prompts'
    ];

    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: keys } }
    });

    const settingsMap = new Map(rows.map(r => [r.key, r.value]));

    const metaTitle = settingsMap.get('saas_meta_title') || 'فروشگاه‌ساز هوشمند برسانا | ساخت فروشگاه آنلاین با هوش مصنوعی';
    const metaDesc = settingsMap.get('saas_meta_desc') || 'با برسانا فروشگاه آنلاین حرفه‌ای بسازید، با فروشگاه خود حرف بزنید، محصول و سئو تولید کنید، سفارش‌ها را تحلیل کنید و فروش خود را با هوش مصنوعی رشد دهید.';
    const heroTitle = settingsMap.get('saas_hero_title') || 'فروشگاهت را با پرامپت مدیریت کن؛ برسانا اجرا می‌کند';
    const heroSubtitle = settingsMap.get('saas_hero_subtitle') || 'برسانا اولین پلتفرم تجارت الکترونیک هوشمند در ایران است که با استفاده از هوش مصنوعی و فناوری RAG، داده‌های فروشگاه شما (محصولات، سفارش‌ها، مشتریان و سئو) را به طور کامل درک کرده و به شما اجازه می‌دهد تمام عملیات را فقط با پرامپت‌های ساده فارسی مدیریت کنید.';
    const primaryCtaLabel = settingsMap.get('saas_primary_cta') || 'ساخت فروشگاه هوشمند رایگان';
    const secondaryCtaLabel = settingsMap.get('saas_secondary_cta') || 'دیدن دمو گفت‌وگو با فروشگاه';

    // Parse structures
    let features = DEFAULT_FEATURES;
    const featsStr = settingsMap.get('saas_features');
    if (featsStr) {
      try { features = JSON.parse(featsStr); } catch {}
    }

    let faqs = DEFAULT_FAQS;
    const faqsStr = settingsMap.get('saas_faqs');
    if (faqsStr) {
      try { faqs = JSON.parse(faqsStr); } catch {}
    }

    let demos = DEFAULT_DEMOS;
    const demosStr = settingsMap.get('saas_demos');
    if (demosStr) {
      try { demos = JSON.parse(demosStr); } catch {}
    }

    let pricing = DEFAULT_PRICING;
    const pricingStr = settingsMap.get('saas_pricing');
    if (pricingStr) {
      try { pricing = JSON.parse(pricingStr); } catch {}
    }

    let comparisons = DEFAULT_COMPARISONS;
    const compStr = settingsMap.get('saas_comparisons');
    if (compStr) {
      try { comparisons = JSON.parse(compStr); } catch {}
    }

    let prompts = DEFAULT_PROMPTS;
    const promptStr = settingsMap.get('saas_prompts');
    if (promptStr) {
      try { prompts = JSON.parse(promptStr); } catch {}
    }

    return {
      metaTitle,
      metaDesc,
      heroTitle,
      heroSubtitle,
      primaryCtaLabel,
      secondaryCtaLabel,
      features,
      faqs,
      demos,
      pricing,
      comparisons,
      prompts
    };
  } catch (error) {
    console.error('[CMS] Failed to read content from DB, returning defaults', error);
    return {
      metaTitle: 'فروشگاه‌ساز هوشمند برسانا | ساخت فروشگاه آنلاین با هوش مصنوعی',
      metaDesc: 'با برسانا فروشگاه آنلاین حرفه‌ای بسازید، با فروشگاه خود حرف بزنید، محصول و سئو تولید کنید، سفارش‌ها را تحلیل کنید و فروش خود را با هوش مصنوعی رشد دهید.',
      heroTitle: 'فروشگاهت را با پرامپت مدیریت کن؛ برسانا اجرا می‌کند',
      heroSubtitle: 'برسانا اولین پلتفرم تجارت الکترونیک هوشمند در ایران است که با استفاده از هوش مصنوعی و فناوری RAG، داده‌های فروشگاه شما (محصولات، سفارش‌ها، مشتریان و سئو) را به طور کامل درک کرده و به شما اجازه می‌دهد تمام عملیات را فقط با پرامپت‌های ساده فارسی مدیریت کنید.',
      primaryCtaLabel: 'ساخت فروشگاه هوشمند رایگان',
      secondaryCtaLabel: 'دیدن دمو گفت‌وگو با فروشگاه',
      features: DEFAULT_FEATURES,
      faqs: DEFAULT_FAQS,
      demos: DEFAULT_DEMOS,
      pricing: DEFAULT_PRICING,
      comparisons: DEFAULT_COMPARISONS,
      prompts: DEFAULT_PROMPTS
    };
  }
}
