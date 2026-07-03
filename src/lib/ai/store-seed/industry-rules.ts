import { IndustryRule } from './types';

export const industryRules: Record<string, IndustryRule> = {
  cosmetics: {
    requiredAttributes: [
      { name: 'نوع پوست', type: 'select', required: true, options: ['چرب', 'خشک', 'مختلط', 'حساس', 'انواع پوست'] },
      { name: 'حجم', type: 'text', required: true },
      { name: 'SPF', type: 'text', required: false },
      { name: 'ترکیبات اصلی', type: 'text', required: true }
    ],
    defaultCategories: [
      { name: 'مراقبت از پوست', slug: 'skincare', description: 'انواع سرم، آبرسان و ضدآفتاب' },
      { name: 'آرایش صورت', slug: 'makeup', description: 'کرم پودر، رژلب و ریمل' },
      { name: 'مراقبت از مو', slug: 'haircare', description: 'شامپو، ماسک مو و روغن‌های تقویت‌کننده' }
    ],
    priceRange: { min: 120000, max: 1800000 },
    stockRange: { min: 10, max: 150 },
    variantTypes: ['حجم', 'رنگ'],
    imageSearchHints: ['skincare serum bottle minimal', 'cosmetic cream jar aesthetic', 'lip gloss product photo'],
    blogTopicHints: [
      'روتین پوستی روزانه برای پوست‌های چرب و جوش‌دار',
      'چگونه ضدآفتاب مناسب پوست خود را انتخاب کنیم؟',
      'تفاوت آبرسان و مرطوب‌کننده چیست؟'
    ],
    seoKeywordHints: ['خرید لوازم آرایشی', 'سرم پوست اصل', 'بهترین ضد آفتاب پوستی', 'مراقبت از مو'],
    unsafeOrRestrictedExamples: ['کرم‌های کورتون‌دار', 'داروهای درمان کچلی تخصصی', 'کرم‌های سفیدکننده با ترکیبات جیوه']
  },
  clothing: {
    requiredAttributes: [
      { name: 'سایز', type: 'select', required: true, options: ['S', 'M', 'L', 'XL', 'XXL', 'فری سایز'] },
      { name: 'رنگ', type: 'text', required: true },
      { name: 'جنس پارچه', type: 'text', required: true },
      { name: 'فصل', type: 'select', required: false, options: ['بهار', 'تابستان', 'پاییز', 'زمستان', 'چهارفصل'] }
    ],
    defaultCategories: [
      { name: 'پوشاک زنانه', slug: 'womens-clothing', description: 'مانتو، شومیز و شلوار زنانه' },
      { name: 'پوشاک مردانه', slug: 'mens-clothing', description: 'پیراهن، تیشرت و شلوار مردانه' },
      { name: 'اکسسوری', slug: 'accessories', description: 'شال، روسری، کمربند و کلاه' }
    ],
    priceRange: { min: 180000, max: 3500000 },
    stockRange: { min: 5, max: 80 },
    variantTypes: ['سایز', 'رنگ'],
    imageSearchHints: ['linen shirt cream color minimal', 'women coat aesthetic', 'mens cotton t-shirt product photo'],
    blogTopicHints: [
      'راهنمای جامع ست کردن رنگ‌های پاستلی در استایل تابستانه',
      'چگونه جنس پارچه لینن اصل را تشخیص دهیم؟',
      '۵ آیتم ضروری که باید در کمد لباس کپسولی خود داشته باشید'
    ],
    seoKeywordHints: ['خرید مانتو مینی‌مال', 'شومیز نخی زنانه', 'پوشاک مردانه شیک', 'استایل مینی‌مال'],
    unsafeOrRestrictedExamples: ['لباس‌های نظامی رسمی', 'کالاهای کپی برندهای تحت کپی‌رایت شدید بدون ذکر کپی بودن']
  },
  electronics: {
    requiredAttributes: [
      { name: 'ظرفیت', type: 'text', required: false },
      { name: 'رنگ', type: 'text', required: true },
      { name: 'نوع اتصال', type: 'select', required: true, options: ['بیسیم (بلوتوث)', 'باسیم', 'هر دو'] },
      { name: 'مدت ضمانت', type: 'text', required: true }
    ],
    defaultCategories: [
      { name: 'لوازم جانبی موبایل', slug: 'mobile-accessories', description: 'قاب، گلس، شارژر و پاوربانک' },
      { name: 'تجهیزات صوتی', slug: 'audio-equipment', description: 'هدفون، هندزفری و اسپیکر بلوتوث' },
      { name: 'گجت‌های هوشمند', slug: 'smart-gadgets', description: 'ساعت هوشمند، رینگ لایت و ابزارهای کاربردی' }
    ],
    priceRange: { min: 150000, max: 12000000 },
    stockRange: { min: 5, max: 100 },
    variantTypes: ['رنگ', 'ظرفیت'],
    imageSearchHints: ['wireless headphones minimal product photo', 'smart watch black on white background', 'power bank modern design'],
    blogTopicHints: [
      'راهنمای خرید هدفون بیسیم: به چه نکاتی توجه کنیم؟',
      'چگونه عمر باتری گوشی هوشمند خود را دو برابر کنیم؟',
      'بررسی تفاوت‌های ساعت‌های هوشمند اقتصادی و پرچمدار'
    ],
    seoKeywordHints: ['خرید هدفون بلوتوثی', 'لوازم جانبی موبایل اصل', 'ساعت هوشمند ارزان', 'بهترین پاوربانک'],
    unsafeOrRestrictedExamples: ['دستگاه‌های شنود و جاسوسی', 'جمر سیگنال موبایل', 'لوازم هک و نفوذ']
  },
  coffee: {
    requiredAttributes: [
      { name: 'خاستگاه', type: 'text', required: true },
      { name: 'درجه رست', type: 'select', required: true, options: ['لایت', 'مدیوم', 'مدیوم-دارک', 'دارک'] },
      { name: 'وزن', type: 'select', required: true, options: ['۲۵۰ گرم', '۵۰۰ گرم', '۱ کیلوگرم'] },
      { name: 'طعم‌یادها', type: 'text', required: false }
    ],
    defaultCategories: [
      { name: 'دان و پودر قهوه', slug: 'coffee-beans', description: 'انواع قهوه تک‌خاستگاه و ترکیبی (بلند)' },
      { name: 'ابزارهای دم‌آوری', slug: 'brewing-tools', description: 'موکاپات، فرنچ پرس و قهوه‌سازهای نسل سوم' },
      { name: 'لوازم جانبی کافه', slug: 'cafe-accessories', description: 'ماگ، فیلتر کاغذی و آسیاب قهوه دستی' }
    ],
    priceRange: { min: 100000, max: 1200000 },
    stockRange: { min: 15, max: 200 },
    variantTypes: ['وزن', 'نوع آسیاب'],
    imageSearchHints: ['roasted coffee beans bag product photo', 'french press coffee maker minimal', 'ceramic coffee mug aesthetic'],
    blogTopicHints: [
      'تفاوت قهوه عربیکا و روبوستا در چیست؟ راهنمای انتخاب',
      'چگونه با فرنچ پرس یک قهوه غلیظ و بدون تفاله دم کنیم؟',
      'تاثیر درجه آسیاب قهوه بر طعم نهایی فنجان شما'
    ],
    seoKeywordHints: ['خرید قهوه اسپرسو', 'دان قهوه عربیکا اصل', 'قیمت فرنچ پرس', 'خرید ابزار دم آوری قهوه'],
    unsafeOrRestrictedExamples: ['قرص‌های کافئین خالص دارویی غیراستاندارد', 'قهوه‌های لاغری با ترکیبات آمفتامین']
  },
  home: {
    requiredAttributes: [
      { name: 'جنس', type: 'text', required: true },
      { name: 'ابعاد', type: 'text', required: true },
      { name: 'رنگ', type: 'text', required: false },
      { name: 'کشور سازنده', type: 'text', required: false }
    ],
    defaultCategories: [
      { name: 'ظروف پذیرایی و سرو', slug: 'tableware', description: 'بشقاب، فنجان، ماگ و ظروف سرامیکی' },
      { name: 'دکوراتیو و تزیینی', slug: 'decoratives', description: 'گلدان، شمع، عودسوز و قاب عکس' },
      { name: 'منسوجات خانه', slug: 'home-textiles', description: 'رومیزی، کوسن و دستمال‌های مینی‌مال آشپزخانه' }
    ],
    priceRange: { min: 150000, max: 4500000 },
    stockRange: { min: 5, max: 60 },
    variantTypes: ['رنگ', 'سایز'],
    imageSearchHints: ['ceramic plates minimal tableware aesthetic', 'scented candle in glass jar', 'linen cushion cover on sofa'],
    blogTopicHints: [
      'چگونه با اکسسوری‌های سرامیکی چیدمان خانه را مینی‌مال کنیم؟',
      'راهنمای انتخاب شمع‌های معطر برای ایجاد آرامش در اتاق خواب',
      'اصول مراقبت و شستشوی ظروف سرامیکی دست‌ساز'
    ],
    seoKeywordHints: ['ظروف سرامیکی دست ساز', 'خرید اکسسوری منزل', 'شمع معطر فانتزی', 'دکوراسیون مینی‌مال'],
    unsafeOrRestrictedExamples: ['وسایل گازسوز غیراستاندارد', 'چاقوهای شکاری بزرگ و غیرآشپزخانه‌ای']
  },
  jewelry: {
    requiredAttributes: [
      { name: 'جنس پایه', type: 'select', required: true, options: ['نقره ۹۲۵', 'استیل ضدحساسیت', 'برنج با آبکاری طلا', 'مس'] },
      { name: 'نوع سنگ', type: 'text', required: false },
      { name: 'طول', type: 'text', required: false },
      { name: 'نوع قفل', type: 'text', required: true }
    ],
    defaultCategories: [
      { name: 'گردنبند', slug: 'necklaces', description: 'گردنبندهای ظریف، زنجیر و آویزهای مینی‌مال' },
      { name: 'دستبند و انگشتر', slug: 'bracelets-rings', description: 'انگشترهای بندانگشتی و دستبندهای کارتیر و سنگی' },
      { name: 'گوشواره', slug: 'earrings', description: 'گوشواره‌های میخی، حلقه‌ای و آویز نقره' }
    ],
    priceRange: { min: 120000, max: 2500000 },
    stockRange: { min: 3, max: 50 },
    variantTypes: ['سایز انگشتر', 'رنگ'],
    imageSearchHints: ['silver necklace delicate minimal aesthetic', 'stack of silver rings on finger', 'gold hoop earrings product photo'],
    blogTopicHints: [
      'راهنمای تعیین سایز انگشتر در خانه به صورت دقیق',
      'چگونه از سیاه شدن زیورآلات نقره جلوگیری کنیم؟',
      'تفاوت آبکاری رادیوم و آبکاری طلا در بدلیجات چیست؟'
    ],
    seoKeywordHints: ['خرید گردنبند نقره زنانه', 'انگشتر مینی‌مال دخترانه', 'گوشواره حلقه‌ای شیک', 'بدلیجات ضد حساسیت'],
    unsafeOrRestrictedExamples: ['شمش‌های طلای تقلبی', 'سنگ‌های قیمتی با شناسنامه‌های جعلی آزمایشگاهی']
  },
  books: {
    requiredAttributes: [
      { name: 'نویسنده / مترجم', type: 'text', required: true },
      { name: 'ناشر', type: 'text', required: true },
      { name: 'تعداد صفحات', type: 'text', required: false },
      { name: 'نوع جلد', type: 'select', required: false, options: ['شومیز', 'گالینگور (سخت)', 'جیبی'] }
    ],
    defaultCategories: [
      { name: 'ادبیات و رمان', slug: 'literature-novels', description: 'رمان‌های برجسته ایرانی و خارجی' },
      { name: 'روانشناسی و موفقیت', slug: 'psychology-self-help', description: 'کتاب‌های توسعه فردی، مدیریت زمان و روانشناسی عمومی' },
      { name: 'کتاب‌های صوتی و الکترونیک', slug: 'digital-books', description: 'فایل‌های دانلودی کتاب صوتی و PDFهای مجاز' }
    ],
    priceRange: { min: 60000, max: 450000 },
    stockRange: { min: 10, max: 150 },
    variantTypes: ['نوع جلد', 'فرمت کتاب'],
    imageSearchHints: ['stack of books on wooden table minimal', 'open book aesthetic coffee shop', 'audiobook concept flatlay'],
    blogTopicHints: [
      'معرفی ۵ کتاب توسعه فردی که مسیر زندگی شما را تغییر می‌دهند',
      'چگونه عادت به مطالعه روزانه را در خود ایجاد کنیم؟',
      'تفاوت‌های خواندن کتاب چاپی با کتاب الکترونیک و صوتی'
    ],
    seoKeywordHints: ['خرید کتاب روانشناسی', 'بهترین رمان های جهان', 'کتاب صوتی موفقیت', 'خرید آنلاین کتاب'],
    unsafeOrRestrictedExamples: ['کتاب‌های ممنوعه بدون مجوز وزارت ارشاد', 'پی‌دی‌اف‌های غیرقانونی با نقض حق نشر']
  },
  sports: {
    requiredAttributes: [
      { name: 'جنس', type: 'text', required: true },
      { name: 'مناسب برای', type: 'text', required: true },
      { name: 'کشور سازنده', type: 'text', required: false },
      { name: 'سطح مهارت', type: 'select', required: false, options: ['مبتدی', 'متوسط', 'حرفه‌ای'] }
    ],
    defaultCategories: [
      { name: 'پوشاک ورزشی', slug: 'sports-apparel', description: 'تیشرت ورزشی، لگ، شلوارک و ست‌های باشگاهی' },
      { name: 'تجهیزات تمرین در خانه', slug: 'home-workout', description: 'مت یوگا، دمبل، کش مینی‌لوپ و طناب ورزشی' },
      { name: 'قمقمه و شیکر', slug: 'bottles-shakers', description: 'قمقمه‌های ورزشی، شیکرهای دو طبقه و پروتئینی' }
    ],
    priceRange: { min: 100000, max: 3000000 },
    stockRange: { min: 5, max: 120 },
    variantTypes: ['سایز', 'رنگ', 'وزن دمبل'],
    imageSearchHints: ['yoga mat rolled up minimal background', 'gym shaker bottle aesthetic', 'sports wear flatlay product photo'],
    blogTopicHints: [
      'راهنمای انتخاب مت یوگا مناسب بر اساس ضخامت و جنس',
      'برنامه تمرینی مینی‌مال ۲۰ دقیقه‌ای در خانه بدون نیاز به تجهیزات',
      'چرا نوشیدن آب در حین ورزش حیاتی است؟ راهنمای انتخاب قمقمه'
    ],
    seoKeywordHints: ['خرید مت یوگا ارزان', 'شیکر ورزشی دو طبقه', 'لباس باشگاه زنانه', 'وسایل ورزشی خانگی'],
    unsafeOrRestrictedExamples: ['داروهای استروئیدی و هورمونی غیرمجاز', 'مکمل‌های ورزشی بدون برچسب سیب سلامت']
  },
  kids: {
    requiredAttributes: [
      { name: 'رده سنی', type: 'select', required: true, options: ['۰ تا ۶ ماه', '۶ تا ۱۲ ماه', '۱ تا ۳ سال', '۳ تا ۶ سال', 'بالای ۶ سال'] },
      { name: 'جنس', type: 'text', required: true },
      { name: 'رنگ', type: 'text', required: true },
      { name: 'قابلیت شستشو', type: 'select', required: false, options: ['دارد (با دست)', 'دارد (ماشین لباسشویی)', 'ندارد'] }
    ],
    defaultCategories: [
      { name: 'پوشاک نخی کودک', slug: 'kids-clothing', description: 'سرهمی، رامپر و ست‌های راحتی نخی و ضدحساسیت' },
      { name: 'بازی و سرگرمی', slug: 'toys', description: 'اسباب‌بازی‌های چوبی، پازل و بازی‌های فکری مینی‌مال' },
      { name: 'اکسسوری نوزاد', slug: 'baby-accessories', description: 'پتو دورپیچ، پیش‌بند، پستانک و بند پستانک سیلیکونی' }
    ],
    priceRange: { min: 120000, max: 1800000 },
    stockRange: { min: 8, max: 100 },
    variantTypes: ['سایز (رده سنی)', 'رنگ'],
    imageSearchHints: ['baby cotton romper cream color aesthetic', 'wooden educational toy minimal', 'baby silicone pacifier aesthetic'],
    blogTopicHints: [
      'چرا اسباب‌بازی‌های چوبی برای رشد خلاقیت کودکان بهتر از پلاستیکی هستند؟',
      'راهنمای خرید لباس نوزادی: چه جنس پارچه‌ای ضدحساسیت است؟',
      'چگونه اتاق کودک خود را به سبک مینی‌مال و آرامش‌بخش چیدمان کنیم؟'
    ],
    seoKeywordHints: ['خرید لباس نوزادی نخی', 'اسباب بازی چوبی مینی‌مال', 'سرهمی نوزاد شیک', 'وسایل سیسمونی نوزاد'],
    unsafeOrRestrictedExamples: ['اسباب‌بازی‌های دارای قطعات ریز خطرناک برای زیر ۳ سال بدون هشدار', 'شیر خشک‌های قاچاق بدون تاییدیه بهداشت']
  },
  health: {
    requiredAttributes: [
      { name: 'نوع محصول', type: 'text', required: true },
      { name: 'حجم / تعداد', type: 'text', required: true },
      { name: 'ترکیبات اصلی', type: 'text', required: true },
      { name: 'شماره پروانه بهداشت', type: 'text', required: false }
    ],
    defaultCategories: [
      { name: 'دمنوش و گیاهان دارویی', slug: 'herbal-teas', description: 'دمنوش‌های آرامش‌بخش، بابونه، بهارنارنج و مخلوط‌های گیاهی' },
      { name: 'ماساژ و آروماتراپی', slug: 'massage-aromatherapy', description: 'روغن‌های ماساژ طبیعی، اسانس‌های معطر و عودهای دست‌ساز' },
      { name: 'مکمل‌های غذایی طبیعی', slug: 'natural-supplements', description: 'عسل طبیعی، ژل رویال، سبوس برنج و پودرهای گیاهی مجاز' }
    ],
    priceRange: { min: 80000, max: 1500000 },
    stockRange: { min: 15, max: 150 },
    variantTypes: ['حجم', 'تعداد در بسته'],
    imageSearchHints: ['herbal tea cup with chamomile flowers minimal', 'essential oil glass dropper bottle aesthetic', 'raw organic honey jar'],
    blogTopicHints: [
      'بهترین دمنوش‌های گیاهی برای کاهش استرس و بهبود خواب شبانه',
      'خواص شگفت‌انگیز روغن اسطوخودوس در آروماتراپی و ماساژ',
      'چگونه عسل طبیعی و ارگانیک را از عسل تقلبی تشخیص دهیم؟'
    ],
    seoKeywordHints: ['خرید دمنوش آرامش بخش', 'روغن اسطوخودوس اصل', 'خرید عسل طبیعی ارگانیک', 'آروماتراپی در خانه'],
    unsafeOrRestrictedExamples: ['قرص‌های مسکن و آرام‌بخش شیمیایی تحت نسخه', 'داروهای سقط جنین یا ترک اعتیاد', 'مکمل‌های لاغری هورمونی']
  }
};

