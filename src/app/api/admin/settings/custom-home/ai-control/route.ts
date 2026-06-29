// [AI-OPTIMIZED] — caching, selective context, retry added
// [HARDENED] — validation, error isolation, save safety
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, parseOpenRouterJsonResponse, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { validators } from '@/lib/validate-ai-output';
import { getAiModel } from '@/lib/ai-model-resolver';

interface AiCustomHomeResponse {
  success: boolean;
  explanation?: string;
  formData?: Record<string, unknown>;
  warnings?: string[];
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند، فوق‌العاده سریع و دقیق برای مدیریت، ویرایش و کنترل کل فیلدهای تنظیمات «صفحه اصلی» و «لندینگ اختصاصی» در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو: شیء وضعیت فعلی تنظیمات (formData) را به همراه دستور کاربر (prompt) دریافت کرده، تغییرات خواسته‌شده را با دقیق‌ترین، زیباترین و خلاقانه‌ترین شکل ممکن اعمال کنی و فقط فیلدهای تغییریافته را برگردانی.

مبنای زمانی امروز: Monday, June 15, 2026 (دوشنبه، ۲۵ خرداد ۱۴۰۵).

═══════════════════════════════════
اصول کلی (همیشه رعایت شود):
═══════════════════════════════════
1. فقط روی فیلدهایی که دستور کاربر آن‌ها را هدف گرفته یا به‌طور منطقی تحت تاثیر قرار می‌گیرند دست بزن؛ بقیه را اصلاً در خروجی نیاور.
2. نوع داده را دقیق حفظ کن: boolean را true/false (نه رشته)، فیلدهای عددی (blogLimit, reviewsLimit) را عدد، و فیلدهای آرایه‌ای را آرایه برگردان.
3. هیچ فیلد یا کلید جدیدی خارج از ساختار تعریف‌شده در زیر اختراع نکن.
4. هنگام ویرایش یک آرایه (features, customTextBoxes, ...)، کل آرایه نهایی و کامل را برگردان (نه فقط آیتم تغییریافته)، چون آرایه به‌صورت کامل جایگزین می‌شود.
5. شناسه‌های موجود آیتم‌ها را حفظ کن؛ فقط برای آیتم تازه‌ساخته شناسه یونیک بساز.
6. اگر کاربر درخواستی خارج از محدوده تنظیمات لندینگ (مثل ویرایش موجودی انبار، تغییر قیمت مستقیم کالاها، یا شارژ حساب) داد، هرگز خطای سیستمی نده و کرش نکن. در این حالت، success را true برگردان، فیلد formData را خالی یا کمترین ویرایش مرتبط بگذار و در explanation به گرمی کاربر را راهنمایی کن و پیشنهاد بده که چگونه از طریق لندینگ (مثلاً با نوشتن شعار در هیرو) هدفش را ترویج دهد.

═══════════════════════════════════
راهنمای درک زبان عامیانه و اصطلاحات کاربر (Persian Slang & Typos):
═══════════════════════════════════
- "بپاچ بره" / "بده بره" / "خاموش کن" / "حذف کن" / "دیگه نمیخوام" / "بردار" / "مخفی کن" / "نشون نده" ⇐ غیرفعال کردن بخش مربوطه (show... = false).
- "بترکون" / "ردیف کن" / "اضافه کن" / "روشن کن" / "فعال کن" / "نمایش بده" / "بیار" / "بکار" ⇐ فعال کردن بخش مربوطه (show... = true) و پر کردن فیلدهای آن با محتوای جذاب.
- "بیار اول" / "ببر آخر" / "ببر بعد از فلان" / "بیار قبل از فلان" ⇐ تغییر ترتیب در آرایه sectionOrder.
- "فضای سایت رو صمیمی کن" / "تمپلیت رو یلدایی کن" / "کمپین عید" / "تاریک و شیک" / "مینیمال و خلوت" ⇐ تغییر همزمان هیرو، فعال‌سازی اسلایدر یا متن دلخواه با کپی‌رایتینگ تخصصی و تصاویر مناسب.

═══════════════════════════════════
کتابخانه تصاویر باکیفیت واقعی (Unsplash Library) - همیشه استفاده شود:
═══════════════════════════════════
هر زمان که کاربر درخواست افزودن بنر، اسلایدر، لوگوی برند، یا باکس متنی داد، یا در قالب کمپین‌ها نیاز به تصویر بود، حتماً از این عکس‌های واقعی و فوق‌العاده باکیفیت Unsplash متناسب با موضوع استفاده کن تا سایت نمونه جلوه شگفت‌انگیزی داشته باشد:
- مد و پوشاک عمومی: https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80 (خرید زنانه شیک)
- پوشاک و استایل مردانه: https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=800&q=80
- پوشاک و استایل زنانه: https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80
- تکنولوژی، گجت و موبایل: https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1200&q=80
- ساعت هوشمند و اکسسوری: https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80
- لپ‌تاپ و فضای کار مدرن: https://images.unsplash.com/photo-1496181130204-755241544e35?auto=format&fit=crop&w=800&q=80
- کمپین نوروز و بهار: https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1200&q=80 (سفره هفت سین و سنتی)
- کمپین یلدا و انار: https://images.unsplash.com/photo-1533630671545-e6a394be5b7a?auto=format&fit=crop&w=1200&q=80 (انار و سفره چله گرم)
- بلک فرایدی و حراج بزرگ: https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80 (نئون حراج سیاه)
- لوازم آرایشی و زیبایی: https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80
- مراقبت از پوست و آرایشی طبیعی: https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80
- مبلمان و دکوراسیون داخلی: https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80
- کتاب، لوازم تحریر و دنج: https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=800&q=80
- تخفیف، حراج عمومی و هدیه: https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80 (جعبه‌های کادو و روبان قرمز)

═══════════════════════════════════
پیاده‌سازی تم‌ها و سناریوهای رایج کاربران:
═══════════════════════════════════
- اگر کاربر گفت "سایت رو برای کمپین یلدا ردیف کن":
  * هیرو را فعال کن (showHero = true)؛ عنوان هیرو: "جشنواره انار شب چله 🍉"؛ زیرعنوان: "تا ۵۰٪ تخفیف روی گرم‌ترین محصولات پاییزی؛ همراه با ارسال رایگان و هدیه یلدایی". متن دکمه: "ورود به ضیافت یلدا". لینک: "/shop".
  * اگر مایل بودی، یک باکس متنی دلخواه (customTextBoxes) با تصویر انار یلدا بساز و به بالای sectionOrder هدایت کن.
  * هشدار یا پیشنهاد یلدایی مرتبط در warnings قرار بده.
- اگر کاربر گفت "سایت رو خیلی مینیمال و خلوت کن":
  * بخش‌های فرعی مانند stories, features, middleBanners, brands, customText, reviews را غیرفعال کن (show... = false).
  * بخش‌های اصلی مثل hero, slider, featuredProducts را فعال نگه دار.
  * sectionOrder را تمیز و خلوت مرتب کن: ['slider', 'hero', 'featuredProducts'].
- اگر کاربر گفت "یه بخش درباره ما خفن در انتهای صفحه بذار":
  * شو باکس متنی دلخواه را فعال کن (showCustomText = true).
  * به آرایه customTextBoxes یک باکس با عنوان "درباره ما"، تصویر دکوراسیون یا کتابخانه دنج، متن کوتاه و ترغیب‌کننده و دکمه "بیشتر بدانید" اضافه کن. شناسه یونیک تصادفی برای آن بساز (مانند custom-ai-987).
  * شناسه این باکس یعنی customText_custom-ai-987 را به انتهای آرایه sectionOrder اضافه کن.


- قوانین و محدودیت‌های اعتبارسنجی (بسیار مهم):
  ۱. نوع صفحه اصلی (homePageType) فقط می‌تواند 'shop' یا 'custom' باشد.
  ۲. ترتیب بخش‌ها (sectionOrder) باید به صورت یک آرایه معتبر از رشته‌ها باشد.
  ۳. تعداد مقالات در صفحه اصلی (blogLimit) باید یک عدد معتبر بین ۱ تا ۲۰ باشد.
  ۴. تعداد نظرات در صفحه اصلی (reviewsLimit) باید یک عدد معتبر بین ۱ تا ۲۰ باشد.

═══════════════════════════════════
ساختار تنظیمات صفحه اصلی (formData):
═══════════════════════════════════
کلیات صفحه:
- homePageType: نوع صفحه اصلی؛ مجاز: "shop" (نمایش مستقیم فروشگاه) یا "custom" (نمایش لندینگ اختصاصی).
- isLandingActive (boolean): آیا لندینگ اختصاصی فعال است؟
- inactiveReason (string): علت غیرفعال بودن لندینگ.
- sectionOrder (string[]): ترتیب بخش‌های صفحه. شناسه‌های مجاز:
  ['stories', 'slider', 'shoppable', 'specialDeals', 'hero', 'features', 'categoryQuickAccess', 'middleBanners', 'featuredProducts', 'blog', 'reviews', 'brands', 'customText_<id>']

بنر خوش‌آمدگویی (Hero):
- showHero (boolean), heroTitle, heroSubtitle, heroCtaText (متن دکمه), heroCtaUrl (لینک دکمه).

استوری و اسلایدر و خرید تصویری:
- showStories (boolean), showSlider (boolean), showShoppable (boolean).
- sliderDisplayLocation: محل نمایش اسلایدر؛ مجاز: "shop", "custom", "both".

دسترسی سریع دسته‌بندی‌ها:
- showCategoryQuickAccess (boolean).
- categoryQuickAccessLayout: مجاز: "row" (کاروسل ردیفی) یا "list" (شبکه‌ای).
- useSelectedCategoriesOnly (boolean).
- homeCategories: آرایه‌ای از { id, name, slug }.

ویژگی‌ها/مزایا:
- showFeatures (boolean).
- features: آرایه‌ای از { id, title, desc, icon, iconType: "lucide" }.
  * آیکون مجاز (فقط از این لیست): Truck, RotateCcw, PhoneCall, Headphones, CreditCard, ShieldCheck, Clock, Gift, Award, Heart, Sparkles, Percent, HelpCircle, Store, ShoppingBag, ThumbsUp, MapPin.

بنرهای میانی و برندها:
- showMiddleBanners (boolean), middleBanners: آرایه‌ای از { id, imageUrl, mobileImageUrl, linkUrl, isActive, order }.
- showBrands (boolean), brandsTitle, brandsSubtitle, brands: آرایه‌ای از { id, name, logoUrl }.

وبلاگ و نظرات:
- showBlog (boolean), blogTitle, blogSubtitle, blogLimit (number).
- showReviews (boolean), reviewsTitle, reviewsSubtitle, reviewsLimit (number).

باکس متنی دلخواه:
- showCustomText (boolean).
- customTextBoxes: آرایه‌ای از { id, title, content, imageUrl, imagePosition: "right"|"left", ctaText, ctaUrl, isActive }.

═══════════════════════════════════
قوانین عملیاتی:
═══════════════════════════════════
1) ترتیب بخش‌ها (sectionOrder):
   - برای جابجایی ("X رو بیار بالای Y"، "وبلاگ رو ببر آخر")، آرایه sectionOrder را بازچینش کن. شناسه‌ها همان لیست بالا هستند (مثلاً features, slider, blog).

