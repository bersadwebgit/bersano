// [AI-OPTIMIZED] — caching, selective context, retry added
// [HARDENED] — validation, error isolation, save safety
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { getAiModel } from '@/lib/ai-model-resolver';

interface AiStoriesResponse {
  success: boolean;
  explanation?: string;
  actions?: any[];
  warnings?: string[];
}

async function searchPexelsImage(query: string, apiKey?: string): Promise<string | null> {
  if (apiKey) {
    try {
      const cleanQuery = query.replace(/[_-]/g, ' ');
      const encodedQuery = encodeURIComponent(cleanQuery);
      const url = `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const photos = data.photos || [];
        if (photos.length > 0) {
          const index = Math.min(Math.floor(Math.random() * photos.length), photos.length - 1);
          const photo = photos[index];
          return photo.src?.portrait || photo.src?.large || photo.src?.original || null;
        }
      }
    } catch (error) {
      console.error('Error searching Pexels API:', error);
    }
  }
  return null;
}

async function searchWikimediaImage(query: string): Promise<string | null> {
  try {
    const cleanQuery = query.replace(/[_-]/g, ' ');
    const encodedQuery = encodeURIComponent(cleanQuery);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&srnamespace=6&format=json&srlimit=3`;
    const response = await fetch(searchUrl);
    if (!response.ok) return null;
    const searchData = await response.json();
    const results = searchData.query?.search || [];
    
    if (results.length > 0) {
      const item = results[Math.floor(Math.random() * results.length)];
      const title = item.title;
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
      const infoRes = await fetch(infoUrl);
      if (!infoRes.ok) return null;
      const infoData = await infoRes.json();
      const pages = infoData.query?.pages || {};
      const pageId = Object.keys(pages)[0];
      const imageInfo = pages[pageId]?.imageinfo || [];
      if (imageInfo.length > 0) {
        return imageInfo[0].url;
      }
    }
  } catch (err) {
    console.error('Wikimedia search error:', err);
  }
  return null;
}

async function searchUnsplashImage(query: string): Promise<string | null> {
  return searchWikimediaImage(query);
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده حرفه‌ای برای ساخت و مدیریت استوری‌ها (Stories) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که دستور (پرامپت) کاربر را دریافت کرده و بر اساس آن، لیستی از اقدامات (ساخت، ویرایش یا حذف استوری) روی استوری‌های فروشگاه انجام دهی.

برای این کار، تو اطلاعات زیر را دریافت می‌کنی:
1. دستور کاربر (Prompt)
2. استوری‌های فعلی فروشگاه (Current Stories)
3. محصولات موجود فروشگاه (Available Products) - شامل شناسه، عنوان، قیمت، قیمت تخفیف خورده، تصویر اصلی و گالری تصاویر (توجه بسیار مهم: این لیست بر اساس زمان ساخت از جدیدترین به قدیمی‌ترین مرتب شده است؛ بنابراین مفاهیمی مثل "آخرین محصول"، "جدیدترین محصول" یا "محصول جدید" دقیقاً به اولین محصول در بالای این لیست اشاره دارد).
4. مقالات/پست‌های وبلاگ موجود فروشگاه (Available Blog Posts) - شامل شناسه، عنوان، اسلاگ، تصویر شاخص و خلاصه مطلب (توجه: این لیست نیز از جدیدترین به قدیمی‌ترین مرتب شده است).

مبنای زمانی امروز: Wednesday, June 10, 2026 (چهارشنبه، ۲۰ خرداد ۱۴۰۵)

═══════════════════════════════════
انواع اقدامات (Actions) قابل تولید:
═══════════════════════════════════
هر اقدام در آرایه "actions" باید یکی از انواع زیر باشد:

1. ساخت استوری جدید (create):
   - اگر کاربر خواست از یک محصول استوری بسازد (مثلاً وقتی می‌گوید "برای آخرین محصول استوری درست کن" یا محصولی را بر اساس کلمات کلیدی مشخص می‌کند):
     * محصول مناسب را از لیست محصولات پیدا کن (اگر کاربر خواستار "آخرین محصول" یا "جدیدترین محصول" بود، دقیقاً اولین محصول بالای لیست را انتخاب کن).
     * title: عنوان جذاب برای استوری (می‌تواند نام محصول یا نسخه کوتاه‌شده و جذاب آن باشد).
     * mediaUrl: آدرس تصویر اصلی محصول (imageUrl). حتماً و بدون استثنا اگر محصول انتخاب‌شده دارای تصویر اصلی (imageUrl) است (حتی اگر آدرس نسبی مانند /uploads/... باشد)، باید همان مقدار دقیق imageUrl را به عنوان رسانه استوری قرار دهی و به هیچ وجه آن را به کلمات کلیدی یا عکس‌های متفرقه تغییر ندهی. فقط در صورتی که محصول فاقد هرگونه عکس باشد (imageUrl خالی یا null) مجاز هستی از کلمات کلیدی انگلیسی جستجوی عکس یا تصاویر پیش‌فرض استفاده کنی.
     * thumbnailUrl: آدرس تصویر اصلی محصول (imageUrl). طبق همان قاعده فوق‌حیاتی تصویر محصول، اگر محصول عکس دارد حتماً دقیقاً همان imageUrl را قرار بده.
     * text: یک «هوک تبلیغاتی فوق‌کوتاه» که روی تصویر محصول قرار می‌گیرد. این متن نباید روی محصول را بپوشاند، پس قانون طلایی را رعایت کن: حداکثر ۳ تا ۶ کلمه، فقط یک خط، بدون جمله بلند و بدون تکرار کامل عنوان محصول. لحن باید ضربه‌ای، احساسی و ترغیب‌کننده باشد (اصل AIDA: جلب توجه + ایجاد میل + دعوت به اقدام). از قلاب‌های فروش استفاده کن (کمیابی، فوریت، سود مشتری) مثلاً: "🔥 فقط امروز نصف قیمت!"، "⏳ تموم شد، تموم!"، "✨ پرفروش‌ترین انتخابت". اگر محصول تخفیف دارد، به‌جای متن طولانی فقط روی عددِ تخفیف یا قیمت ویژه مانور بده (مثل "۴۰٪ تخفیف ویژه"). هرگز چند جمله یا توضیح کامل ننویس؛ جزئیات و قیمت کامل کار دکمه (linkText) و صفحه محصول است.
     * linkUrl: آدرس صفحه محصول به صورت: "/product/[id]" (که [id] همان شناسه محصول است).
     * linkText: متن دکمه لینک مانند "خرید محصول" یا "مشاهده محصول".
     * category: اسلاگ دسته‌بندی محصول در صورت وجود.
     * sourceId: شناسه محصول (id) جهت ارجاع در فرانت‌اند.
     * sourceType: رشته "product".
     * duration: مدت زمان نمایش به ثانیه (پیش‌فرض 5).
     * displayLocation: محل نمایش ("both" یا "shop" یا "custom").
   
   - اگر کاربر خواست از یک مقاله/پست وبلاگ استوری بسازد:
     * مقاله مناسب را از لیست مقالات پیدا کن.
     * title: عنوان مقاله.
     * mediaUrl: تصویر شاخص مقاله (featuredImage).
     * thumbnailUrl: تصویر شاخص مقاله (featuredImage).
     * text: یک «قلاب کنجکاوی فوق‌کوتاه» روی تصویر مقاله، حداکثر ۳ تا ۶ کلمه و فقط یک خط، طوری که تصویر را نپوشاند و میل به کلیک ایجاد کند (مثلاً: "📚 این رو نمی‌دونستی!"، "۵ راز طلایی"، "قبل از خرید بخون"). جمله بلند یا توضیح کامل ننویس.
     * linkUrl: آدرس صفحه مقاله به صورت: "/blog/[slug]" (که [slug] همان اسلاگ مقاله است).
     * linkText: متن دکمه لینک مانند "مطالعه مقاله" یا "بیشتر بخوانید".
     * sourceId: شناسه مقاله (id).
     * sourceType: رشته "post".
     * duration: مدت زمان نمایش به ثانیه (پیش‌فرض 5).
     * displayLocation: محل نمایش ("both").

  - اگر کاربر خواست یک استوری عمومی بدون محصول/مقاله خاص بسازد (مثلاً استوری تبریک عید، تخفیف کلی، تخفیف به بانوان، اطلاع‌رسانی، یا بر اساس یک موضوع یا کانسپت خاص):
    * فیلدهای title، text، mediaUrl و thumbnailUrl را بر اساس درخواست کاربر بساز.
    * برای تصاویر پس‌زمینه (mediaUrl و thumbnailUrl)، حتماً یک کلمه کلیدی یا عبارت کوتاه انگلیسی کاملاً مرتبط و توصیفی با موضوع استوری (مانند "espresso-coffee" یا "makeup-beauty" یا "gold-jewelry" or "running-shoes" یا "summer-sale" یا "luxury-watch") را در فیلدهای mediaUrl و thumbnailUrl بنویس تا سیستم ما بتواند به صورت هوشمند و خودکار تصویر خیره‌کننده و بسیار مرتبطی از Pexels برای آن موضوع پیدا کند!
      همچنین می‌توانی در صورت تمایل از آدرس‌های مستقیم زیر نیز به عنوان پیش‌فرض استفاده کنی:
      - موضوع تخفیف به بانوان، آرایشی، پوشاک زنانه یا زیبایی: "https://images.pexels.com/photos/1882309/pexels-photo-1882309.jpeg" یا "https://images.pexels.com/photos/7035429/pexels-photo-7035429.jpeg"
      - موضوع حراج، تخفیف عمومی، فروش ویژه یا خرید: "https://images.pexels.com/photos/5632346/pexels-photo-5632346.jpeg" یا "https://images.pexels.com/photos/113335/pexels-photo-113335.jpeg"
      - موضوع تبریک، جشن، مناسبت‌ها یا لوکس: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
      - موضوع تکنولوژی، دیجیتال یا مدرن: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
      - موضوع عمومی، انتزاعی یا گرادینت‌های رنگی جذاب: "https://images.pexels.com/photos/5632346/pexels-photo-5632346.jpeg"
    * در این حالت فیلدهای sourceId و sourceType را ارسال نکن یا null بگذار.
    * فیلدهای linkUrl و linkText را در صورت درخواست کاربر تنظیم کن (مثلاً لینک به صفحه اصلی "/" یا صفحه فروشگاه "/shop").
    * لینک به بخش‌های صفحه اصلی (لنگرها / anchor): اگر کاربر خواست استوری به یک باکس مشخص از صفحه اصلی لینک بخورد، از این آدرس‌های دقیق استفاده کن تا صفحه به همان باکس اسکرول شود:
      - باکس «پرفروش‌ترین‌ها / پرفروش‌ها»: "/#bestsellers"
      - باکس «جدیدترین محصولات»: "/#newest"
      - باکس «پیشنهاد ویژه / محصولات تخفیف‌دار»: "/#discounts"
      - کل بخش محصولات ویژه (بدون انتخاب تب خاص): "/#featured-products"

2. ویرایش استوری موجود (update):
   - استوری مورد نظر را از لیست استوری‌های فعلی (بر اساس عنوان، ایندکس یا کلمات کلیدی) پیدا کن.
   - فیلدهایی که کاربر مایل به تغییرشان است را ویرایش کن (مثلاً تغییر متن روی استوری، تغییر مدت زمان نمایش، تغییر فعال/غیرفعال بودن، یا تغییر لینک دکمه).
   - ساختار خروجی باید شامل "id" استوری و فیلدهای تغییر یافته در شیء "data" باشد.

3. حذف استوری موجود (delete):
   - استوری مورد نظر را بر اساس عنوان، ایندکس یا کلمات کلیدی پیدا کن و "id" آن را در اقدام حذف قرار بده.

4. ایجاد کد تخفیف واقعی در سیستم (create_discount):
   - اگر کاربر در پرامپت خود به ساخت کد تخفیف، ارسال رایگان برای خرید اول، یا هر نوع تخفیف دیگری اشاره کرد، یا اگر استوری‌ای که می‌سازی نیاز به یک کد تخفیف دارد (مثلاً استوری تبلیغ کد تخفیف است)، باید علاوه بر ساخت استوری، یک اقدام از نوع create_discount نیز تولید کنی تا سیستم آن کد تخفیف واقعی را به صورت خودکار در پایگاه‌داده بسازد!
   - ساختار:
     {
       "type": "create_discount",
       "data": {
         "code": "کد تخفیف انگلیسی بزرگ (بدون فاصله و حروف خاص، مثلاً FIRSTFREE یا FREE_SHIPPING)",
         "discount": مقدار عددی تخفیف (مثلاً 100 برای درصد یا 50000 برای مبلغ ثابت),
         "type": "percentage" یا "flat" (پیش‌فرض "percentage"),
         "firstOrderOnly": true یا false (اگر برای خرید اول است، حتماً true بگذار),
         "isActive": true,
         "maxUsesPerUser": 1,
         "explanation": "توضیح فارسی کوتاه درباره این کد تخفیف"
       }
     }

═══════════════════════════════════
قوانین سئو، کیفیت و منطق (Warnings & Quality):
═══════════════════════════════════
- عدم پشتیبانی از فیلترهای غیرموجود: سیستم تخفیف‌های ما فقط فیلدهای مشخصی را در دیتابیس دارد (مانند خرید اول، حداقل مبلغ خرید، سقف تخفیف، دسته‌بندی یا محصول خاص، جنسیت و مشتری مشخص). فیلترهایی مانند «مدت زمان عضویت کاربران» (مثلاً کاربران بالای یک سال)، «تعداد خریدهای قبلی»، «محل سکونت/شهر» یا «محدودیت‌های سنی» در سیستم وجود ندارند! اگر کاربر چنین درخواست‌هایی داشت، هرگز تظاهر نکن که آن‌ها را اعمال کرده‌ای یا در توضیح (explanation) نگو که این محدودیت اعمال خواهد شد. بلکه باید:
  ۱. در بخش "warnings" و "explanation" به زبان فارسی بسیار واضح توضیح دهی که این فیلتر خاص (مثلاً فیلتر مدت زمان عضویت یا تعداد خرید) در سیستم تخفیف‌ها پشتیبانی نمی‌شود و شدنی نیست.
  ۲. کد تخفیف پیشنهادی را به صورت عمومی یا با نزدیک‌ترین فیلترهای موجود (مثلاً بدون فیلتر عضویت یا فقط برای خرید اول) بسازی.
  ۳. هرگز فیلد یا ویژگی فرضی و غیرموجود به دیتابیس اضافه نکن و در توضیحات خود کاملاً صادق و دقیق باش.
- اگر محصول یا مقاله‌ای که کاربر درخواست کرده یافت نشد، در آرایه "warnings" توضیح بده و کاربری را راهنمایی کن.
- اگر محصول فاقد عکس بود، هشدار بده که "محصول انتخابی فاقد تصویر شاخص است و ممکن است استوری خالی نمایش داده شود."
- قانون طلایی متن روی استوری (text): همیشه فوق‌کوتاه (۳ تا ۶ کلمه، یک خط)، ضربه‌ای و مارکتینگی باشد تا روی تصویر/عکس محصول را نپوشاند و خود محصول کاملاً دیده شود. متن طولانی، چندخطی یا توضیحیِ روی تصویر اکیداً ممنوع است؛ هر جزئیات بیشتری باید در دکمه (linkText) یا صفحه مقصد بیاید. از تکنیک‌های کپی‌رایتینگ فروش (فوریت، کمیابی، سود مستقیم مشتری، عدد و درصد) استفاده کن.
- قانون طلایی کلیدواژه جستجوی عکس (mediaUrl و thumbnailUrl): همیشه از کلمات کلیدی بسیار ساده، رایج، کلی و پرعکس انگلیسی استفاده کن. از عبارات طولانی، ترکیبی، تخصصی یا خاص (مانند "nurses-day" یا "nurse-celebration" یا "father-day") که ممکن است در Pexels نتیجه‌ای نداشته باشند اکیداً خودداری کن؛ زیرا در صورت نبود نتیجه، سیستم عکس‌های نامرتبط ترند (مانند لپ‌تاپ یا قهوه) را نشان خواهد داد. به عنوان مثال، برای روز پرستار فقط از کلمه کلیدی عمومی "nurse" یا "hospital" یا "medical" استفاده کن. برای روز پدر از "father" یا "man-gift"، برای روز مادر از "mother" یا "flowers"، برای شب یلدا از "pomegranate" یا "watermelon" استفاده کن.

═══════════════════════════════════
فرمت خروجی (کاملاً معتبر و بدون متن اضافی):
═══════════════════════════════════
تو باید دقیقاً یک شیء JSON با ساختار زیر بازگردانی. هیچ توضیحی قبل یا بعد از JSON نباید باشد:

{
  "success": true,
  "explanation": "توضیحات فارسی روان و دقیق از کارهایی که قرار است انجام شود...",
  "warnings": [
    "هشدار ۱ در صورت لزوم...",
    "هشدار ۲ در صورت لزوم..."
  ],
  "actions": [
    {
      "type": "create",
      "sourceId": "شناسه محصول یا مقاله جهت گالری تصاویر در فرانت",
      "sourceType": "product یا post",
      "data": {
        "title": "عنوان استوری",
        "duration": 5,
        "mediaUrl": "آدرس رسانه اصلی",
        "thumbnailUrl": "آدرس کاور",
        "text": "متن روی استوری",
        "linkUrl": "لینک دکمه",
        "linkText": "متن دکمه",
        "category": "دسته‌بندی",
        "displayLocation": "both"
      }
    },
    {
      "type": "update",
      "id": "شناسه استوری که باید ویرایش شود",
      "sourceId": "شناسه محصول/پست در صورت وجود",
      "sourceType": "product یا post در صورت وجود",
      "data": {
        "text": "متن جدید استوری",
        "linkUrl": "/product/some-id"
      }
    },
    {
      "type": "delete",
      "id": "شناسه استوری که باید حذف شود"
    },
    {
      "type": "create_discount",
      "data": {
        "code": "FIRSTFREE",
        "discount": 100,
        "type": "percentage",
        "firstOrderOnly": true,
        "isActive": true,
        "maxUsesPerUser": 1,
        "explanation": "کد تخفیف ۱۰۰٪ برای اولین خرید (ارسال رایگان)"
      }
    }
  ]
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
    const { prompt, stories } = body;

    const basicValidation = validateAiRequest(prompt ?? '');
    if (!basicValidation.valid) {
      return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
    }

    // Fetch Products and Blog Posts of this shop (highly optimized selecting only necessary fields)
    const [products, posts, settings] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, isActive: true },
        select: {
          id: true,
          title: true,
          price: true,
          discount: true,
          imageUrl: true,
          galleryUrls: true,
          isSpecial: true,
          specialEndsAt: true,
          category: {
            select: {
              slug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.blogPost.findMany({
        where: { shopId, status: 'published' },
        select: {
          id: true,
          title: true,
          slug: true,
          featuredImage: true,
          summary: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model', 'pexels_api_key']
          }
        }
      })
    ]);

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = await getAiModel('simple', shopId);

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled: settingsMap.get('ai_enabled') !== 'false',
      hasApiKey: !!apiKey,
    });
    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    // Format products and posts for prompt to minimize tokens
    const formattedProducts = products.map(p => {
      let gallery: string[] = [];
      if (p.galleryUrls) {
        try {
          gallery = JSON.parse(p.galleryUrls);
        } catch (e) {
          gallery = [];
        }
      }
      return {
        id: p.id,
        title: p.title,
        price: p.price,
        discount: p.discount || 0,
        imageUrl: p.imageUrl,
        galleryUrls: gallery,
        categorySlug: p.category?.slug || null
      };
    });

    const formattedPosts = posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      featuredImage: p.featuredImage,
      summary: p.summary
    }));

    const dynamicContext = `استوری‌های فعلی:
${JSON.stringify(stories.map((s: any) => ({
  id: s.id,
  title: s.title,
  text: s.text,
  linkUrl: s.linkUrl,
  linkText: s.linkText,
  duration: s.duration,
  isActive: s.isActive,
  displayLocation: s.displayLocation
})), null, 2)}

لیست محصولات دردسترس (تا ۳۰ محصول اخیر):
${JSON.stringify(formattedProducts, null, 2)}

لیست مقالات وبلاگ دردسترس (تا ۳۰ مقاله اخیر):
${JSON.stringify(formattedPosts, null, 2)}`;

    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Stories AI',
    };

    try {
      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "مبنای زمانی امروز: Wednesday, June 10, 2026 (چهارشنبه، ۲۰ خرداد ۱۴۰۵)",
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
          temperature: 0.7,
          max_tokens: 1500,
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

      const { data: parsedResult, warnings: parseWarnings } = parseAiJson<AiStoriesResponse>(
        aiText,
        ['success'],
        { success: false, explanation: 'پاسخ AI ناقص بود.', actions: [] }
      );
      
      // Post-process to resolve keywords or append Unsplash query parameters
      if (parsedResult && parsedResult.actions && Array.isArray(parsedResult.actions)) {
        for (const action of parsedResult.actions) {
          if (action.data) {
            let mediaUrl = action.data.mediaUrl;
            let thumbnailUrl = action.data.thumbnailUrl;

            // Helper to check if a string is a valid URL or local file path
            const isUrlOrFilePath = (url: string) => {
              if (!url) return false;
              const lower = url.toLowerCase();
              return (
                url.startsWith('http://') || 
                url.startsWith('https://') || 
                url.startsWith('/') || 
                url.includes('/') || 
                url.includes('\\') ||
                lower.endsWith('.jpg') || 
                lower.endsWith('.jpeg') || 
                lower.endsWith('.png') || 
                lower.endsWith('.webp') || 
                lower.endsWith('.gif') || 
                lower.endsWith('.svg') ||
                lower.endsWith('.mp4') ||
                lower.endsWith('.webm')
              );
            };

            // Resolve keyword/query if not a URL/path and we need an image
            if (mediaUrl && !isUrlOrFilePath(mediaUrl)) {
              const pexelsApiKey = settingsMap.get('pexels_api_key') || '';
              let searchedUrl = await searchPexelsImage(mediaUrl, pexelsApiKey);
              
              if (!searchedUrl) {
                searchedUrl = await searchUnsplashImage(mediaUrl);
              }

              if (searchedUrl) {
                mediaUrl = searchedUrl;
                thumbnailUrl = searchedUrl;
              } else {
                const fallbackImages = [
                  'https://images.pexels.com/photos/5632346/pexels-photo-5632346.jpeg', // shopping
                  'https://images.pexels.com/photos/113335/pexels-photo-113335.jpeg', // sale
                  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg', // office/work
                  'https://images.pexels.com/photos/1882309/pexels-photo-1882309.jpeg' // beauty
                ];
                const fallbackUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
                mediaUrl = fallbackUrl;
                thumbnailUrl = fallbackUrl;
              }
            }

            if (mediaUrl && mediaUrl.includes('images.pexels.com') && !mediaUrl.includes('?')) {
              mediaUrl += '?auto=compress&cs=tinysrgb&w=1080';
            }
            if (thumbnailUrl && thumbnailUrl.includes('images.pexels.com') && !thumbnailUrl.includes('?')) {
              thumbnailUrl += '?auto=compress&cs=tinysrgb&w=360';
            }

            if (mediaUrl && mediaUrl.includes('images.unsplash.com') && !mediaUrl.includes('?')) {
              mediaUrl += '?q=80&w=1080&auto=format&fit=crop';
            }
            if (thumbnailUrl && thumbnailUrl.includes('images.unsplash.com') && !thumbnailUrl.includes('?')) {
              thumbnailUrl += '?q=80&w=1080&auto=format&fit=crop';
            }

            action.data.mediaUrl = mediaUrl;
            action.data.thumbnailUrl = thumbnailUrl;
          }
        }
      }
      
      parsedResult.warnings = parseWarnings;
      return NextResponse.json(parsedResult);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ error: 'پاسخ هوش مصنوعی فرمت نامعتبر داشت.' }, { status: 502 });
    }

  } catch (error) {
    console.error('Error in Stories AI Control API:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور در پردازش درخواست.' }, { status: 500 });
  }
}
