// [AI-OPTIMIZED] — selective context, retry, save safety
// [HARDENED] — validation, error isolation, tenant isolation
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { getAiModel } from '@/lib/ai-model-resolver';
import { gatherCalendarSignals } from '@/lib/content-calendar-data';
import { getUpcomingOccasions, getPublishingSlots } from '@/lib/occasions';

interface CalendarItem {
  id: string;
  type: 'blog' | 'story' | 'discount';
  pillar: string;
  isEvergreen: boolean;
  occasionKey?: string;
  occasion: string;
  occasionDate?: string;
  occasionDateJalali?: string;
  title: string;
  summary: string;
  keywords: string[];
  targetProductIds: string[];
  categoryId: string | null;
  suggestedPublishAt: string;
  rationale: string;
  status: 'suggested' | 'accepted' | 'dismissed';
  createdPostId?: string | null;
  createdAt: string;
}

interface AiCalendarResponse {
  success: boolean;
  explanation?: string;
  items?: Partial<CalendarItem>[];
}

const SYSTEM_PROMPT = `تو یک استراتژیست محتوای حرفه‌ای سئو و فروش برای یک فروشگاه اینترنتی ایرانی هستی. زبان فارسی، ارز تومان، تقویم شمسی و منطقه‌زمانی تهران.

وظیفه: بر اساس «دیتای واقعی فروشگاه»، «مناسبت‌های پیشِ‌رو» و «اسلات‌های انتشار» که در پیام کاربر داده می‌شود، یک «تقویم محتوایی» کامل، پرمحتوا و عملیاتی تولید کن که اگر صاحب فروشگاه طبق آن پیش برود، ورودی هدفمند بگیرد و آن ورودی منجر به خرید شود.

تقویم باید دو دسته محتوا را با هم ترکیب کند:
الف) محتوای مناسبتی (isEvergreen=false): به یک مناسبت از لیست گره می‌خورد و از همان occasionDate و suggestedPublishAt مناسبت استفاده می‌کند.
ب) محتوای همیشه‌سبز و محصول‌محور (isEvergreen=true): مستقل از مناسبت، حول محصولات و دسته‌بندی‌های واقعی فروشگاه؛ برای این آیتم‌ها suggestedPublishAt را از «اسلات‌های انتشار» انتخاب کن (تاریخ نساز و حدس نزن) و occasion را خالی یا «محتوای همیشه‌سبز» بگذار.

ستون‌های محتوایی (فیلد pillar) که باید پوشش بدهی (مخصوصاً برای محصولات):
- «راهنمای خرید» (مثلاً: راهنمای انتخاب/خرید فلان دسته)
- «مقایسه» (مقایسه دو یا چند محصول/مدل واقعی)
- «آموزش و نحوه استفاده» (how-to، نگهداری، نصب، رفع اشکال)
- «نقد و بررسی» (بررسی تخصصی یک محصول پرفروش)
- «بهترین‌ها / لیست» (مثلاً: بهترین محصولات برای فلان کاربرد/بودجه)
- «مناسبتی» (برای آیتم‌های گره‌خورده به مناسبت)

اصول مهم:
1. تاریخ‌ها را فقط از لیست مناسبت‌ها یا اسلات‌های انتشار انتخاب کن؛ هرگز تاریخ نساز.
2. هر آیتم باید به محصول(های) واقعی یا دسته‌بندی واقعی فروشگاه لینک شود؛ فقط از id‌هایی استفاده کن که در دیتای فروشگاه آمده. اگر محصول مناسبی نبود، targetProductIds را خالی بگذار.
3. محصولات پرفروش را برای محتوای نقد/بهترین‌ها، محصولات بدون‌فروش و کم‌موجودی را برای محتوای پوش و راهنمای خرید هوشمندانه به‌کار بگیر؛ منبع ترافیک غالب و نرخ تبدیل را در زاویه‌ی محتوا لحاظ کن.
4. موضوعات تکراری با مقالات موجود نساز؛ مکمل و تازه باشد.
5. type می‌تواند "blog" (مقاله اصلی)، "story" (استوری کوتاه) یا "discount" (پیشنهاد کمپین تخفیف) باشد.
6. تقویم باید پرمحتوا باشد: حداقل ۱۰ تا ۱۶ آیتم تولید کن که اکثرشان محتوای محصول‌محور و همیشه‌سبز باشند و بقیه مناسبتی. آیتم‌ها را در طول بازه‌ی زمانی پخش کن (هر اسلات حداکثر ۲ آیتم).
7. عنوان‌ها کنجکاوی‌برانگیز و سئوشده، خلاصه ۱ تا ۲ جمله، و rationale توضیح کوتاه «چرا این محتوا ورودی/فروش می‌آورد» (مبتنی بر دیتا).
8. کلیدواژه‌ها (keywords) واقعی و قابل‌جستجو باشند (۳ تا ۶ مورد).

اطلاعات زمانی مبنا:
- امروز: Tuesday, June 9, 2026 (سه‌شنبه، ۱۹ خرداد ۱۴۰۵)

خروجی را فقط و فقط به صورت JSON معتبر با این ساختار بده:
{
  "success": true,
  "explanation": "خلاصه کوتاه فارسی از استراتژی تقویم",
  "items": [
    {
      "type": "blog",
      "pillar": "راهنمای خرید | مقایسه | آموزش و نحوه استفاده | نقد و بررسی | بهترین‌ها / لیست | مناسبتی",
      "isEvergreen": true,
      "occasionKey": "کلید مناسبت از لیست (فقط برای آیتم مناسبتی)",
      "occasion": "نام مناسبت یا «محتوای همیشه‌سبز»",
      "occasionDate": "ISO تاریخ میلادی مناسبت (فقط برای آیتم مناسبتی)",
      "occasionDateJalali": "تاریخ شمسی مناسبت (فقط برای آیتم مناسبتی)",
      "title": "عنوان جذاب و سئوشده",
      "summary": "خلاصه یک تا دو جمله‌ای",
      "keywords": ["کلیدواژه ۱", "کلیدواژه ۲"],
      "targetProductIds": ["id محصول واقعی"],
      "categoryId": "id دسته واقعی یا null",
      "suggestedPublishAt": "ISO تاریخ پیشنهادی انتشار از لیست مناسبت یا اسلات‌ها",
      "rationale": "چرا این محتوا ورودی و فروش می‌آورد (مبتنی بر دیتا)"
    }
  ]
}`;

