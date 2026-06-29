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

interface AiSliderResponse {
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
          return photo.src?.landscape || photo.src?.large || photo.src?.original || null;
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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده حرفه‌ای برای ساخت و مدیریت اسلایدر اصلی (Hero Slides) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که دستور (پرامپت) کاربر را دریافت کرده و بر اساس آن، لیستی از اقدامات (ساخت، ویرایش یا حذف اسلاید) روی اسلایدر فروشگاه انجام دهی.

برای این کار، تو اطلاعات زیر را دریافت می‌کنی:
1. دستور کاربر (Prompt)
2. اسلایدهای فعلی فروشگاه (Current Slides)
3. محصولات موجود فروشگاه (Available Products) - شامل شناسه، عنوان، قیمت، تصویر اصلی و غیره. (توجه بسیار مهم: این لیست بر اساس زمان ساخت از جدیدترین به قدیمی‌ترین مرتب شده است؛ بنابراین مفاهیمی مثل "آخرین محصول"، "جدیدترین محصول" یا "محصول جدید" دقیقاً به اولین محصول در بالای این لیست اشاره دارد).
4. مقالات/پست‌های وبلاگ موجود فروشگاه (Available Blog Posts) - شامل شناسه، عنوان، اسلاگ، تصویر شاخص و خلاصه مطلب (توجه: این لیست نیز از جدیدترین به قدیمی‌ترین مرتب شده است).
5. تصویر ضمیمه شده توسط کاربر (attachedImageUrl) - در صورتی که کاربر تصویری آپلود کرده باشد، آدرس آن در این فیلد قرار دارد. در این حالت، برای اسلایدهای جدید یا ویرایش شده حتماً از این تصویر به عنوان تصویر اصلی (imageUrl) استفاده کن.

مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

═══════════════════════════════════
انواع اقدامات (Actions) قابل تولید:
═══════════════════════════════════
هر اقدام در آرایه "actions" باید یکی از انواع زیر باشد:

1. ساخت اسلاید جدید (create):
   - اگر کاربر خواست از یک محصول اسلاید بسازد (مثلاً وقتی می‌گوید "اسلاید جدید برای آخرین محصول بساز" یا محصولی را بر اساس کلمات کلیدی مشخص می‌کند):
     * محصول مناسب را از لیست محصولات پیدا کن (اگر کاربر خواستار "آخرین محصول" یا "جدیدترین محصول" بود، دقیقاً اولین محصول بالای لیست را انتخاب کن).
     * title: عنوان جذاب برای اسلاید (می‌تواند نام محصول یا نسخه کوتاه‌شده و جذاب آن باشد).
     * subtitle: یک متن کوتاه ترغیب‌کننده درباره محصول.
     * imageUrl: اگر attachedImageUrl وجود دارد، از آن استفاده کن. در غیر این صورت، از تصویر اصلی محصول (imageUrl) استفاده کن. حتماً و بدون استثنا اگر محصول انتخاب‌شده دارای تصویر اصلی (imageUrl) است، باید همان مقدار دقیق imageUrl را قرار دهی و به هیچ وجه آن را به کلمات کلیدی یا عکس‌های متفرقه تغییر ندهی. فقط در صورتی که محصول فاقد هرگونه عکس باشد مجاز هستی از کلمات کلیدی انگلیسی جستجوی عکس استفاده کنی.
     * linkUrl: آدرس صفحه محصول به صورت: "/product/[id]" (که [id] همان شناسه محصول است).
     * linkText: متن دکمه لینک مانند "خرید محصول" یا "مشاهده محصول".
     * order: شماره ترتیب اسلاید (معمولاً انتهای لیست یا بر اساس درخواست کاربر).
     * displayLocation: محل نمایش ("both" یا "shop" یا "custom").
     * isActive: فعال بودن اسلاید (true).

   - اگر کاربر خواست از یک مقاله/پست وبلاگ اسلاید بسازد:
     * مقاله مناسب را از لیست مقالات پیدا کن.
     * title: عنوان مقاله.
     * subtitle: خلاصه کوتاه مقاله.
     * imageUrl: اگر attachedImageUrl وجود دارد، از آن استفاده کن. در غیر این صورت، از تصویر شاخص مقاله (featuredImage) استفاده کن.
     * linkUrl: آدرس صفحه مقاله به صورت: "/blog/[slug]" (که [slug] همان اسلاگ مقاله است).
     * linkText: متن دکمه لینک مانند "مطالعه مقاله" یا "بیشتر بخوانید".
     * order: شماره ترتیب اسلاید.
     * displayLocation: محل نمایش ("both").

