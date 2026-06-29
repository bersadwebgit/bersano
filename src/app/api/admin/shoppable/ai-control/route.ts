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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده حرفه‌ای برای ساخت و مدیریت پکیج‌های فروش تصویری تعاملی (Shoppable Images / Product Sets) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که دستور (پرامپت) کاربر را دریافت کرده و بر اساس آن، لیستی از اقدامات (ساخت، ویرایش یا حذف پکیج فروش) روی پکیج‌های فروشگاه انجام دهی.

برای این کار، تو اطلاعات زیر را دریافت می‌کنی:
1. دستور کاربر (Prompt)
2. پکیج‌های فروش فعلی فروشگاه (Current Product Sets) - شامل شناسه (id)، نام (name)، اسلاگ (slug)، تصویر اصلی (imageUrl)، وضعیت انتشار (isActive)، ترتیب (order)، درصد تخفیف (discount) و لیست آیتم‌ها/تگ‌ها (items) شامل شناسه محصول (productId) و موقعیت‌ها (x, y).
3. محصولات موجود فروشگاه (Available Products) - شامل شناسه، عنوان، قیمت، قیمت تخفیف خورده، تصویر اصلی

مبنای زمانی امروز: Wednesday, June 10, 2026 (چهارشنبه، ۲۰ خرداد ۱۴۰۵)

═══════════════════════════════════
انواع اقدامات (Actions) قابل تولید:
═══════════════════════════════════
هر اقدام در آرایه "actions" باید یکی از انواع زیر باشد:

1. ساخت پکیج فروش جدید (create):
   - name: عنوان جذاب فارسی برای پکیج فروش (مثلاً: "ست لباس اسپرت زنانه"، "دکوراسیون نشیمن مدرن").
   - slug: یک اسلاگ انگلیسی روان، کوتاه و مرتبط (مثلاً: "sport-women-set" یا "modern-living-room").
   - imageUrl: آدرس تصویر اصلی پکیج.
     * اگر کاربر خواست از یک محصول خاص پکیج بسازد، آدرس تصویر اصلی آن محصول را قرار بده.
     * اگر کاربر آدرسی نداد یا موضوعی کلی مطرح کرد، حتماً یک کلمه کلیدی یا عبارت کوتاه انگلیسی کاملاً مرتبط و توصیفی با موضوع پکیج (مانند "living-room" یا "summer-fashion" یا "dining-table" یا "running-shoes" یا "office-desk" یا "jewelry") را در فیلد imageUrl بنویس تا سیستم ما بتواند به صورت هوشمند و خودکار تصویر خیره‌کننده و بسیار مرتبطی از Pexels برای آن موضوع پیدا کند!
   - order: ترتیب نمایش (عدد صحیح، پیش‌فرض 0).
   - discount: درصد تخفیف کل پکیج (بین 0 تا 100، پیش‌فرض 0).
   - isActive: وضعیت انتشار (true یا false، پیش‌فرض true).
   - items: آرایه‌ای از محصولات تگ‌شده روی عکس. تو باید محصولات مناسب را از لیست محصولات فروشگاه بر اساس دستور کاربر پیدا کرده و موقعیت‌های x و y منطقی (بر حسب درصد از 0 تا 100) برای آن‌ها روی عکس تعیین کنی. موقعیت‌ها نباید روی هم بیافتند و باید در نقاط مختلف صفحه توزیع شوند (مثلاً محصول اول x: 30, y: 40، محصول دوم x: 70, y: 60 و غیره).
     هر آیتم به این صورت است: { "productId": "شناسه محصول", "x": 35.5, "y": 45.2 }

2. ویرایش پکیج فروش موجود (update):
   - پکیج مورد نظر را از لیست پکیج‌های فعلی (بر اساس نام، شناسه، اسلاگ یا کلمات کلیدی) پیدا کن.
   - فیلدهایی که کاربر مایل به تغییرشان است را ویرایش کن (مثلاً تغییر نام، تغییر اسلاگ، تغییر درصد تخفیف، تغییر ترتیب، فعال یا غیرفعال کردن).
   - اگر کاربر خواست محصولی را به تگ‌های پکیج اضافه کند یا حذف کند:
     * لیست تگ‌های فعلی آن پکیج را در نظر بگیر.
     * برای اضافه کردن: محصول جدید را از لیست محصولات پیدا کن، یک موقعیت x و y غیرتکراری و مناسب (مثلاً x: 50, y: 50 یا با فاصله از بقیه) به آن اختصاص بده و به آرایه items اضافه کن.
     * برای حذف کردن: آن محصول را از آرایه items فیلتر/حذف کن.
     * ساختار خروجی باید شامل "id" پکیج و فیلدهای تغییر یافته در شیء "data" باشد که فیلد "items" در "data" باید شامل **لیست کامل و نهایی تمام آیتم‌ها** پس از اعمال تغییرات (اضافه یا حذف) باشد.

3. حذف پکیج فروش موجود (delete):
   - پکیج مورد نظر را بر اساس نام، شناسه یا کلمات کلیدی پیدا کن و "id" آن را در اقدام حذف قرار بده.