2) فعال/غیرفعال‌سازی بخش‌ها:
   - "X رو غیرفعال کن / بردار" ⇐ showX = false. "X رو فعال کن / نشون بده" ⇐ showX = true.
   - "صفحه اصلی روی لندینگ اختصاصی" ⇐ homePageType = "custom". "روی نمایش فروشگاه" ⇐ homePageType = "shop".
   - "لندینگ رو غیرفعال کن و علتش بروزرسانی" ⇐ isLandingActive = false و inactiveReason = "بروزرسانی".

3) مدیریت لیست‌ها (features, customTextBoxes, middleBanners, brands, homeCategories):
   - افزودن: شیء جدید با شناسه یونیک رندوم بساز (مثلاً "custom-ai-" + عدد تصادفی) و به انتهای آرایه اضافه کن.
     * فقط برای customTextBoxes: شناسه بخش متناظر را به sectionOrder هم اضافه کن، با الگوی \`customText_<id>\` (مثل \`customText_custom-ai-123\`).
   - ویرایش: آیتم را بر اساس عنوان/ایندکس/کلمات کلیدی پیدا کن و فقط مقادیر خواسته‌شده را عوض کن (شناسه و بقیه فیلدها حفظ شود).
   - حذف: آیتم را از آرایه فیلتر کن؛ اگر customTextBox بود، شناسه آن (\`customText_<id>\`) را از sectionOrder هم بردار.

4) آیکون ویژگی‌ها: همیشه نزدیک‌ترین آیکون مفهومی را فقط از لیست مجاز انتخاب کن (Truck=حمل، ShieldCheck=امنیت/ضمانت، Clock=زمان، Gift=هدیه، Headphones/PhoneCall=پشتیبانی، CreditCard=پرداخت، RotateCcw=بازگشت کالا، Percent=تخفیف). هرگز آیکون خارج از لیست نگذار.

5) کپی‌رایتینگ مارکتینگی برای متن‌ها (بسیار مهم):
   هر متنی که تولید یا بازنویسی می‌کنی باید کوتاه، ضربه‌ای و ترغیب‌کننده باشد تا چیدمان را به‌هم نزند و روی تصاویر/محصول را نپوشاند. سقف‌های پیشنهادی:
   - heroTitle، عناوین بخش‌ها (brandsTitle/blogTitle/reviewsTitle) و title آیتم‌ها: حداکثر ۳ تا ۶ کلمه، یک خط، با قلاب فروش (سود مشتری، کمیابی، فوریت).
   - heroSubtitle و زیرعنوان‌ها (subtitle) و desc ویژگی‌ها: حداکثر یک جمله کوتاه (تا ~۱۲ کلمه).
   - heroCtaText و ctaText دکمه‌ها: ۱ تا ۳ کلمهٔ اقدام‌محور (مثل "همین حالا بخر"، "مشاهده تخفیف‌ها").
   - content باکس متنی دلخواه (customTextBoxes): چون کنار تصویر می‌نشیند، کوتاه و اسکن‌پذیر باشد (۱ تا ۲ جمله یا چند بولت کوتاه)؛ از پاراگراف‌های طولانی که تصویر را خفه می‌کند پرهیز کن.
   لحن کلی: روان، انسانی و ترغیب‌کننده با اصل AIDA؛ از عدد/درصد و افعال امری برای افزایش نرخ تبدیل استفاده کن. هرگز متن طولانی و توضیحی روی بخش‌های تصویری ننویس.

═══════════════════════════════════
هشدارها و تداخل‌های منطقی (warnings):
═══════════════════════════════════
به‌عنوان مشاور دلسوز سئو و UX، تداخل‌هایی که ممکن است مانع نمایش درست تغییرات شوند را به فارسی روان در آرایه "warnings" بنویس:
- اگر بخشی از لندینگ فعال شد (مثل showStories/showSlider/showHero = true) اما homePageType روی "shop" است: هشدار بده که برای دیده‌شدن، باید نوع صفحه اصلی روی «لندینگ اختصاصی» باشد.
- اگر showSlider = true ولی sliderDisplayLocation با نوع صفحه فعلی همخوان نیست (مثلاً location="custom" در حالی‌که صفحه "shop" است): هشدار متناسب بده.
- اگر isLandingActive = false اما کاربر در حال فعال‌سازی/ویرایش بخش‌های لندینگ است: هشدار بده.
- اگر blogLimit یا reviewsLimit عددی غیرمنطقی (خیلی بزرگ یا صفر/منفی) شد: هشدار بده.
- اگر برای ویژگی آیکونی خارج از لیست مجاز خواسته شد: نزدیک‌ترین جایگزین مجاز را بگذار و هشدار بده.
اگر هیچ تداخلی نبود، آرایه warnings را خالی بگذار یا اصلاً نیاور.

═══════════════════════════════════
فرمت خروجی (الزامی):
═══════════════════════════════════
خروجی فقط و فقط یک شیء JSON معتبر باشد، بدون هیچ متن اضافی قبل/بعد و بدون بلوک کد:
- "explanation": توضیح فارسی روان، مودبانه و صمیمی از تغییراتی که پس از تایید اعمال می‌شود.
- "formData": فقط کلیدهای تغییریافته (فیلدهای بدون تغییر را نیاور).

{
  "success": true,
  "explanation": "توضیح فارسی روان از تغییراتی که پس از تایید اعمال خواهند شد...",
  "warnings": ["هشدار ۱ در صورت لزوم..."],
  "formData": {
    "showHero": true,
    "heroTitle": "بهترین فروشگاه تخصصی"
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
    const { prompt, formData } = body;

    const basicValidation = validateAiRequest(prompt ?? '');
    if (!basicValidation.valid) {
      return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
    }

    if (!formData) {
      return NextResponse.json({ error: 'اطلاعات فعلی تنظیمات دریافت نشد.' }, { status: 400 });
    }

    // 1. Fetch active package and AI settings in parallel to reduce DB latency
    const [shop, settings] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        include: { package: true },
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      })
    ]);

    let shopRecord = shop;
    if (!shopRecord) {
      shopRecord = await prisma.shopSettings.create({
        data: {
          shopId,
          shopName: typeof formData.shopName === 'string' && formData.shopName.trim()
            ? formData.shopName.trim()
            : 'My Shop',
        },
        include: { package: true },
      });
    }

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    let openrouterModel = await getAiModel('simple', shopId);

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled: settingsMap.get('ai_enabled') !== 'false',
      hasApiKey: !!apiKey,
    });
    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    // Auto-correct slow/invalid/unstable models to extremely fast and stable google/gemini-2.5-flash
    const lowerModel = openrouterModel.toLowerCase();
    if (
      lowerModel.includes('gpt-oss') || 
      lowerModel.includes('gemma-4') || 
      lowerModel.includes('flash-lite') || 
      lowerModel.includes('lite') || 
      (lowerModel.includes('free') && (lowerModel.includes('llama-2') || lowerModel.includes('mistral-7b'))) ||
      !openrouterModel.trim()
    ) {
      openrouterModel = 'google/gemini-2.5-flash';
    }

    const dynamicContext = `وضعیت فعلی تنظیمات صفحه اصلی (formData):\n${JSON.stringify(formData, null, 2)}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Custom Home AI Control',
    };

    let parsedResult: AiCustomHomeResponse | null = null;
    let parseWarnings: string[] = [];
    try {
      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "مبنای زمانی امروز: Monday, June 15, 2026 (دوشنبه، ۲۵ خرداد ۱۴۰۵).",
        `مبنای زمانی امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
      );

      const openRouterResponse = await openRouterFetch(apiUrl, {
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

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        let errorMessage = `OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson?.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const responseData = await parseOpenRouterJsonResponse(openRouterResponse);

      if (responseData.error) {
        const errMsg = typeof responseData.error === 'string' 
          ? responseData.error 
          : (responseData.error.message || JSON.stringify(responseData.error));
        throw new Error(`OpenRouter Error: ${errMsg}`);
      }

      let aiText = responseData.choices?.[0]?.message?.content;

      if (!aiText) {
        throw new Error('No content returned from AI model');
      }

      const { data, warnings } = parseAiJson<AiCustomHomeResponse>(
        aiText,
        ['success'],
        { success: false, explanation: 'پاسخ AI ناقص بود.', formData: {} }
      );
      parsedResult = data;
      parseWarnings = warnings;
    } catch (err: any) {
      console.error(`Custom Home AI Control failed:`, err);
      let friendlyMessage = `کنترل هوشمند پس از چند بار تلاش ناموفق بود: ${err?.message || 'خطای ناشناخته'}`;
      if (err?.message?.includes('rate-limited') || err?.message?.includes('429')) {
        friendlyMessage = 'سرعت درخواست‌های شما بیش از حد مجاز است یا مدل انتخابی موقتاً با ترافیک بالا مواجه شده است. لطفاً چند لحظه دیگر دوباره تلاش کنید.';
      } else if (err?.message?.includes('API key')) {
        friendlyMessage = 'کلید API هوش مصنوعی نامعتبر یا منقضی شده است. لطفاً تنظیمات سیستم را بررسی کنید.';
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 502 });
    }

    // Merge changes with original formData to return the full set of values to the frontend
    if (parsedResult.success) {
      if (!parsedResult.formData) {
        parsedResult.formData = {};
      }
      parsedResult.formData = { ...formData, ...parsedResult.formData };
    }

    const outputIssues = validators.customHome(parsedResult.formData ?? {});
    parsedResult.warnings = [...parseWarnings, ...outputIssues];
    
    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error('Error in Custom Home AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
