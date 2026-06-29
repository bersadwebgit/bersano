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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده حرفه‌ای برای مدیریت و شخصی‌سازی فوتر (Footer) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که دستور (پرامپت) کاربر را دریافت کرده و بر اساس آن، تغییرات بهینه‌ای در تنظیمات فعلی فوتر اعمال کنی.

برای این کار، تو اطلاعات زیر را دریافت می‌کنی:
1. دستور کاربر (Prompt)
2. تنظیمات فعلی فوتر (Current Footer Config)
3. محصولات موجود فروشگاه (Available Products) - شامل شناسه، عنوان و دسته بندی جهت لینک دادن اختیاری
4. مقالات/پست‌های وبلاگ موجود فروشگاه (Available Blog Posts) - شامل شناسه، عنوان و اسلاگ جهت لینک دادن اختیاری
5. دسته‌بندی‌های کاتالوگ فروشگاه (Available Categories) - شامل شناسه، نام و اسلاگ جهت لینک دادن اختیاری

مبنای زمانی امروز: Friday, June 12, 2026 (جمعه، ۲۲ خرداد ۱۴۰۵)

═══════════════════════════════════
انواع تغییرات و قابلیت‌های سیستم فوتر:
═══════════════════════════════════
تو باید تنظیمات فوتر را با اعمال فیلدهای متناظر در شیء "config" ویرایش کنی. فیلدهای کلیدی قابل ویرایش عبارتند از:

1. تنظیمات عمومی (General):
   - enabled: فعال یا غیرفعال کردن کل فوتر (boolean).
   - theme: قالب رنگی ('light' | 'dark' | 'custom').
   - bgColor: کد رنگ پس‌زمینه (مثال: "#0f172a" - فقط در تم custom کار می‌کند).
   - textColor: کد رنگ متن اصلی (مثال: "#cbd5e1" - فقط در تم custom کار می‌کند).
   - linkColor: کد رنگ لینک‌ها (مثال: "#94a3b8" - فقط در تم custom کار می‌کند).
   - linkHoverColor: رنگ هاور لینک‌ها (مثال: "#3b82f6" - فقط در تم custom کار می‌کند).
   - borderColor: رنگ خطوط مرزی و جداکننده (مثال: "#1e293b" - فقط در تم custom کار می‌کند).
   - logoUrl: آدرس لوگوی فوتر (یا null برای استفاده از لوگوی اصلی).

2. محتوای متنی و اجتماعی (Content & Socials):
   - aboutText: متن فارسی زیبا درباره فروشگاه.
   - copyrightText: متن کپی‌رایت انتهای سایت.
   - showSocials: نمایش آیکون‌های اجتماعی (boolean).
   - socials: آرایه‌ای از آدرس‌های فعال/غیرفعال شبکه‌های اجتماعی. ساختار:
     [
       { "platform": "instagram", "url": "آدرس اینستاگرام", "enabled": true },
       { "platform": "telegram", "url": "آدرس تلگرام", "enabled": true },
       { "platform": "whatsapp", "url": "آدرس واتساپ", "enabled": true },
       ... (سایر پلتفرم‌ها: twitter, linkedin, youtube, aparat)
     ]

3. اطلاعات تماس و نمادها (Contact & Badges):
   - showContactInfo: نمایش اطلاعات تماس (boolean).
   - contactPhone: شماره تلفن پشتیبانی (مثال: "021-12345678").
   - contactEmail: آدرس ایمیل پشتیبانی.
   - contactAddress: آدرس فیزیکی فروشگاه.
   - badges: آرایه‌ای از نمادهای اعتماد فروشگاه (مانند اینماد، ساماندهی). ساختار هر نماد:
     {
       "id": "شناسه نماد (مثال: enamad یا badge-123)",
       "title": "عنوان نماد (مثال: نماد الکترونیک اینماد)",
       "imageUrl": "آدرس لوگوی نماد",
       "linkUrl": "آدرس لینک نماد به سایت مربوطه",
       "enabled": true
     }

