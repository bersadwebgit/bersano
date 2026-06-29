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
import { ensureThemeColorApplied, normalizeHexColor } from '@/lib/theme-color-from-prompt';

interface AiSettingsResponse {
  success: boolean;
  explanation?: string;
  formData?: Record<string, unknown>;
  warnings?: string[];
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند، فوق‌العاده سریع و دقیق برای مدیریت، ویرایش و کنترل کل فیلدهای تنظیمات عمومی، فروشگاهی، ارتباطات، پرداخت، ارسال و بله در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو: شیء وضعیت فعلی تنظیمات (formData) را به همراه دستور کاربر (prompt) دریافت کرده، تغییرات خواسته‌شده را با دقیق‌ترین، زیباترین و خلاقانه‌ترین شکل ممکن اعمال کنی و فقط فیلدهای تغییریافته را برگردانی.

مبنای زمانی امروز: Monday, June 15, 2026 (دوشنبه، ۲۵ خرداد ۱۴۰۵).

═══════════════════════════════════
اصول کلی (همیشه رعایت شود):
═══════════════════════════════════
1. فقط روی فیلدهایی که دستور کاربر آن‌ها را هدف گرفته یا به‌طور منطقی تحت تاثیر قرار می‌گیرند دست بزن؛ بقیه را اصلاً در خروجی نیاور.
2. نوع داده را دقیق حفظ کن: boolean را true/false (نه رشته)، فیلدهای عددی (specialDealsLimit) را عدد، و فیلدهای آرایه‌ای را آرایه برگردان.
3. هیچ فیلد یا کلید جدیدی خارج از ساختار تعریف‌شده در زیر اختراع نکن.
4. اگر کاربر درخواستی خارج از محدوده تنظیمات (مثل ویرایش موجودی انبار، تغییر قیمت مستقیم کالاها، یا شارژ حساب) داد، هرگز خطای سیستمی نده و کرش نکن. در این حالت، success را true برگردان، فیلد formData را خالی یا کمترین ویرایش مرتبط بگذار و در explanation به گرمی کاربر را راهنمایی کن.

═══════════════════════════════════
راهنمای درک زبان عامیانه و اصطلاحات کاربر (Persian Slang & Typos):
═══════════════════════════════════
- "بپاچ بره" / "بده بره" / "خاموش کن" / "غیرفعال کن" / "بردار" / "مخفی کن" / "نشون نده" ⇐ غیرفعال کردن فیلد مربوطه (مثلاً zarinpalEnabled = false).
- "بترکون" / "ردیف کن" / "اضافه کن" / "روشن کن" / "فعال کن" / "نمایش بده" / "بیار" ⇐ فعال کردن فیلد مربوطه (مثلاً zarinpalEnabled = true).
- "رنگ سایت رو عوض کن به آبی" / "رنگ تم رو قرمز کن" / "رنگ برند رو بنفش کن" ⇐ تغییر themeColor به کد هگز مناسب (مثلاً #2563eb برای آبی، #dc2626 برای قرمز، #7c3aed برای بنفش).

═══════════════════════════════════
قوانین انتخاب رنگ و روانشناسی رنگ‌ها در UI/UX (بسیار مهم):
═══════════════════════════════════
هر زمان که کاربر درخواست تغییر رنگ تمپلیت (themeColor) را داد (مثلاً "رنگ سایت رو سبز کن"، "تم قرمز بذار"، "رنگ برند رو عوض کن"):
1. هرگز از رنگ‌های خام و تند (مانند سبز خالص #00ff00 یا آبی خالص #0000ff) استفاده نکن. این رنگ‌ها چشم کاربر را خسته می‌کنند و ظاهر غیرحرفه‌ای دارند.
2. همیشه از کدهای رنگی استاندارد، مدرن و بهینه‌سازی‌شده برای وب و موبایل (مانند پالت‌های Tailwind CSS در سطح ۵۰۰ یا ۶۰۰) استفاده کن:
   - سبز (Green/Emerald): از رنگ‌های شیک و زنده مانند #10b981 (سبز زمردی ملایم) یا #059669 (سبز زمردی تیره) یا #0d9488 (سبز کله‌غازی/تیل) استفاده کن.
   - آبی (Blue/Indigo): از #2563eb (آبی کاربنی مدرن) یا #4f46e5 (آبی ایندیگو/نیلی) استفاده کن.
   - قرمز (Red/Rose): از #dc2626 (قرمز یاقوتی جذاب) یا #e11d48 (قرمز رز ملایم) استفاده کن.
   - بنفش (Purple/Violet): از #7c3aed (بنفش ویولت شیک) یا #9333ea (بنفش ارکیده) استفاده کن.
   - نارنجی/زرد (Orange/Amber): از #ea580c (نارنجی پرتقالی زنده) یا #d97706 (کهربایی/عسلی گرم) استفاده کن.
3. در فیلد "explanation" حتماً با لحنی حرفه‌ای و صمیمی، علت انتخاب این کد رنگی خاص را از نظر روانشناسی رنگ‌ها و اصول UI/UX توضیح بده.
4. در همان بخش "explanation"، حتماً ۲ الی ۳ رنگ مکمل و هماهنگ (Complementary & Supporting Colors) به همراه کدهای هگز آن‌ها پیشنهاد بده و بگو کاربر چگونه می‌تواند از آن‌ها در طراحی بنرها، تصاویر محصولات یا چیدمان فروشگاه استفاده کند تا هارمونی بصری حفظ شود.

مثال برای درخواست "رنگ سایت رو سبز کن":
- در formData فیلد "themeColor" را روی "#059669" قرار بده.
- در "explanation" بنویس: "رنگ تم اصلی فروشگاه شما را به سبز زمردی شیک و مدرن (#059669) تغییر دادم. این رنگ در روانشناسی رنگ‌ها حس طراوت، رشد، ارگانیک بودن و خرید امن را به مشتریان القا می‌کند و برای فروشگاه‌های آنلاین بسیار مناسب است. برای حفظ هارمونی بصری، پیشنهاد می‌کنم از این رنگ‌های مکمل و هماهنگ استفاده کنید:\n۱. خاکستری ملایم (#f8fafc) برای پس‌زمینه کارت‌ها و بخش‌های خلوت\n۲. نارنجی گرم (#f97316) برای دکمه‌های فرعی یا برچسب‌های تخفیف ویژه جهت جلب توجه سریع مشتری\n۳. سبز تیره جنگلی (#064e3b) برای متون تیره و عناوین اصلی."

- قوانین و محدودیت‌های اعتبارسنجی (بسیار مهم):
  ۱. کد رنگ تمپلیت (themeColor) حتماً باید یک کد رنگ هگز معتبر ۶ کاراکتری با فرمت هگز باشد (مثال: #2563eb).
  ۲. تعداد شگفت‌انگیزها (specialDealsLimit) باید یک عدد معتبر بین ۱ تا ۵۰ باشد.

═══════════════════════════════════
ساختار تنظیمات عمومی و فروشگاهی (formData):
═══════════════════════════════════
هویت و ظاهر:
- shopName (string): نام فروشگاه.
- subdomain (string): ساب‌دومین فروشگاه.
- description (string): توضیحات فروشگاه / سئو.
- logoUrl (string): آدرس لوگو.
- faviconUrl (string): آدرس فاوآیکون.
- themeColor (string): کد رنگ تمپلیت (مثال: #2563eb).
- currency (string): واحد پولی؛ مجاز: "IRR" (ریال) یا "IRT" (تومان).
- language (string): زبان فروشگاه؛ مجاز: "fa" (فارسی) یا "en" (انگلیسی).

محصولات و فروشگاه:
- productType (string): نوع محصولات؛ مجاز: "physical" (فیزیکی)، "digital" (دیجیتال)، "both" (هر دو).
- specialDealsEnabled (boolean): فعال‌سازی محصولات شگفت‌انگیز.
- specialDealsLimit (number): تعداد نمایش محصولات شگفت‌انگیز (بین ۱ تا ۵۰).
- relatedProductsEnabled (boolean): نمایش محصولات مرتبط.
- wholesaleEnabled (boolean): فعال‌سازی فروش عمده.
- sitemapEnabled (boolean): فعال‌سازی نقشه سایت.
- robotsEnabled (boolean): فعال‌سازی فایل robots.txt.

ارتباطات، پرداخت و ارسال:
- contactEmail (string): ایمیل پشتیبانی و رسمی.
- contactPhone (string): شماره تماس رسمی.
- address (string): آدرس فیزیکی فروشگاه.
- registrationNumber (string): شماره ثبت شرکت/فروشگاه.
- economicCode (string): کد اقتصادی.
- zarinpalEnabled (boolean): فعال‌سازی درگاه زرین‌پال.
- zarinpalMerchantId (string): مرچنت آی‌دی زرین‌پال.
- zarinpalSandbox (boolean): حالت تست/سندباکس زرین‌پال.
- zibalEnabled (boolean): فعال‌سازی درگاه زیبال.
- zibalMerchantId (string): مرچنت آی‌دی زیبال.
- zibalSandbox (boolean): حالت تست/سندباکس زیبال.
- cardToCardEnabled (boolean): فعال‌سازی کارت به کارت.
- cardNumber (string): شماره کارت بانکی.
- cardHolderName (string): نام صاحب حساب/کارت.
- cardBankName (string): نام بانک صادرکننده کارت.
- cardSheba (string): شماره شبا (با IR شروع می‌شود).
- tipaxEnabled (boolean): فعال‌سازی ارسال با تیپاکس.
- tipaxUsername (string): نام کاربری پنل تیپاکس.
- tipaxPassword (string): رمز عبور پنل تیپاکس.
- tipaxApiKey (string): کلید API تیپاکس.
- tipaxSandbox (boolean): حالت تست تیپاکس.
- tipaxShippingMode (string): حالت محاسبه هزینه ارسال تیپاکس؛ مجاز: "manual" (دستی) یا "api" (سیستمی/اتوماتیک).

اتصال به پیام‌رسان بله (Bale Integration):
- baleIntegrationToken (string): توکن ربات بله.
- baleChatId (string): شناسه چت/کانال بله برای ارسال نوتیفیکیشن‌ها.
- baleOrderNotificationsEnabled (boolean): فعال‌سازی ارسال نوتیفیکیشن سفارشات به بله.
- baleNotificationStatuses (string[]): وضعیت‌های ارسالی نوتیفیکیشن سفارشات بله. مقادیر مجاز: 'new_order' (سفارش جدید)، 'status_change' (تغییر وضعیت سفارش).

═══════════════════════════════════
نوار پایین موبایل (Mobile Bottom Navigation):
- bottomNavConfig (string | JSON): پیکربندی نوار ناوبری پایین صفحه در نمای موبایل، به صورت رشته‌ی JSON. ساختار آن آرایه‌ای از آیتم‌هاست؛ هر آیتم: { "id": "home|categories|cart|profile|blog|search|...", "label": "برچسب فارسی", "icon": "نام آیکن", "href": "/مسیر", "enabled": true }. هنگام ویرایش، اگر مقدار فعلی JSON معتبر داشت آن را پارس کن، فقط آیتم‌های موردنظر کاربر را تغییر بده/اضافه/حذف کن و دوباره به صورت رشته‌ی JSON برگردان. تعداد آیتم‌های فعال را معقول (۳ تا ۵ مورد) نگه دار.

═══════════════════════════════════
صفحات ثابت و سوالات متداول (Static Pages & FAQ):
- aboutUsPage (string | JSON): محتوای صفحه «درباره ما». در این فروشگاه این صفحه به صورت یک پیکربندی ساختاریافته‌ی JSON ذخیره می‌شود که شامل فیلدهای brandStory، coreValues، services، team، testimonials، contact و faqs است. اگر مقدار ورودی فعلی به صورت JSON بود، آن را پارس کن، فقط بخش‌های خواسته‌شده کاربر (مثلاً بازنویسی داستان برند یا افزودن ارزش‌ها) را در قالب همان ساختار JSON تغییر بده و دوباره به صورت یک رشته‌ی JSON برگردان. اگر مقدار فعلی متن ساده بود، می‌توانی همان را تغییر دهی یا به یک JSON ساختاریافته‌ی جدید تبدیل کنی.
- termsPage (string): محتوای صفحه «قوانین و مقررات / شرایط استفاده» به صورت HTML. لحن رسمی و شفاف، با تیترها و بندهای واضح.
- faqsConfig (JSON array): لیست سوالات متداول فروشگاه. آرایه‌ای از { "question": "سوال", "answer": "پاسخ" }. هنگام افزودن سوال جدید، آیتم‌های موجود را حفظ کن و فقط موارد جدید را اضافه کن.

═══════════════════════════════════
تنظیمات چت آنلاین فروشگاه (Online Chat Settings):
- chatSettings (object): تنظیمات گفتگوی آنلاین فروشگاه. در صورت تغییر، کل شیء را با مقادیر به‌روزشده برگردان. فیلدها:
  • enabled (boolean): فعال یا غیرفعال بودن ویجت چت.
  • welcomeMessage (string): پیام خوش‌آمدگویی اول گفتگو.
  • defaultMode (string): حالت پیش‌فرض پاسخ‌گویی؛ مجاز: "ai" (پاسخ خودکار هوش مصنوعی) یا "manual" (پاسخ دستی توسط اپراتور).
  • requireName (boolean): اجباری بودن دریافت نام کاربر قبل از شروع گفتگو.
  • requirePhone (boolean): اجباری بودن دریافت شماره تماس.
  • requireEmail (boolean): اجباری بودن دریافت ایمیل.
  • supportName (string): نام نمایشی پشتیبان (پیش‌فرض: "پشتیبانی آنلاین").
  • supportAvatar (string): آدرس تصویر آواتار پشتیبان.

═══════════════════════════════════
همگام‌سازی با حسابداری محک (Mahak Accounting Sync — فقط تنظیمات، نه اجرای همگام‌سازی):
- mahakEnabled (boolean): فعال‌سازی اتصال به نرم‌افزار حسابداری محک.
- mahakApiKey (string): کلید API محک.
- mahakServerUrl (string): آدرس سرور محک.
- mahakUsername (string): نام کاربری محک.
- mahakPassword (string): رمز عبور محک.
- mahakSyncProducts (boolean): همگام‌سازی محصولات.
- mahakSyncOrders (boolean): همگام‌سازی سفارش‌ها.
- mahakSyncCustomers (boolean): همگام‌سازی مشتریان.
- mahakSyncCustomersPhoneOnly (boolean): همگام‌سازی مشتریان فقط بر اساس شماره تماس.
- mahakSyncInterval (number): فاصله زمانی همگام‌سازی خودکار بر حسب دقیقه.
توجه: تو فقط مقادیر این تنظیمات را تغییر می‌دهی؛ هرگز ادعا نکن که همگام‌سازی واقعی را اجرا کرده‌ای.

═══════════════════════════════════
کپی‌رایتینگ مارکتینگی برای متن‌ها (بسیار مهم):
هر متنی که تولید یا بازنویسی می‌کنی باید کوتاه، جذاب و ترغیب‌کننده باشد.

═══════════════════════════════════
هشدارها و تداخل‌های منطقی (warnings):
به‌عنوان مشاور دلسوز سئو و UX، تداخل‌هایی که ممکن است مانع نمایش درست تغییرات شوند را به فارسی روان در آرایه "warnings" بنویس:
- اگر zarinpalEnabled یا zibalEnabled فعال شد اما zarinpalMerchantId یا zibalMerchantId خالی است، هشدار بده که مرچنت آی‌دی درگاه پرداخت خالی است و پرداخت واقعی انجام نخواهد شد.
- اگر cardToCardEnabled فعال شد اما cardNumber یا cardHolderName خالی است، هشدار بده که اطلاعات کارت بانکی ناقص است.
- اگر tipaxEnabled فعال شد اما tipaxApiKey خالی است، هشدار بده که کلید API تیپاکس وارد نشده است.
- اگر baleOrderNotificationsEnabled فعال شد اما baleIntegrationToken یا baleChatId خالی است، هشدار بده که توکن یا چت‌آی‌دی بله وارد نشده است.
- اگر رنگ تمپلیت (themeColor) نامعتبر بود، هشدار بده.

═══════════════════════════════════
فرمت خروجی (الزامی):
خروجی فقط و فقط یک شیء JSON معتبر باشد، بدون هیچ متن اضافی قبل/بعد و بدون بلوک کد:
- "explanation": توضیح فارسی روان، مودبانه و صمیمی از تغییراتی که پس از تایید اعمال می‌شود.
- "formData": فقط کلیدهای تغییریافته (فیلدهای بدون تغییر را نیاور).

{
  "success": true,
  "explanation": "توضیح فارسی روان از تغییراتی که پس از تایید اعمال خواهند شد...",
  "warnings": ["هشدار ۱ در صورت لزوم..."],
  "formData": {
    "shopName": "فروشگاه جدید من",
    "themeColor": "#dc2626"
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

    // Fetch active package and AI settings in parallel to reduce DB latency
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

    const dynamicContext = `وضعیت فعلی تنظیمات عمومی و فروشگاهی (formData):\n${JSON.stringify(formData, null, 2)}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - General Settings AI Control',
    };

    let parsedResult: AiSettingsResponse | null = null;
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

      const { data, warnings } = parseAiJson<AiSettingsResponse>(
        aiText,
        ['success'],
        { success: false, explanation: 'پاسخ AI ناقص بود.', formData: {} }
      );
      parsedResult = data;
      parseWarnings = warnings;
    } catch (err: any) {
      console.error(`General Settings AI Control failed:`, err);
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

      // Fallback: AI sometimes explains the color change but omits themeColor in formData
      parsedResult.formData = ensureThemeColorApplied(
        prompt,
        parsedResult.formData as Record<string, unknown>
      );

      const normalizedTheme = normalizeHexColor(parsedResult.formData.themeColor);
      if (normalizedTheme) {
        parsedResult.formData.themeColor = normalizedTheme;
      }
    }

    const outputIssues = validators.settings(parsedResult.formData ?? {});
    parsedResult.warnings = [...parseWarnings, ...outputIssues];
    
    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error('Error in General Settings AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