function makeId(index: number): string {
  return `cal_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

const ALLOWED_PILLARS = ['راهنمای خرید', 'مقایسه', 'آموزش و نحوه استفاده', 'نقد و بررسی', 'بهترین‌ها / لیست', 'مناسبتی'];

function normalizeItem(
  raw: Partial<CalendarItem>,
  index: number,
  validProductIds: Set<string>,
  validCategoryIds: Set<string>,
  windowStart: number,
  windowEnd: number
): CalendarItem | null {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;

  const type: CalendarItem['type'] = raw.type === 'story' || raw.type === 'discount' ? raw.type : 'blog';

  const targetProductIds = Array.isArray(raw.targetProductIds)
    ? raw.targetProductIds.filter((id) => typeof id === 'string' && validProductIds.has(id))
    : [];

  const categoryId = raw.categoryId && validCategoryIds.has(raw.categoryId) ? raw.categoryId : null;

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((k) => typeof k === 'string' && k.trim()).slice(0, 8)
    : [];

  // Clamp publish date inside the planning window so it is never in the past or beyond range.
  let publishMs = raw.suggestedPublishAt ? new Date(raw.suggestedPublishAt).getTime() : NaN;
  if (isNaN(publishMs)) publishMs = windowStart;
  if (publishMs < windowStart) publishMs = windowStart;
  if (publishMs > windowEnd) publishMs = windowEnd;

  const isEvergreen = raw.isEvergreen === true || !raw.occasionDate;
  const pillar = typeof raw.pillar === 'string' && ALLOWED_PILLARS.includes(raw.pillar.trim())
    ? raw.pillar.trim()
    : (isEvergreen ? 'راهنمای خرید' : 'مناسبتی');

  return {
    id: makeId(index),
    type,
    pillar,
    isEvergreen,
    occasionKey: typeof raw.occasionKey === 'string' ? raw.occasionKey : undefined,
    occasion: typeof raw.occasion === 'string' && raw.occasion.trim() ? raw.occasion.trim() : (isEvergreen ? 'محتوای همیشه‌سبز' : 'مناسبت'),
    occasionDate: raw.occasionDate,
    occasionDateJalali: raw.occasionDateJalali,
    title: raw.title.trim(),
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    keywords,
    targetProductIds,
    categoryId,
    suggestedPublishAt: new Date(publishMs).toISOString(),
    rationale: typeof raw.rationale === 'string' ? raw.rationale.trim() : '',
    status: 'suggested',
    createdPostId: null,
    createdAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    if (await isRateLimited(shopId)) {
      return NextResponse.json({
        error: 'rate_limit',
        message: 'سقف درخواست لحظه‌ای پر شده. لطفاً چند دقیقه صبر کنید.',
        retryAfter: 60,
      }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const monthsAhead = Math.min(Math.max(Number(body?.monthsAhead) || 3, 1), 6);

    // Internal task prompt (this endpoint is system-driven, not free-text).
    const internalPrompt = 'تولید تقویم محتوایی هوشمند بر اساس دیتای فروشگاه و مناسبت‌های پیشِ‌رو';

    const [shop, settings, signals] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        select: { shopName: true, productType: true, currency: true, contentCalendar: true },
      }),
      prisma.systemSetting.findMany({
        where: { key: { in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model', 'openrouter_blog_model'] } },
      }),
      gatherCalendarSignals(shopId),
    ]);

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const aiModel = await getAiModel('content', shopId);

    const contextValidation = validateAiRequest(internalPrompt, {
      aiEnabled: settingsMap.get('ai_enabled') !== 'false',
      hasApiKey: !!apiKey,
    });
    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    const occasions = getUpcomingOccasions(monthsAhead);
    const publishingSlots = getPublishingSlots(monthsAhead);

    const windowStart = Date.now();
    const windowEnd = windowStart + monthsAhead * 30 * 24 * 60 * 60 * 1000;

    const validProductIds = new Set(signals.catalog.products.map((p) => p.id));
    const validCategoryIds = new Set(signals.catalog.categories.map((c) => c.id));

    const dynamicContext = `اطلاعات فروشگاه:
- نام: ${shop.shopName}
- نوع محصولات: ${shop.productType}
- ارز: ${shop.currency}

مناسبت‌های پیشِ‌رو (${monthsAhead} ماه آینده) — برای آیتم‌های مناسبتی فقط از همین تاریخ‌ها استفاده کن:
${occasions.length > 0 ? JSON.stringify(occasions.map((o) => ({ occasionKey: o.key, occasion: o.title, category: o.category, commerceAngle: o.commerceAngle, occasionDate: o.date, occasionDateJalali: o.jalaliLabel, suggestedPublishAt: o.suggestedPublishAt })), null, 2) : 'در این بازه مناسبت خاصی نیست؛ روی محتوای همیشه‌سبز و محصول‌محور تمرکز کن.'}

اسلات‌های انتشار برای محتوای همیشه‌سبز/محصول‌محور — suggestedPublishAt را از این تاریخ‌ها انتخاب کن:
${JSON.stringify(publishingSlots, null, 2)}

دیتای واقعی فروشگاه:
- پرفروش‌ترین محصولات: ${JSON.stringify(signals.topSellers, null, 2)}
- محصولات کم‌موجودی: ${JSON.stringify(signals.lowStockProducts, null, 2)}
- محصولات بدون فروش (فرصت پوش): ${JSON.stringify(signals.unsoldProducts, null, 2)}
- کاتالوگ محصولات (برای لینک‌دهی، فقط از این id‌ها استفاده کن): ${JSON.stringify(signals.catalog.products, null, 2)}
- دسته‌بندی‌ها: ${JSON.stringify(signals.catalog.categories, null, 2)}
- ترافیک ${signals.traffic.windowDays} روز اخیر${signals.traffic.isDemoData ? ' (توجه: داده‌ی نمایشی/دمو است و قابل اتکا نیست)' : ''}: بازدید=${signals.traffic.pageViews}، بازدیدکننده یکتا=${signals.traffic.uniqueVisitors}، نرخ تبدیل=${signals.traffic.conversionRate}٪
- منابع ترافیک: ${JSON.stringify(signals.traffic.sources)}
- پربازدیدترین صفحات ورودی: ${JSON.stringify(signals.traffic.topEntryPages)}
- مقالات موجود (برای جلوگیری از تکرار): ${JSON.stringify(signals.existingPosts.slice(0, 20), null, 2)}`;

    const userPrompt = 'بر اساس اطلاعات بالا، یک تقویم محتوایی کامل و عملیاتی تولید کن.';

    let parsedResult: AiCalendarResponse | null = null;
    let parseWarnings: string[] = [];
    let lastError: any = null;
    const maxAttempts = 3;
    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder',
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let currentModel = aiModel;
        let currentTemperature = 0.7;
        let currentMaxTokens = 8000;

        if (attempt === 2) {
          currentTemperature = 0.3;
          currentMaxTokens = 9000;
        } else if (attempt === 3) {
          currentModel = aiModel === 'google/gemini-2.5-flash'
            ? 'meta-llama/llama-3.1-70b-instruct'
            : 'google/gemini-2.5-flash';
          currentTemperature = 0.3;
          currentMaxTokens = 9000;
        }

        const { gregorianDate, jalaliDate, time } = getIranDateTime();
        const currentSystemPrompt = SYSTEM_PROMPT.replace(
          '- امروز: Tuesday, June 9, 2026 (سه‌شنبه، ۱۹ خرداد ۱۴۰۵)',
          `- امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
        );

        console.log(`[AI-CONTENT-CALENDAR] Generation attempt ${attempt}/${maxAttempts} using model: ${currentModel}`);

        const openRouterResponse = await openRouterFetch(apiUrl, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            model: currentModel,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: [{ type: 'text', text: currentSystemPrompt, cache_control: { type: 'ephemeral' } }] },
              { role: 'user', content: dynamicContext + '\n\n' + userPrompt },
            ],
            temperature: currentTemperature,
            max_tokens: currentMaxTokens,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          let errorMessage = `OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson?.error?.message) errorMessage = errorJson.error.message;
          } catch (e) {}
          throw new Error(errorMessage);
        }

        const responseData = await openRouterResponse.json();
        if (responseData.error) {
          const errMsg = typeof responseData.error === 'string' ? responseData.error : (responseData.error.message || JSON.stringify(responseData.error));
          throw new Error(`OpenRouter Error: ${errMsg}`);
        }

        const aiText = responseData.choices?.[0]?.message?.content;
        if (!aiText) throw new Error('No content returned from AI model');

        const { data, warnings } = parseAiJson<AiCalendarResponse>(
          aiText,
          ['success'],
          { success: false, explanation: 'پاسخ AI ناقص بود.', items: [] }
        );

        if (data && Array.isArray(data.items) && data.items.length > 0) {
          parsedResult = data;
          parseWarnings = warnings;
          if (attempt > 1) console.log(`[AI-CONTENT-CALENDAR] Recovered on attempt ${attempt}`);
          break;
        } else {
          throw new Error(data?.explanation || 'پاسخ دریافتی فاقد آیتم معتبر بود.');
        }
      } catch (err: any) {
        console.error(`[AI-CONTENT-CALENDAR] Attempt ${attempt} failed:`, err.message || err);
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    if (!parsedResult) {
      return NextResponse.json({
        error: lastError?.message || 'تولید تقویم محتوایی ناموفق بود. لطفاً دوباره تلاش کنید.',
      }, { status: 502 });
    }

    const normalized = (parsedResult.items || [])
      .map((raw, i) => normalizeItem(raw, i, validProductIds, validCategoryIds, windowStart, windowEnd))
      .filter((x): x is CalendarItem => x !== null);

    // Merge with previously accepted/dismissed items so user decisions survive re-generation.
    let existing: CalendarItem[] = [];
    try {
      const parsed = JSON.parse(shop.contentCalendar || '[]');
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }
    const preserved = existing.filter((it) => it.status === 'accepted' || it.status === 'dismissed');
    const preservedTitles = new Set(preserved.map((it) => (it.title || '').trim()));
    const freshItems = normalized.filter((it) => !preservedTitles.has(it.title.trim()));

    const merged = [...preserved, ...freshItems].sort(
      (a, b) => new Date(a.suggestedPublishAt).getTime() - new Date(b.suggestedPublishAt).getTime()
    );

    await prisma.shopSettings.update({
      where: { shopId },
      data: { contentCalendar: JSON.stringify(merged) },
    });

    return NextResponse.json({
      success: true,
      explanation: parsedResult.explanation || 'تقویم محتوایی با موفقیت تولید شد.',
      items: merged,
      warnings: parseWarnings,
    });
  } catch (error) {
    console.error('[ERROR] [ContentCalendarAiControl]:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