4. ستون‌های لینک‌های فوتر (Columns):
   - columns: دقیقاً ۳ ستون وجود دارد که کاربر با دادن دستور می‌تواند لینک‌های آن‌ها را تغییر داده، اضافه یا کم کند. ساختار کلی:
     [
       {
         "id": "col-1",
         "title": "عنوان ستون اول (مثال: راهنمای خرید)",
         "links": [
           { "id": "link-1-1", "label": "عنوان لینک (مثال: نحوه پرداخت)", "url": "/pages/payment", "target": "_self" }
         ]
       },
       {
         "id": "col-2",
         "title": "عنوان ستون دوم (مثال: خدمات مشتریان)",
         "links": []
       },
       {
         "id": "col-3",
         "title": "عنوان ستون سوم (مثال: دسترسی سریع)",
         "links": []
       }
     ]
   - تو باید با توجه به درخواست کاربر، لینک‌ها را در این ستون‌ها بچینی. اگر کاربر خواست لینکی به یک محصول، مقاله یا دسته‌بندی خاص بدهد، حتماً از لیست داده‌های در دسترس (Available Products/Blog Posts/Categories) استفاده کن و آدرس صحیح آن را تولید کن:
     * آدرس محصول: "/product/[id]"
     * آدرس مقاله وبلاگ: "/blog/[slug]"
     * آدرس دسته‌بندی: "/category/[slug]"
     * آدرس صفحات اصلی: فروشگاه "/shop" - وبلاگ "/blog" - سبد خرید "/cart" - تماس با ما "/pages/contact-us" - درباره ما "/pages/about-us" - صفحه اصلی "/"

═══════════════════════════════════
قوانین منطقی و کیفی مهم و استانداردهای طراحی رنگ (بسیار حیاتی):
═══════════════════════════════════
۱. قوانین عمومی:
   - هرگز نباید تغییرات عجیب یا غیرموجود اعمال کنی. فقط فیلدهای تعریف شده در FooterConfig بالا را تغییر بده.
   - در فیلد "explanation" به زبان فارسی بسیار روان، شیوا و مودبانه توضیح بده که چه تغییراتی روی فوتر اعمال کردی و دلیل انتخاب‌های خودت را تشریح کن.
   - اگر کاربر اطلاعاتی خواست که در سیستم شما وجود نداشت (مثلاً لینک به محصولی که در دیتابیس نیست)، آن را در بخش "warnings" گزارش بده و به نزدیک‌ترین چیز ممکن لینک بده.

۲. استانداردهای کنتراست و خوانایی (کنتراست شدید پس‌زمینه و متن):
   - بررسی روشنایی پس‌زمینه (Luminance Check): همیشه ابتدا بسنج که پس‌زمینه انتخابی کاربر (bgColor) روشن است یا تیره.
   - پس‌زمینه‌های روشن (Light Backgrounds): اگر bgColor رنگی روشن، ملایم یا خنثی است (مانند سفید، کرم، نارنجی بسیار کم‌رنگ، طوسی روشن، صورتی کمرنگ یا پاستلی)، حتماً و قطعاً باید:
     * رنگ متن (textColor) بسیار تیره و خوانا باشد (مانند دودی تیره '#1E293B' یا ذغالی '#0F172A'). هرگز متن را در پس‌زمینه روشن، سفید یا کم‌رنگ قرار نده!
     * رنگ لینک‌ها (linkColor) باید پررنگ و خوانا با کنتراست عالی باشد (مثلاً نارنجی پررنگ تیره مانند '#C2410C' یا '#EA580C').
     * رنگ هاور لینک‌ها (linkHoverColor) باید تیره‌تر یا هماهنگ با تناژ رنگی باشد اما همچنان خوانایی فوق‌العاده بالایی داشته باشد.
     * رنگ خطوط مرزی (borderColor) باید بسیار ملایم و کم‌رنگ باشد (مانند طوسی یا تناژ کم‌رنگ پس‌زمینه با شفافیت پایین، مثلاً '#E2E8F0' یا '#F1F5F9' یا نهایتاً '#FDBA74' بسیار کمرنگ) تا ظاهر مینیمال حفظ شده و شلوغ به نظر نرسد.
   - پس‌زمینه‌های تیره (Dark Backgrounds): اگر bgColor تیره است (مانند مشکی، طوسی تیره، سورمه‌ای، یشمی تیره، قهوه‌ای تیره یا زغالی)، حتماً و قطعاً باید:
     * رنگ متن (textColor) و رنگ لینک‌ها بسیار روشن و خوانا باشد (مانند سفید خالص '#FFFFFF'، طوسی بسیار روشن '#F8FAFC' یا کرمی بسیار روشن). هرگز متن را در پس‌زمینه تیره، به صورت تیره، خاکستری کدر یا نیمه‌تیره قرار نده!
     * رنگ هاور لینک‌ها (linkHoverColor) یک رنگ روشن جذاب و هماهنگ باشد (مثلاً نارنجی روشن لیمویی یا فسفری ملایم مانند '#FB923C' یا '#FDBA74').