   - اگر کاربر خواست یک اسلاید عمومی بدون محصول/مقاله خاص بسازد (مثلاً اسلاید تبریک، تخفیف کلی، جشنواره، یا بر اساس یک موضوع یا کانسپت خاص):
     * فیلدهای title، subtitle، linkUrl و linkText را بر اساس درخواست کاربر بساز.
     * imageUrl: اگر attachedImageUrl وجود دارد، حتماً از آن استفاده کن. در غیر این صورت، یک کلمه کلیدی انگلیسی کاملاً مرتبط و توصیفی با موضوع اسلاید (مانند "summer-sale" یا "luxury-watch" یا "fashion-banner" یا "technology") را در فیلد imageUrl بنویس تا سیستم ما بتواند به صورت هوشمند و خودکار تصویر خیره‌کننده‌ای از Pexels برای آن موضوع پیدا کند!

2. ویرایش اسلاید موجود (update):
   - اسلاید مورد نظر را از لیست اسلایدهای فعلی (بر اساس عنوان، ایندکس یا کلمات کلیدی) پیدا کن.
   - فیلدهایی که کاربر مایل به تغییرشان است را ویرایش کن (مثلاً تغییر عنوان، زیرعنوان، فعال/غیرفعال بودن، یا تغییر تصویر).
   - اگر attachedImageUrl وجود دارد و کاربر گفته "تصویر این اسلاید را تغییر بده" یا مفهوم مشابه، حتماً imageUrl را به attachedImageUrl بروزرسانی کن.
   - ساختار خروجی باید شامل "id" اسلاید و فیلدهای تغییر یافته در شیء "data" باشد.

3. حذف اسلاید موجود (delete):
   - اسلاید مورد نظر را بر اساس عنوان، ایندکس یا کلمات کلیدی پیدا کن و "id" آن را در اقدام حذف قرار بده.

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
      "data": {
        "title": "عنوان اسلاید",
        "subtitle": "زیرعنوان اسلاید",
        "imageUrl": "آدرس تصویر دسکتاپ",
        "mobileImageUrl": "آدرس تصویر موبایل (اختیاری)",
        "linkUrl": "لینک دکمه",
        "linkText": "متن دکمه",
        "order": 0,
        "isActive": true,
        "displayLocation": "both"
      }
    },
    {
      "type": "update",
      "id": "شناسه اسلاید که باید ویرایش شود",
      "data": {
        "title": "عنوان جدید اسلاید",
        "isActive": false
      }
    },
    {
      "type": "delete",
      "id": "شناسه اسلاید که باید حذف شود"
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
    const { prompt, slides, attachedImageUrl } = body;

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
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      discount: p.discount || 0,
      imageUrl: p.imageUrl,
    }));

    const formattedPosts = posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      featuredImage: p.featuredImage,
      summary: p.summary
    }));

    const dynamicContext = `اسلایدهای فعلی فروشگاه:
${JSON.stringify(slides.map((s: any) => ({
  id: s.id,
  title: s.title,
  subtitle: s.subtitle,
  imageUrl: s.imageUrl,
  mobileImageUrl: s.mobileImageUrl,
  linkUrl: s.linkUrl,
  linkText: s.linkText,
  order: s.order,
  isActive: s.isActive,
  displayLocation: s.displayLocation
})), null, 2)}

لیست محصولات دردسترس (تا ۳۰ محصول اخیر):
${JSON.stringify(formattedProducts, null, 2)}

لیست مقالات وبلاگ دردسترس (تا ۳۰ مقاله اخیر):
${JSON.stringify(formattedPosts, null, 2)}

تصویر ضمیمه شده توسط کاربر (در صورت وجود):
${attachedImageUrl || "هیچ تصویری ضمیمه نشده است."}`;

    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Slider AI',
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

      const { data: parsedResult, warnings: parseWarnings } = parseAiJson<AiSliderResponse>(
        aiText,
        ['success'],
        { success: false, explanation: 'پاسخ AI ناقص بود.', actions: [] }
      );
      
      // Post-process to resolve keywords or append Unsplash query parameters
      if (parsedResult && parsedResult.actions && Array.isArray(parsedResult.actions)) {
        for (const action of parsedResult.actions) {
          if (action.data) {
            let imageUrl = action.data.imageUrl;

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
                lower.endsWith('.svg')
              );
            };

            // Resolve keyword/query if not a URL/path and we need an image
            if (imageUrl && !isUrlOrFilePath(imageUrl)) {
              const pexelsApiKey = settingsMap.get('pexels_api_key') || '';
              let searchedUrl = await searchPexelsImage(imageUrl, pexelsApiKey);
              
              if (!searchedUrl) {
                searchedUrl = await searchUnsplashImage(imageUrl);
              }

              if (searchedUrl) {
                imageUrl = searchedUrl;
              } else {
                const fallbackImages = [
                  'https://images.pexels.com/photos/5632346/pexels-photo-5632346.jpeg', // shopping
                  'https://images.pexels.com/photos/113335/pexels-photo-113335.jpeg', // sale
                  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg', // office/work
                  'https://images.pexels.com/photos/1882309/pexels-photo-1882309.jpeg' // beauty
                ];
                imageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
              }
            }

            if (imageUrl && imageUrl.includes('images.pexels.com') && !imageUrl.includes('?')) {
              imageUrl += '?auto=compress&cs=tinysrgb&w=1920';
            }

            if (imageUrl && imageUrl.includes('images.unsplash.com') && !imageUrl.includes('?')) {
              imageUrl += '?q=80&w=1920&auto=format&fit=crop';
            }

            action.data.imageUrl = imageUrl;
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
    console.error('Error in Slider AI Control API:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور در پردازش درخواست.' }, { status: 500 });
  }
}
