import { prisma } from '@/lib/prisma';
import { callAiGateway } from '@/lib/ai-gateway';
import { getSeedImage } from './image-queries';
import { embedProduct } from '@/lib/product-embedding';
import { getIndustryRule } from './industry-rules';
import { Invalidate } from '@/lib/invalidate';
import { generateMinimalImage } from '@/lib/minimal-image';

export interface QuickSeedInput {
  shopId: string;
  shopName: string;
  ownerName: string;
  ownerJob: string;
  businessField: string;
  brandVibe: string;
}

export interface QuickSeedData {
  category: {
    name: string;
    slug: string;
  };
  product: {
    title: string;
    shortDescription: string;
    description: string;
    price: number;
    compareAtPrice: number;
    stock: number;
    imageSearchQueryEn: string;
    imageAltFa: string;
  };
  slider: {
    title: string;
    subtitle: string;
    imageSearchQueryEn: string;
    imageAltFa: string;
  };
  story: {
    title: string;
    text: string;
    imageSearchQueryEn: string;
    imageAltFa: string;
  };
}

const QUICK_SEED_SYSTEM_PROMPT = `You are an expert ecommerce content generator for Persian/Iranian online stores.

Your job is to generate a highly personalized, single product, a single homepage slider, and a single circular story for a newly registered merchant.
The merchant has provided their name, their specific job/occupation, the name of their store, the industry field, and the brand vibe.

CRITICAL RULES FOR PRODUCT TITLE:
1. Do NOT use the owner’s personal full name directly inside the product title (e.g., do NOT generate "کابل شارژر علی تاجیک").
2. Do NOT create awkward titles by combining owner name + store name directly (e.g., do NOT generate "کابل شارژر فوق سریع علی تاجیک - مخصوص موبایل علی").
3. The product must feel like a real, professional product related to the shop topic/niche.
4. The main priority is the shop topic/niche (e.g., "کابل شارژ سریع Type-C مدل بافته‌شده ۱۲۰ وات" or "قهوه اسپرسو بلند اختصاصی با رست متوسط").
5. The store name can be used subtly and naturally if needed, but the product title must look like a real ecommerce product, not a template.
6. You MUST append " (محصول نمونه)" to the end of the product title (e.g., "کابل شارژ سریع Type-C مدل بافته‌شده ۱۲۰ وات (محصول نمونه)" or "قهوه اسپرسو بلند اختصاصی با رست متوسط (محصول نمونه)"). This is extremely important so the merchant understands it is a demo product.

CRITICAL RULES FOR STORY:
1. The story title MUST be exactly "محصول نمونه" or "محصول تستی" (Persian for sample product/test product).
2. The story text MUST clearly indicate that this is a demo/test product created automatically for showcase purposes (e.g., include "(این یک محصول نمونه و تستی برای نمایش دمو است)" at the end).

You MUST return a valid JSON object matching this structure:
{
  "category": {
    "name": "Category Name in Persian (e.g. لوازم جانبی موبایل)",
    "slug": "english-slug-only-lowercase-and-hyphens"
  },
  "product": {
    "title": "Real-looking Product Title in Persian with (محصول نمونه) at the end (e.g. کابل شارژ سریع Type-C مدل بافته‌شده ۱۲۰ وات (محصول نمونه))",
    "shortDescription": "Persian short description highlighting the product features",
    "description": "Persian full description (at least 2 paragraphs, highly engaging, professional, explaining the product's quality, materials, and features)",
    "price": 250000, // Integer in Toman (IRT), realistic for the industry
    "compareAtPrice": 290000, // Integer in Toman (higher than price, or 0 if no discount)
    "stock": 50, // Integer
    "imageSearchQueryEn": "Specific English query for the product style (e.g. premium braided usb-c cable)",
    "imageAltFa": "Persian image alt text"
  },
  "slider": {
    "title": "Promotional Slider Title in Persian (celebrating the launch of the store or showcasing the curation)",
    "subtitle": "Slider Subtitle in Persian (compelling call to action or brand promise)",
    "imageSearchQueryEn": "Specific English query for the slider style (e.g. modern tech accessories setup)",
    "imageAltFa": "Persian image alt text"
  },
  "story": {
    "title": "محصول نمونه", // MUST be exactly "محصول نمونه" or "محصول تستی"
    "text": "Short personal greeting or behind-the-scenes text in Persian from the merchant to their customers (max 2 sentences), ending with a clear label that this is a demo/test product (e.g. [این یک محصول نمونه و تستی برای نمایش دمو است]).",
    "imageSearchQueryEn": "Specific English query for the story style (e.g. smiling barista holding coffee cup)",
    "imageAltFa": "Persian image alt text"
  }
}

Return ONLY the raw JSON object. Do not include markdown fences or explanations.`;