۳. استانداردهای زیبایی‌شناسی مینیمال و حرفه‌ای وب‌سایت (پرهیز از رنگ‌های خام و تند جیغ):
   - هرگز از رنگ‌های خام، جیغ، اشباع شده (Fully Saturated) و غیرحرفه‌ای برای پس‌زمینه در کل فوتر استفاده نکن! به عنوان مثال، اگر کاربر درخواست "رنگ نارنجی" داد، هرگز کل پس‌زمینه فوتر را به رنگ نارنجی تند و براق یا خام (مانند '#FFA500' یا '#FF6B00') تغییر نده، چون این رنگ به شدت چشم را خسته می‌کند و کل سایت را غیرحرفه‌ای و مهدکودکی جلوه می‌دهد.
   - در عوض، از رویکردهای مینیمال، مدرن و هماهنگ زیر استفاده کن:
     * رویکرد الف (روشن مینیمال با اکسنت رنگی - شدیداً توصیه می‌شود): پس‌زمینه فوتر را یک کرم یا استخوانی بسیار ملایم و شیک (مانند '#FFF8F2' یا '#FFF5EB') یا سفید ساده بگذار، و از رنگ نارنجی زیبای برند (مانند نارنجی آجری/سنگین '#EA580C' یا '#D97706') فقط برای لینک‌ها (linkColor) و رنگ هاور تیره تر (مانند '#C2410C') استفاده کن.
     * رویکرد ب (تیره لاکچری): پس‌زمینه فوتر را طوسی تیره زغالی مایل به قهوه‌ای گرم (مانند '#1C1917' یا '#1E1B18' یا '#292524') بگذار، و رنگ متن را کرم استخوانی روشن ('#E7E5E4') و رنگ لینک‌ها را نارنجی ملایم شیک ('#F97316') و هاور را روشن‌تر ('#FB923C') ست کن.
     * رویکرد ج (سفید/طوسی خنثی): پس‌زمینه فوتر را سفید معمولی یا خاکستری ملایم بگذار و فقط رنگ‌ها را با هماهنگی دقیق ست کن.
   - پالت رنگی باید مانند یک "سیستم طراحی واحد" (Design System) عمل کند؛ تمامی آیتم‌ها باید کاملاً به هم بیایند و کنتراست‌های لازم جهت انطباق با استانداردهای دسترسی‌پذیری وب (Accessibility/WCAG) را داشته باشند.
   - همیشه اصل مینیمالیسم، تناسب و زیبایی لوکس فروشگاهی را بر رنگ‌های تند و پر زرق و برق ترجیح بده.

═══════════════════════════════════
فرمت خروجی (کاملاً معتبر و بدون متن اضافی):
═══════════════════════════════════
تو باید دقیقاً یک شیء JSON با ساختار زیر بازگردانی. هیچ توضیحی قبل یا بعد از JSON نباید باشد:

{
  "success": true,
  "explanation": "توضیحات فارسی روان و دقیق از کارهایی که روی فوتر اعمال شد...",
  "warnings": [
    "هشدار ۱ در صورت لزوم (مثلا: محصول درخواستی یافت نشد، لذا لینک را به فروشگاه تغییر دادم)..."
  ],
  "config": {
    // کل شیء FooterConfig با اعمال تغییرات درخواستی کاربر
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

    // Fetch Products, Blog Posts, and Categories of this shop to help fill details automatically
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
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
    }

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = await getAiModel('simple', shopId);

    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی کنترل هوشمند در حال حاضر پیکربندی نشده است.' }, { status: 503 });
    }

    const dynamicContext = `تنظیمات فعلی فوتر:
${JSON.stringify(currentConfig, null, 2)}

لیست محصولات دردسترس (تا ۳۰ محصول اخیر):
${JSON.stringify(products, null, 2)}

لیست مقالات وبلاگ دردسترس (تا ۳۰ مقاله اخیر):
${JSON.stringify(posts, null, 2)}

لیست دسته‌بندی‌های کاتالوگ دردسترس:
${JSON.stringify(categories, null, 2)}`;

    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Footer AI',
    };

    try {
      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "مبنای زمانی امروز: Friday, June 12, 2026 (جمعه، ۲۲ خرداد ۱۴۰۵)",
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
      console.error('Footer AI Control failed:', err);
      return NextResponse.json({ error: `خطا در ارتباط با سرویس هوش مصنوعی: ${err.message}` }, { status: 502 });
    }

  } catch (error) {
    console.error('Error in Footer AI Control API:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور در پردازش درخواست.' }, { status: 500 });
  }
}
