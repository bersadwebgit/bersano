// [AI-OPTIMIZED] — caching, selective context, retry added
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { getAiModel } from '@/lib/ai-model-resolver';
import { isRateLimited } from '@/lib/rate-limiter';

function cleanAndParseJson(text: string) {
  let cleaned = text.trim();
  
  const tryParse = (str: string) => {
    let cleanStr = str
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments on their own line
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // Replace smart quotes
    
    return JSON.parse(cleanStr);
  };

  try {
    return tryParse(cleaned);
  } catch (e) {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return tryParse(jsonMatch[1]);
      } catch (innerError) {}
    }
    
    const firstBracket = cleaned.indexOf('{');
    const lastBracket = cleaned.lastIndexOf('}');
    if (firstBracket !== -1 && lastBracket !== -1) {
      try {
        return tryParse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch (innerError) {}
    }
    
    console.error("Failed to parse AI response. Raw Response was:\n", text);
    throw new Error('Failed to parse AI response as JSON Object');
  }
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده حرفه‌ای برای مدیریت و شخصی‌سازی هدر (Header) و بنر اعلان بالایی (Announcement Banner) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که دستور (پرامپت) کاربر را دریافت کرده و بر اساس آن، تغییرات بهینه‌ای در تنظیمات فعلی هدر اعمال کنی.

برای این کار، تو اطلاعات زیر را دریافت می‌کنی:
1. دستور کاربر (Prompt)
2. تنظیمات فعلی هدر (Current Header Config)
3. محصولات موجود فروشگاه (Available Products) - شامل شناسه، عنوان و دسته بندی جهت لینک دادن اختیاری
4. مقالات/پست‌های وبلاگ موجود فروشگاه (Available Blog Posts) - شامل شناسه، عنوان و اسلاگ جهت لینک دادن اختیاری
5. دسته‌بندی‌های کاتالوگ فروشگاه (Available Categories) - شامل شناسه، نام و اسلاگ جهت لینک دادن اختیاری

مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

═══════════════════════════════════
انواع تغییرات و قابلیت‌های سیستم هدر:
═══════════════════════════════════
تو باید تنظیمات هدر را با اعمال فیلدهای متناظر در شیء "config" ویرایش کنی. فیلدهای کلیدی قابل ویرایش عبارتند از:

1. تنظیمات عمومی و المان‌ها (Layout):
   - showCategories: نمایش یا عدم نمایش دسته‌بندی‌ها در هدر (boolean).
   - showSearch: نمایش نوار جستجو (boolean).
   - showCart: نمایش آیکون سبد خرید (boolean).
   - showUser: نمایش آیکون حساب کاربری (boolean).
   - showBlog: نمایش منوی وبلاگ (boolean).
   - showShop: نمایش لینک مستقیم فروشگاه (boolean).
   - showAboutUs: نمایش لینک درباره ما در هدر (boolean).
   - showContactUs: نمایش لینک تماس با ما در هدر (boolean).
   - sticky: آیا هدر هنگام اسکرول چسبان باشد؟ (boolean).
   - elementsOrder: آرایه‌ای حاوی ترتیب المان‌های هدر. مثال پیش‌فرض:
     ['logo', 'categories', 'menu', 'shop', 'blog', 'about_us', 'contact_us', 'search', 'cart', 'user']

2. تنظیمات بنر اعلان بالا (banner):
   - enabled: فعال یا غیرفعال بودن بنر اعلان بالای سایت (boolean).
   - text: متن فارسی جذاب بنر اعلان (مثلاً "ارسال رایگان برای خریدهای بالای ۵۰۰ هزار تومان!"). حداکثر ۱۰۰ کاراکتر.
   - link: آدرس لینک اختیاری کلیک روی بنر (مثلاً آدرس یک دسته تخفیف خاص "/category/sale").
   - bgColor: کد رنگ پس‌زمینه بنر (مثال: "#4f46e5").
   - textColor: کد رنگ متن بنر (مثال: "#ffffff").
   - bgType: نوع پس‌زمینه ('solid' | 'gradient').
   - tagText: متن تگ متمایز کننده بنر (مثلاً "جدید" یا "خبر داغ").
   - tagBgColor: رنگ پس‌زمینه تگ.
   - tagTextColor: رنگ متن تگ.
   - underlineImportant: آیا زیر متن مهم خط کشیده شود؟ (boolean).
   - tagAnimated: آیا تگ دارای انیمیشن تپنده/پالس باشد؟ (boolean).
   - tagWithCheck: آیا آیکون چک مارک تایید در کنار تگ نمایش داده شود؟ (boolean).
   - gifUrl: آدرس یک تصویر متحرک یا گیف کوچک در بنر (اختیاری).