/**
 * Generates personalized quick seed data using AI, with a robust local fallback.
 */
export async function generateQuickSeedData(input: QuickSeedInput): Promise<QuickSeedData> {
  const { shopId, shopName, ownerName, ownerJob, businessField, brandVibe } = input;

  const rule = getIndustryRule(businessField);
  const defaultCategory = rule.defaultCategories[0] || { name: 'محصولات ویژه', slug: 'featured' };

  // 1. Build Fallback Data
  const fallbackData: QuickSeedData = getLocalFallbackData(input, defaultCategory);

  const userPrompt = `Generate personalized quick seed data for this newly registered merchant:
- Owner Name: "${ownerName}"
- Owner Job/Occupation: "${ownerJob}"
- Shop Name: "${shopName}"
- Industry Field: "${businessField}"
- Brand Vibe: "${brandVibe}"

Please connect the owner's expertise ("${ownerJob}") and name ("${ownerName}") to the signature product, slider, and story. Make it feel highly customized and professional.`;

  try {
    console.log(`[QUICK SEED] AI generation started for shopId: ${shopId}`);
    const result = await callAiGateway<QuickSeedData>({
      shopId,
      endpoint: '/api/admin/onboarding/seed/quick-seed',
      slot: 'simple',
      messages: [
        { role: 'system', content: QUICK_SEED_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      mode: 'json',
      temperature: 0.3,
      maxTokens: 1500,
      requiredFields: ['category', 'product', 'slider', 'story'],
      fallbackValue: fallbackData,
      skipQuotaCheck: true
    });

    if (result.success && result.data) {
      console.log(`[QUICK SEED] AI generation success for shopId: ${shopId}`);
      return result.data;
    }
  } catch (error) {
    console.error('[generateQuickSeedData] AI generation failed, using local fallback:', error);
  }

  console.log(`[QUICK SEED] fallback used for shopId: ${shopId}`);
  return fallbackData;
}

/**
 * Local fallback generator based on industry field.
 */
function getLocalFallbackData(input: QuickSeedInput, defaultCategory: { name: string; slug: string }): QuickSeedData {
  const { shopName, ownerName, ownerJob, businessField } = input;

  const price = 280000;
  const compareAtPrice = 340000;

  const demoStoryText = `این یک داستان نمونه برای نمایش در نسخه دموی فروشگاه شماست. پس از ورود به پنل مدیریت، می‌توانید استوری‌های واقعی خود را بسازید.\n\n(این یک محصول نمونه و تستی برای نمایش دمو است)`;

  switch (businessField) {
    case 'apparel':
      return {
        category: { name: 'کالکشن اختصاصی', slug: 'exclusive-collection' },
        product: {
          title: 'شومیز مینی‌مال یقه قایقی مدل کالکشن پاییزه',
          shortDescription: 'کالکشن پاییزه اختصاصی با پارچه لینن درجه یک و دوخت تمام دست‌دوز.',
          description: `این شومیز مینی‌مال با طراحی ارگونومیک و استفاده از بهترین پارچه‌های ضدحساسیت، راحتی و شیک‌پوشی را هم‌زمان به شما هدیه می‌دهد.\n\nهر دوخت با دقت فراوان انجام شده و تضمین ثبات رنگ و کیفیت پارچه پس از شستشو را به همراه دارد. انتخابی عالی برای استایل‌های روزمره و نیمه‌رسمی.`,
          price,
          compareAtPrice,
          stock: 35,
          imageSearchQueryEn: 'linen shirt cream color minimal aesthetic',
          imageAltFa: 'شومیز مینی‌مال یقه قایقی'
        },
        slider: {
          title: 'رونمایی از کالکشن جدید پاییزه',
          subtitle: `هنر، ظرافت و تخصص در تار و پود پوشاک فروشگاه ${shopName}`,
          imageSearchQueryEn: 'women coat aesthetic minimal clothing rack',
          imageAltFa: `بنر کالکشن جدید ${shopName}`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling fashion designer woman in workshop',
          imageAltFa: 'داستان محصول نمونه'
        }
      };

    case 'beauty':
      return {
        category: { name: 'مراقبت تخصصی', slug: 'special-care' },
        product: {
          title: 'سرم آبرسان هیالورونیک اسید ۲٪ مناسب انواع پوست',
          shortDescription: 'فرمولاسیون پیشرفته آبرسانی عمیق پوست با هیالورونیک اسید ارگانیک.',
          description: `این سرم آبرسان با نفوذ به لایه‌های عمیق اپیدرم، رطوبت مورد نیاز پوست شما را به مدت ۲۴ ساعت تامین کرده و خطوط ریز ناشی از خشکی را بهبود می‌بخشد.\n\nفاقد پارابن، الکل و مواد شیمیایی مضر، کاملاً ارگانیک و سازگار با حساس‌ترین پوست‌ها. توصیه شده برای روتین روزانه مراقبت از پوست.`,
          price,
          compareAtPrice,
          stock: 40,
          imageSearchQueryEn: 'skincare serum bottle minimal aesthetic',
          imageAltFa: 'سرم آبرسان هیالورونیک اسید'
        },
        slider: {
          title: 'رازهای شادابی و درخشندگی پوست شما',
          subtitle: `مشاوره تخصصی و محصولات ارگانیک مراقبت پوست در فروشگاه ${shopName}`,
          imageSearchQueryEn: 'cosmetic cream jar aesthetic on warm background',
          imageAltFa: `بنر مراقبت پوست ${shopName}`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling aesthetician woman skincare expert',
          imageAltFa: 'داستان محصول نمونه'
        }
      };

    case 'digital':
      return {
        category: { name: 'لوازم جانبی هوشمند', slug: 'smart-accessories' },
        product: {
          title: 'هندزفری بلوتوثی مینی‌مال با حذف نویز فعال',
          shortDescription: 'کیفیت صدای بی‌نظیر با حذف نویز فعال (ANC) و کیس شارژ هوشمند.',
          description: `این هندزفری بلوتوثی پیشرفته با بهره‌گیری از آخرین نسخه بلوتوث و درایورهای داینامیک، صدایی شفاف و بیس عمیق را به گوش شما می‌رساند.\n\nدارای کیس شارژ هوشمند با شارژدهی تا ۳۰ ساعت و مقاومت در برابر تعریق و رطوبت، انتخابی عالی برای ورزش و مکالمات روزمره.`,
          price: 450000,
          compareAtPrice: 590000,
          stock: 25,
          imageSearchQueryEn: 'wireless headphones minimal product photo',
          imageAltFa: 'هندزفری بلوتوثی مینی‌مال'
        },
        slider: {
          title: 'تکنولوژی روز دنیا در دستان شما',
          subtitle: `ضمانت اصالت، گارانتی معتبر و تست تخصصی لوازم جانبی در ${shopName}`,
          imageSearchQueryEn: 'smart watch black on white background modern gadget',
          imageAltFa: `بنر تکنولوژی ${shopName}`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling tech guy engineer working with electronics',
          imageAltFa: 'داستان محصول نمونه'
        }
      };

    case 'education':
      return {
        category: { name: 'دوره‌های آموزشی', slug: 'courses' },
        product: {
          title: 'دوره جامع آموزش توسعه وب‌سایت و فرانت‌اند',
          shortDescription: 'یادگیری صفر تا صد مهارت‌های کاربردی فرانت‌اند مناسب ورود سریع به بازار کار.',
          description: `این دوره آموزشی جامع شامل تمام تکنیک‌ها، ترفندها و مسیرهای موفقیت در حوزه توسعه وب به زبان ساده و کاملاً پروژه‌محور است.\n\nبه همراه پشتیبانی دائم، آپدیت‌های رایگان دوره‌ای و فایل‌های تمرینی اختصاصی برای ورود سریع به بازار کار و کسب درآمد دلاری و ریالی.`,
          price: 350000,
          compareAtPrice: 490000,
          stock: 999,
          imageSearchQueryEn: 'online education concept flatlay open book laptop',
          imageAltFa: 'دوره آموزشی توسعه وب'
        },
        slider: {
          title: 'آموزش تخصصی و مهارت‌محور برای بازار کار',
          subtitle: `مسیر حرفه‌ای شدن و ارتقای شغلی با آکادمی تخصصی ${shopName}`,
          imageSearchQueryEn: 'smiling teacher tutor presenting online class',
          imageAltFa: `بنر آموزشی ${shopName}`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling professional instructor looking at camera',
          imageAltFa: 'داستان محصول نمونه'
        }
      };

    case 'wholesale':
      return {
        category: { name: 'فروش عمده کالا', slug: 'wholesale-pack' },
        product: {
          title: 'پک عمده کابل شارژ و آداپتور فست شارژ (بسته ۵۰ عددی)',
          shortDescription: 'تامین مستقیم با نازل‌ترین قیمت بازار همکاری و MOQ فوق‌العاده اقتصادی.',
          description: `این پک عمده ویژه برای همکاران و مغازه‌داران سراسر کشور آماده شده است. ما زنجیره تامین را کوتاه کرده‌ایم تا بالاترین حاشیه سود را برای کسب‌وکار شما تضمین کنیم.\n\nارسال سریع با باربری، تیپاکس و بسته‌بندی کاملاً ایمن و استاندارد جهت جلوگیری از هرگونه آسیب به کالا در حین حمل و نقل.`,
          price: 1200000,
          compareAtPrice: 1500000,
          stock: 15,
          imageSearchQueryEn: 'cardboard boxes in warehouse wholesale concept',
          imageAltFa: 'پک عمده کابل شارژ فست'
        },
        slider: {
          title: 'تامین عمده و بی‌واسطه محصولات دیجیتال',
          subtitle: `بهترین قیمت همکاری و MOQ اقتصادی در سامانه توزیع ${shopName}`,
          imageSearchQueryEn: 'wholesale logistics warehouse boxes shipping',
          imageAltFa: `بنر عمده فروشی ${shopName}`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling business owner man in warehouse',
          imageAltFa: 'داستان محصول نمونه'
        }
      };

    case 'coffee':
      return {
        category: { name: 'قهوه تخصصی', slug: 'specialty-coffee' },
        product: {
          title: 'قهوه اسپرسو بلند اختصاصی با رست متوسط (ترکیب ۷۰/۳۰ عربیکا)',
          shortDescription: 'ترکیبی دست‌چین شده از بهترین دانه‌های قهوه، با رست تازه و طعمی بی‌نظیر.',
          description: `این قهوه ویژه حاصل ترکیبی متعادل و دلنشین از دانه‌های عربیکا و روبوستا است. دانه‌ها از بهترین مزارع انتخاب شده‌اند و با دقت و وسواس خاصی رست داده شده‌اند تا عطر و طعم بی‌نظیری را به ارمغان بیاورند.\n\nتضمین تازگی رست و عطر فوق‌العاده، مناسب برای اسپرسو، موکاپات و فرانسه. تجربه‌ای متفاوت از نوشیدن قهوه تخصصی.`,
          price,
          compareAtPrice,
          stock: 50,
          imageSearchQueryEn: 'premium roasted coffee beans bag minimal friendly barista',
          imageAltFa: 'بسته قهوه اسپرسو بلند اختصاصی'
        },
        slider: {
          title: 'به دنیای طعم‌های اصیل و عطر قهوه خوش آمدید!',
          subtitle: `ارائه بهترین لاین‌های قهوه تخصصی و لوازم دم‌آوری در فروشگاه ${shopName}`,
          imageSearchQueryEn: 'modern coffee shop interior friendly vibe warm lighting',
          imageAltFa: `فضای داخلی کافه ${shopName} با نورپردازی گرم`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling barista holding coffee cup welcoming gesture',
          imageAltFa: 'داستان محصول نمونه'
        }
      };

    default:
      // Dynamic fallback based on ownerJob keywords to ensure it's never generic
      const job = ownerJob.toLowerCase();
      let dynamicTitle = `بسته خدمات و محصولات تخصصی حوزه ${ownerJob}`;
      let dynamicShortDesc = `ارائه خدمات و محصولات تخصصی در حوزه ${ownerJob} با ضمانت کیفیت و اصالت عالی.`;
      let dynamicFullDesc = `این بسته ویژه و تخصصی تحت نظارت مستقیم متخصصین ما طراحی و آماده‌سازی شده است. ما در فروشگاه ${shopName} متعهد هستیم که بالاترین سطح کیفیت و رضایت‌مندی را برای شما فراهم آوریم.\n\nتمامی جزئیات این محصول/خدمت با تکیه بر سال‌ها تجربه و تخصص در حوزه ${ownerJob} تنظیم شده است تا بهترین تجربه کاربری و بیشترین ارزش خرید را برای شما به ارمغان آورد.`;
      let dynamicQuery = 'premium product photography minimal aesthetic';

      if (job.includes('قهوه') || job.includes('باریستا') || job.includes('کافه') || job.includes('رستر')) {
        dynamicTitle = 'قهوه اسپرسو بلند اختصاصی با رست متوسط (ترکیب ۷۰/۳۰ عربیکا)';
        dynamicShortDesc = 'ترکیبی دست‌چین شده از بهترین دانه‌های قهوه، با رست تازه و طعمی بی‌نظیر.';
        dynamicFullDesc = 'این قهوه ویژه حاصل ترکیبی متعادل و دلنشین از دانه‌های عربیکا و روبوستا است. دانه‌ها از بهترین مزارع انتخاب شده‌اند و با دقت و وسواس خاصی رست داده شده‌اند تا عطر و طعم بی‌نظیری را به ارمغان بیاورند.\n\nتضمین تازگی رست و عطر فوق‌العاده، مناسب برای اسپرسو, موکاپات و فرانسه. تجربه‌ای متفاوت از نوشیدن قهوه تخصصی.';
        dynamicQuery = 'premium roasted coffee beans bag minimal friendly barista';
      } else if (job.includes('لباس') || job.includes('پوشاک') || job.includes('مد') || job.includes('طراح') || job.includes('مزون')) {
        dynamicTitle = 'شومیز مینی‌مال یقه قایقی مدل کالکشن پاییزه';
        dynamicShortDesc = 'کالکشن پاییزه اختصاصی با پارچه درجه یک و دوخت تمام دست‌دوز.';
        dynamicFullDesc = 'این شومیز مینی‌مال با طراحی ارگونومیک و استفاده از بهترین پارچه‌های ضدحساسیت، راحتی و شیک‌پوشی را هم‌زمان به شما هدیه می‌دهد.\n\nهر دوخت با دقت فراوان انجام شده و تضمین ثبات رنگ و کیفیت پارچه پس از شستشو را به همراه دارد. انتخابی عالی برای استایل‌های روزمره و نیمه‌رسمی.';
        dynamicQuery = 'linen shirt cream color minimal aesthetic';
      } else if (job.includes('پوست') || job.includes('آرایش') || job.includes('زیبایی') || job.includes('کرم') || job.includes('کلینیک')) {
        dynamicTitle = 'سرم آبرسان هیالورونیک اسید ۲٪ مناسب انواع پوست';
        dynamicShortDesc = 'فرمولاسیون پیشرفته آبرسانی عمیق پوست با هیالورونیک اسید ارگانیک.';
        dynamicFullDesc = 'این سرم آبرسان با نفوذ به لایه‌های عمیق اپیدرم، رطوبت مورد نیاز پوست شما را به مدت ۲۴ ساعت تامین کرده و خطوط ریز ناشی از خشکی را بهبود می‌بخشد.\n\nفاقد مواد شیمیایی مضر، کاملاً ارگانیک و سازگار با حساس‌ترین پوست‌ها. توصیه شده برای روتین روزانه مراقبت از پوست.';
        dynamicQuery = 'skincare serum bottle minimal aesthetic';
      } else if (job.includes('موبایل') || job.includes('قاب') || job.includes('شارژر') || job.includes('جانبی') || job.includes('تلفن')) {
        dynamicTitle = 'هندزفری بلوتوثی مینی‌مال با حذف نویز فعال';
        dynamicShortDesc = 'کیفیت صدای بی‌نظیر با حذف نویز فعال (ANC) و کیس شارژ هوشمند.';
        dynamicFullDesc = 'این هندزفری بلوتوثی پیشرفته با بهره‌گیری از آخرین نسخه بلوتوث و درایورهای داینامیک، صدایی شفاف و بیس عمیق را به گوش شما می‌رساند.\n\nدارای کیس شارژ هوشمند با شارژدهی بالا و مقاومت در برابر تعریق و رطوبت، انتخابی عالی برای ورزش و مکالمات روزمره.';
        dynamicQuery = 'wireless headphones minimal product photo';
      } else if (job.includes('آموزش') || job.includes('دوره') || job.includes('تدریس') || job.includes('مدرس') || job.includes('استاد')) {
        dynamicTitle = 'دوره جامع آموزش توسعه وب‌سایت و فرانت‌اند';
        dynamicShortDesc = 'یادگیری صفر تا صد مهارت‌های کاربردی فرانت‌اند مناسب ورود سریع به بازار کار.';
        dynamicFullDesc = 'این دوره آموزشی جامع شامل تمام تکنیک‌ها، ترفندها و مسیرهای موفقیت در حوزه توسعه وب به زبان ساده و کاملاً پروژه‌محور است.\n\nبه همراه پشتیبانی دائم، آپدیت‌های رایگان دوره‌ای و فایل‌های تمرینی اختصاصی برای ورود سریع به بازار کار و کسب درآمد دمو.';
        dynamicQuery = 'online education concept flatlay open book laptop';
      }

      return {
        category: { name: defaultCategory.name, slug: defaultCategory.slug },
        product: {
          title: dynamicTitle,
          shortDescription: dynamicShortDesc,
          description: dynamicFullDesc,
          price,
          compareAtPrice,
          stock: 50,
          imageSearchQueryEn: dynamicQuery,
          imageAltFa: dynamicTitle
        },
        slider: {
          title: `به دنیای محصولات و خدمات بی‌نظیر ${shopName} خوش آمدید!`,
          subtitle: `ارائه بهترین کیفیت و تجربه‌ای متفاوت در فروشگاه رسمی ${shopName}`,
          imageSearchQueryEn: 'modern store interior friendly vibe warm lighting',
          imageAltFa: `فضای داخلی فروشگاه ${shopName}`
        },
        story: {
          title: 'محصول نمونه',
          text: demoStoryText,
          imageSearchQueryEn: 'smiling business person looking at camera',
          imageAltFa: 'داستان محصول نمونه'
        }
      };
  }
}

/**
 * Saves the quick seed data to the database inside a transaction.
 */
export async function saveQuickSeedData(
  shopId: string,
  shopName: string,
  ownerName: string,
  ownerJob: string,
  businessField: string,
  brandVibe: string,
  data: QuickSeedData
) {
  console.log(`[QUICK SEED] save started for shopId: ${shopId}`);

  // Get dynamic fallback to merge with any missing AI fields
  const rule = getIndustryRule(businessField);
  const defaultCategory = rule.defaultCategories[0] || { name: 'محصولات ویژه', slug: 'featured' };
  const fallback = getLocalFallbackData({ shopId, shopName, ownerName, ownerJob, businessField, brandVibe }, defaultCategory);

  // Merge AI data with fallback data to guarantee all fields exist and are valid
  const categoryName = data?.category?.name || fallback.category.name;
  const categorySlug = data?.category?.slug || fallback.category.slug;

  let rawProductTitle = data?.product?.title || fallback.product.title;
  // Ensure the product title always ends with " (محصول نمونه)" to clearly indicate its demo purpose
  if (!rawProductTitle.includes('محصول نمونه') && !rawProductTitle.includes('محصول تستی')) {
    rawProductTitle = `${rawProductTitle} (محصول نمونه)`;
  }
  const productTitle = rawProductTitle;

  const productDesc = data?.product?.description || fallback.product.description;
  const productShortDesc = data?.product?.shortDescription || fallback.product.shortDescription;
  const productPrice = Number(data?.product?.price) || fallback.product.price;
  const productCompareAtPrice = Number(data?.product?.compareAtPrice) || fallback.product.compareAtPrice;
  const productStock = Number(data?.product?.stock) || fallback.product.stock;
  const productImageQuery = data?.product?.imageSearchQueryEn || fallback.product.imageSearchQueryEn;

  const sliderTitle = data?.slider?.title || fallback.slider.title;
  const sliderSubtitle = data?.slider?.subtitle || fallback.slider.subtitle;
  const sliderImageQuery = data?.slider?.imageSearchQueryEn || fallback.slider.imageSearchQueryEn;

  const storyTitle = data?.story?.title || fallback.story.title;
  const storyText = data?.story?.text || fallback.story.text;
  const storyImageQuery = data?.story?.imageSearchQueryEn || fallback.story.imageSearchQueryEn;

  // 1. Generate beautiful minimal SVG images locally (no external downloads)
  const themeColor = '#2563eb'; // Default brand theme color
  const productImg = generateMinimalImage(productTitle, 'product', categoryName, themeColor);
  const sliderImg = generateMinimalImage(sliderTitle, 'slider', undefined, themeColor);
  const storyImg = generateMinimalImage(storyTitle, 'story', undefined, themeColor);

  // 2. Fetch hashed password of existing admin to use for sample customer
  const adminUser = await prisma.user.findFirst({
    where: { shopId, role: 'admin' }
  });
  const hashedPassword = adminUser?.password || '$2a$10$X7mG6pXW4p9m8P5d8q6V7O'; // Fallback dummy hash

  const jobId = `quick_job_${Date.now()}`;

  let createdProductId = '';

  await prisma.$transaction(async (tx) => {
    // A. Create Category
    const createdCat = await tx.category.create({
      data: {
        shopId,
        name: categoryName,
        slug: categorySlug,
        isActive: true,
        isDemo: true,
        isSampleData: true,
        generatedByAi: true,
        seedJobId: jobId
      }
    });
    console.log(`[QUICK SEED] category created for shopId: ${shopId}`);

    // B. Create Product
    const createdProd = await tx.product.create({
      data: {
        shopId,
        title: productTitle,
        type: businessField === 'education' ? 'digital' : 'physical',
        categoryId: createdCat.id,
        description: productDesc,
        price: productPrice,
        discount: productCompareAtPrice > productPrice ? productCompareAtPrice - productPrice : 0,
        imageUrl: productImg,
        galleryUrls: JSON.stringify([productImg]),
        stock: productStock,
        brand: ownerJob,
        seoTitle: `${productTitle} | ${shopName}`,
        seoDescription: productShortDesc,
        isDemo: true,
        isSampleData: true,
        generatedByAi: true,
        seedJobId: jobId
      }
    });
    console.log(`[QUICK SEED] product created for shopId: ${shopId}`);

    createdProductId = createdProd.id;

    // C. Create Story
    await tx.story.create({
      data: {
        shopId,
        title: storyTitle,
        thumbnailUrl: storyImg,
        mediaUrl: storyImg,
        mediaType: 'image',
        text: storyText,
        linkUrl: `/products/${createdProd.id}`,
        linkText: 'مشاهده و خرید محصول',
        category: 'داستان ما',
        duration: 6,
        isActive: true,
        displayLocation: 'both',
        isDemo: true,
        expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      }
    });
    console.log(`[QUICK SEED] story created for shopId: ${shopId}`);

    // D. Create Slider
    await tx.heroSlide.create({
      data: {
        shopId,
        imageUrl: sliderImg,
        title: sliderTitle,
        subtitle: sliderSubtitle,
        linkUrl: `/products/${createdProd.id}`,
        linkText: 'خرید محصول ویژه',
        isDemo: true
      }
    });
    console.log(`[QUICK SEED] slider created for shopId: ${shopId}`);

    // E. Create Sample Customer & Review
    const sampleCustomer = await tx.user.create({
      data: {
        email: 'sample.customer@example.com',
        password: hashedPassword,
        name: 'امیرحسین رضایی',
        phone: '09121111111',
        shopId,
        role: 'customer',
        isDemo: true
      }
    });

    await tx.review.create({
      data: {
        shopId,
        productId: createdProd.id,
        userId: sampleCustomer.id,
        rating: 5,
        comment: `بسیار عالی و باکیفیت بود، دقیقاً مطابق توضیحات تخصص و هنر جناب ${ownerName}. خرید از این فروشگاه را حتماً پیشنهاد می‌کنم.`,
        status: 'approved',
        isBuyer: true,
        showOnHomepage: true,
        isDemo: true
      }
    });

    // F. Update Shop Settings & Custom Home Config
    const customFooterConfig = {
      enabled: true,
      theme: 'dark',
      bgColor: '#0f172a',
      textColor: '#f8fafc',
      linkColor: '#f8fafc',
      linkHoverColor: '#cbd5e1',
      borderColor: 'rgba(148, 163, 184, 0.15)',
      aboutText: `ما در فروشگاه ${shopName} همواره تلاش می‌کنیم تا بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت به دست شما برسانیم. رضایت شما بزرگترین سرمایه ماست.`,
      copyrightText: `تمامی حقوق مادی و معنوی این سایت متعلق به ${shopName} می‌باشد.`,
      showSocials: true,
      socials: [
        { platform: 'instagram', url: 'https://instagram.com', enabled: true },
        { platform: 'telegram', url: 'https://t.me', enabled: true },
        { platform: 'whatsapp', url: 'https://wa.me', enabled: true },
      ],
      showContactInfo: true,
      contactEmail: adminUser?.email || 'support@example.com',
      contactPhone: adminUser?.phone || '09123456789',
      contactAddress: '',
      columns: [
        {
          id: 'col-1',
          title: 'راهنمای خرید',
          links: [
            { id: 'link-1-1', label: 'نحوه ثبت سفارش', url: '/pages/how-to-order', target: '_self' },
            { id: 'link-1-2', label: 'رویه پرداخت', url: '/pages/payment-methods', target: '_self' },
            { id: 'link-1-3', label: 'شیوه‌های ارسال', url: '/pages/shipping-methods', target: '_self' },
          ],
        },
        {
          id: 'col-2',
          title: 'خدمات مشتریان',
          links: [
            { id: 'link-2-1', label: 'پاسخ به پرسش‌های متداول', url: '/faq', target: '_self' },
            { id: 'link-2-2', label: 'رویه بازگرداندن کالا', url: '/pages/returns', target: '_self' },
            { id: 'link-2-3', label: 'شرایط و قوانین', url: '/pages/terms', target: '_self' },
          ],
        },
        {
          id: 'col-3',
          title: 'دسترسی سریع',
          links: [
            { id: 'link-3-1', label: 'فروشگاه', url: '/shop', target: '_self' },
            { id: 'link-3-2', label: 'وبلاگ', url: '/blog', target: '_self' },
            { id: 'link-3-3', label: 'درباره ما', url: '/pages/about-us', target: '_self' },
            { id: 'link-3-4', label: 'تماس با ما', url: '/pages/contact-us', target: '_self' },
          ],
        },
      ],
      badges: [],
      customHtml: '',
    };

    await tx.shopSettings.update({
      where: { shopId },
      data: {
        setupWizardCompleted: true,
        hasDemoData: true,
        footerConfig: JSON.stringify(customFooterConfig),
        customHomeConfig: JSON.stringify({
          heroTitle: `به فروشگاه رسمی ${shopName} خوش آمدید`,
          heroSubtitle: `بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت از ما بخواهید.`,
          heroCtaText: 'ورود به فروشگاه',
          heroCtaUrl: '/shop',
          showStories: true,
          showSlider: true,
          showHero: true,
          showWelcomeBanner: true,
          welcomeTitle: `به فروشگاه رسمی ${shopName} خوش آمدید`,
          welcomeFeature1: 'ضمانت اصالت کالا',
          welcomeFeature2: 'پشتیبانی سریع',
          welcomeFeature3: 'ارسال به سراسر کشور',
          showCategoryQuickAccess: true,
          showReviews: true,
          showBlog: false, // Bypassing blog for quick seed
          showFeatures: true,
          showShoppable: true,
        }),
      }
    });

    // G. Create default Menu Items if not exists
    const menuItemsCount = await tx.menuItem.count({ where: { shopId } });
    if (menuItemsCount === 0) {
      await tx.menuItem.createMany({
        data: [
          { shopId, title: 'صفحه اصلی', url: '/', order: 1 },
          { shopId, title: 'فروشگاه', url: '/shop', order: 2 },
        ]
      });
    }

    // H. Create Shop Seed Profile
    await tx.shopSeedProfile.upsert({
      where: { shopId },
      create: {
        shopId,
        businessType: businessField,
        niche: ownerJob,
        targetAudience: JSON.stringify([ownerJob]),
        priceLevel: 'medium',
        brandTone: brandVibe,
        mainCategories: JSON.stringify([data.category]),
        source: 'quick_seed'
      },
      update: {
        businessType: businessField,
        niche: ownerJob,
        targetAudience: JSON.stringify([ownerJob]),
        brandTone: brandVibe,
        mainCategories: JSON.stringify([data.category]),
        source: 'quick_seed'
      }
    });

    // I. Create Shop Seed Job
    await tx.shopSeedJob.create({
      data: {
        shopId,
        status: 'saved',
        progress: 100,
        phase: 'completed'
      }
    });
  });

  // Invalidate shop cache so that storefront immediately shows the seeded data
  await Invalidate.shop(shopId).catch((err) => {
    console.error(`[QUICK SEED] Failed to invalidate cache for shopId: ${shopId}:`, err);
  });

  // 3. Trigger product embedding asynchronously (non-blocking)
  if (createdProductId) {
    embedProduct(createdProductId, shopId).catch((err) => {
      console.error('[saveQuickSeedData] Failed to embed product:', err);
    });
  }

  console.log(`[QUICK SEED] save success for shopId: ${shopId}`);
  return { success: true, createdProductId };
}