═══════════════════════════════════
قوانین کیفیت و منطق (Warnings & Quality):
═══════════════════════════════════
- اگر محصولاتی که کاربر برای تگ کردن درخواست کرده یافت نشد، در آرایه "warnings" به زبان فارسی روان توضیح بده.
- اگر پکیج مورد نظر برای ویرایش یا حذف یافت نشد، در آرایه "warnings" هشدار بده.
- الکی از خودت متن‌های اضافه یا احوالپرسی تولید نکن؛ تمام توضیحات لازم را در فیلد "explanation" قرار بده. خروجی نهایی تو باید دقیقاً یک JSON معتبر باشد.

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
        "name": "عنوان پکیج",
        "slug": "english-slug",
        "imageUrl": "آدرس تصویر یا کلمه کلیدی انگلیسی برای جستجو",
        "isActive": true,
        "order": 0,
        "discount": 10,
        "items": [
          { "productId": "prod_1", "x": 30.5, "y": 45.0 },
          { "productId": "prod_2", "x": 70.0, "y": 60.5 }
        ]
      }
    },
    {
      "type": "update",
      "id": "شناسه پکیج مورد نظر",
      "data": {
        "name": "عنوان جدید",
        "discount": 15,
        "items": [
          { "productId": "prod_1", "x": 30.5, "y": 45.0 },
          { "productId": "prod_3", "x": 50.0, "y": 50.0 }
        ]
      }
    },
    {
      "type": "delete",
      "id": "شناسه پکیج مورد نظر"
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
    const { prompt, sets } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    // Fetch Products of this shop for automatic filling
    const [products, settings] = await Promise.all([
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
        take: 50
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

    if (settingsMap.get('ai_enabled') === 'false') {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
    }

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    let openrouterModel = await getAiModel('simple', shopId);

    // Auto-correct slow/invalid/unstable models to extremely fast and stable google/gemini-2.5-flash
    if (
      openrouterModel.includes('deepseek') ||
      openrouterModel.includes('gpt-3.5') ||
      openrouterModel.includes('llama-3') ||
      openrouterModel.includes('mistral') ||
      openrouterModel.includes('qwen')
    ) {
      openrouterModel = 'google/gemini-2.5-flash';
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی کنترل هوشمند در حال حاضر پیکربندی نشده است.' }, { status: 503 });
    }

    // Format products to minimize tokens
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      discount: p.discount || 0,
      imageUrl: p.imageUrl,
    }));

    const simplifiedSets = sets.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      imageUrl: s.imageUrl,
      isActive: s.isActive,
      order: s.order,
      discount: s.discount,
      items: s.items?.map((item: any) => ({
        productId: item.productId,
        productTitle: item.product?.title || '',
        x: item.x,
        y: item.y
      })) || []
    }));

    const dynamicContext = `پکیج‌های فعلی (Shoppable Images):\n${JSON.stringify(simplifiedSets, null, 2)}\n\nلیست محصولات دردسترس (تا ۵۰ محصول اخیر فروشگاه جهت تگ کردن خودکار):\n${JSON.stringify(formattedProducts, null, 2)}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Shoppable AI',
    };

    let parsedResult = null;
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
        if (responseData.error) {
          return NextResponse.json({ error: `خطای سرویس هوش مصنوعی: ${responseData.error.message || JSON.stringify(responseData.error)}` }, { status: 502 });
        }
        return NextResponse.json({ error: 'پاسخی از هوش مصنوعی دریافت نشد.' }, { status: 502 });
      }

      parsedResult = cleanAndParseJson(aiText);
      
      // Post-process to resolve image keywords via Pexels/Wikimedia
      if (parsedResult && parsedResult.actions && Array.isArray(parsedResult.actions)) {
        for (const action of parsedResult.actions) {
          if (action.data) {
            let imageUrl = action.data.imageUrl;

            // Resolve keyword/query if not a URL and we need an image
            if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
              const pexelsApiKey = settingsMap.get('pexels_api_key') || '';
              let searchedUrl = await searchPexelsImage(imageUrl, pexelsApiKey);
              
              if (!searchedUrl) {
                searchedUrl = await searchUnsplashImage(imageUrl);
              }

              if (searchedUrl) {
                imageUrl = searchedUrl;
              } else {
                imageUrl = 'https://images.pexels.com/photos/5632346/pexels-photo-5632346.jpeg';
              }
            }

            if (imageUrl && imageUrl.includes('images.pexels.com') && !imageUrl.includes('?')) {
              imageUrl += '?auto=compress&cs=tinysrgb&w=1080';
            }

            action.data.imageUrl = imageUrl;
          }
        }
      }
      
      return NextResponse.json(parsedResult);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ error: 'پاسخ هوش مصنوعی فرمت نامعتبر داشت.' }, { status: 502 });
    }

  } catch (error) {
    console.error('Error in Shoppable AI Control API:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور در پردازش درخواست.' }, { status: 500 });
  }
}