export function getIndustryRule(businessField: string): IndustryRule {
  const normalized = businessField?.toLowerCase() || 'general';
  
  if (industryRules[normalized]) {
    return industryRules[normalized];
  }

  // Fallback to a safe general/default rule
  return {
    requiredAttributes: [
      { name: 'جنس', type: 'text', required: true },
      { name: 'ابعاد', type: 'text', required: false }
    ],
    defaultCategories: [
      { name: 'محصولات پرفروش', slug: 'best-sellers', description: 'محبوب‌ترین محصولات فروشگاه ما' },
      { name: 'جدیدترین‌ها', slug: 'new-arrivals', description: 'جدیدترین محصولات اضافه شده به فروشگاه' }
    ],
    priceRange: { min: 100000, max: 2000000 },
    stockRange: { min: 5, max: 100 },
    variantTypes: ['رنگ', 'سایز'],
    imageSearchHints: ['minimal product photography on white background', 'ecommerce product flatlay'],
    blogTopicHints: [
      'راهنمای جامع خرید آنلاین و انتخاب بهترین محصول متناسب با نیاز شما',
      'چگونه از خریدهای اینترنتی خود بهترین مراقبت را به عمل آوریم؟'
    ],
    seoKeywordHints: ['خرید آنلاین کالا', 'فروشگاه اینترنتی معتبر', 'بهترین قیمت محصول'],
    unsafeOrRestrictedExamples: ['کالاهای غیرمجاز و قاچاق', 'سلاح و اقلام خطرناک']
  };
}