═══════════════════════════════════
قوانین منطقی و کیفی مهم و استانداردهای طراحی رنگ (بسیار حیاتی):
═══════════════════════════════════
۱. قوانین عمومی:
   - در فیلد "explanation" به زبان فارسی بسیار روان، شیوا و مودبانه توضیح بده که چه تغییراتی روی هدر اعمال کردی و دلیل انتخاب‌های خودت را تشریح کن.
   - اگر کاربر اطلاعاتی خواست که در سیستم شما وجود نداشت، آن را در بخش "warnings" گزارش بده.
   - آدرس لینک‌ها در صورتی که به محصول، مقاله یا دسته‌بندی خاصی اشاره دارند به درستی فرمت شوند:
     * آدرس محصول: "/product/[id]"
     * آدرس مقاله وبلاگ: "/blog/[slug]"
     * آدرس دسته‌بندی: "/category/[slug]"
     * آدرس صفحه اصلی "/"، فروشگاه "/shop"، سبد خرید "/cart"، درباره ما "/pages/about-us"، تماس با ما "/pages/contact-us".

۲. استانداردهای کنتراست و خوانایی بنر:
   - همیشه ابتدا بسنج که پس‌زمینه انتخابی بنر (bgColor) تیره است یا روشن. کنتراست متن و تگ‌ها باید به شدت بالا باشد. هرگز متن تیره را روی پس‌زمینه تیره، و متن روشن را روی پس‌زمینه روشن نگذار.

═══════════════════════════════════
فرمت خروجی (کاملاً معتبر و بدون متن اضافی):
═══════════════════════════════════
تو باید دقیقاً یک شیء JSON با ساختار زیر بازگردانی. هیچ توضیحی قبل یا بعد از JSON نباید باشد:

{
  "success": true,
  "explanation": "توضیحات فارسی روان و دقیق از کارهایی که روی هدر و بنر بالایی اعمال شد...",
  "warnings": [
    "هشدار ۱ در صورت لزوم..."
  ],
  "config": {
    // کل شیء HeaderConfig با اعمال تغییرات درخواستی کاربر
  }
}
`;

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    // Rate Limiting
    if (await isRateLimited(shopId)) {
      return NextResponse.json({
        error: "rate_limit",
        message: "سقف درخواست روزانه پر شده. لطفاً چند دقیقه صبر کنید.",
        retryAfter: 60
      }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, currentConfig } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    // Fetch Products, Blog Posts, and Categories to help automatically
    const [products, posts, categories, settings] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, isActive: true },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.blogPost.findMany({
        where: { shopId, status: 'published' },
        select: { id: true, title: true, slug: true },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.category.findMany({
        where: { shopId, isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      })
    ]);

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    if (settingsMap.get('ai_enabled') === 'false') {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر غیرفعال شده است.' }, { status: 503 });
    }

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = await getAiModel('simple', shopId);

    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی کنترل هوشمند در حال حاضر پیکربندی نشده است.' }, { status: 503 });
    }

    const dynamicContext = `تنظیمات فعلی هدر:
${JSON.stringify(currentConfig, null, 2)}

لیست محصولات دردسترس:
${JSON.stringify(products, null, 2)}

لیست مقالات وبلاگ دردسترس:
${JSON.stringify(posts, null, 2)}

لیست دسته‌بندی‌ها:
${JSON.stringify(categories, null, 2)}`;

    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Header AI',
    };

    try {
      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)",
        `مبنای زمانی امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
      );

      const response = await openRouterFetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          model: openrouterModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                {
                  type: "text",
                  text: currentSystemPrompt,
                  cache_control: { type: "ephemeral" }
                }
              ]
            },
            {
              role: "user",
              content: dynamicContext + "\n\n" + userPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({ error: `خطای سرویس هوش مصنوعی: ${errText}` }, { status: response.status });
      }

      const responseData = await response.json();
      const aiText = responseData.choices?.[0]?.message?.content;

      if (!aiText) {
        return NextResponse.json({ error: 'پاسخی از هوش مصنوعی دریافت نشد.' }, { status: 502 });
      }

      const parsedResult = cleanAndParseJson(aiText);
      return NextResponse.json(parsedResult);
    } catch (err: any) {
      console.error('Header AI Control failed:', err);
      return NextResponse.json({ error: `خطا در ارتباط با سرویس هوش مصنوعی: ${err.message}` }, { status: 502 });
    }

  } catch (error) {
    console.error('Error in Header AI Control API:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور در پردازش درخواست.' }, { status: 500 });
  }
}
