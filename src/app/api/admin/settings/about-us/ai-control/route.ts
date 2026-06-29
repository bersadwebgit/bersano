import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { getAiModel } from '@/lib/ai-model-resolver';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { parseAiJson } from '@/lib/parse-ai-json';

const SYSTEM_PROMPT = `تو یک کپی‌رایتر حرفه‌ای، متخصص برندینگ و طراح تجربه کاربری (UX) برای فروشگاه‌های اینترنتی پیشرفته هستی.
وظیفه تو: دریافت تنظیمات فعلی صفحه «درباره ما» (AboutUsConfig) و دستور کاربر (prompt) برای تولید، تکمیل یا بازنویسی بخش‌های مختلف این صفحه به زبان فارسی بسیار صمیمی، متقاعدکننده، داستانی و سئوشده است.

خروجی نهایی شما حتماً و الزامی است که صرفاً و منحصراً یک شیء JSON معتبر با ساختار زیر باشد (بدون هیچ متنی در ابتدا یا انتها و بدون قرار دادن آن داخل تگ‌های کد مثل \`\`\`json):

{
  "success": true,
  "explanation": "توضیح صمیمی و روان به زبان فارسی از تغییرات اعمال‌شده در بخش‌های مختلف، دلایل زیبایی‌شناختی و تاثیر آن روی سئو و فروشگاه.",
  "warnings": [
    "آرایه‌ای از هشدارهای منطقی؛ مثلاً اگر تلفن یا آدرس واقعی فروشگاه خالی است، هشدار دهید تا در بخش تنظیمات عمومی آن را پر کنند."
  ],
  "config": {
    "isStructured": true,
    "brandStory": {
      "title": "عنوان داستان برند",
      "storyText": "متن جذاب، انسانی و صمیمی داستان برند (بدون بولت‌پوینت، بسیار منسجم و روان)",
      "foundingYear": "سال تأسیس (مثال: ۱۳۹۸ یا ۱۴۰۱)",
      "visionText": "متن کوتاه چشم‌انداز آینده برند",
      "missionText": "متن مأموریت و هدف اصلی برند"
    },
    "coreValues": {
      "title": "عنوان بخش ارزش‌ها (مثال: ارزش‌های محوری ما)",
      "list": [
        { "id": "شناسه تصادفی منحصربه‌فرد", "title": "عنوان ارزش", "description": "توضیح کوتاه ارزش", "serviceId": "general یا شناسه یکی از خدمات زیر" }
      ]
    },
    "services": {
      "title": "عنوان بخش ساختار خدمات",
      "list": [
        {
          "id": "شناسه انگلیسی منحصربه‌فرد (مثال: logistics یا digital)",
          "title": "عنوان سرویس",
          "description": "توضیح خلاصه سرویس",
          "details": "جزییات کامل و مفصل سرویس به همراه فرآیندها",
          "subServices": [
            { "id": "شناسه زیرخدمت", "title": "عنوان زیرخدمت", "description": "توضیح کوتاه زیرخدمت" }
          ],
          "team": [
            { "id": "شناسه همکار", "name": "نام همکار", "role": "سمت/نقش", "avatarUrl": "" }
          ],
          "contact": { "phone": "تلفن", "email": "ایمیل", "address": "نشانی" },
          "faqs": [
            { "id": "شناسه سوال", "question": "سوال متداول اختصاصی این سرویس", "answer": "پاسخ سوال" }
          ]
        }
      ]
    },
    "team": {
      "title": "عنوان بخش تیم مدیریت",
      "platformTeam": [
        { "id": "شناسه مدیر", "name": "نام مدیر", "role": "سمت/نقش", "avatarUrl": "", "bio": "بیوگرافی کوتاه حرفه‌ای" }
      ]
    },
    "testimonials": {
      "title": "عنوان بخش توصیه‌نامه‌ها",
      "list": [
        { "id": "شناسه نظر", "author": "نام مشتری/همکار", "role": "سمت/عنوان کسب‌وکار", "comment": "متن صمیمی و طبیعی رضایت مشتری", "serviceId": "general یا شناسه یکی از خدمات بالا", "rating": 5 }
      ]
    },
    "contact": {
      "title": "عنوان بخش تماس مرکزی",
      "phone": "شماره تماس دفتر مرکزی",
      "email": "ایمیل رسمی مرکزی",
      "address": "نشانی کامل پستی مرکزی"
    },
    "faqs": {
      "title": "عنوان بخش سوالات عمومی",
      "generalFaqs": [
        { "id": "شناسه سوال", "question": "سوال متداول عمومی فروشگاه", "answer": "پاسخ کامل سوال" }
      ]
    }
  }
}

═══════════════════════════════════
دستورالعمل‌های حیاتی تولید محتوا:
═══════════════════════════════════
۱. داستان برند (brandStory) باید داستانی، احساسی، عمیق و زنده باشد. از نوشتن جملات کلیشه‌ای و اداری بپرهیز. به کاربر احساس دوستی و اطمینان بدهد.
۲. ارزش‌های اصلی (coreValues) را خلاقانه و متمایز انتخاب کن (حداکثر ۵ الی ۶ ارزش). مثلاً شفافیت در ارسال، کیفیت بدون قید و شرط، نوآوری مداوم.
۳. ساختار خدمات (services) باید سلسله‌مراتب داشته باشد. هر خدمت بزرگ دارای چند زیرخدمت (subServices) باشد تا کاربر ساختار پلتفرم را بفهمد.
۴. نظرات مشتریان (testimonials) باید طبیعی جلوه کنند؛ نه غلوآمیز و مصنوعی.
۵. سوالات متداول (faqs) فایده دوگانه دارند: کاهش بارهای پشتیبانی و بهبود سئو (SEO). سوالاتی بنویس که واقعاً به ذهن مشتری می‌رسند و کلمات کلیدی سئو را دارند.
۶. اگر کاربر خواست فقط بخش خاصی را بازنویسی کند (مثلاً "فقط داستان برند را صمیمی‌تر کن")، بقیه بخش‌های شیء ورودی را عینا حفظ کن و فقط بخش موردنظر را با خلاقیت بازنویسی کن.
`;

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }
    const shopId = payload.shopId;

    // Rate limiting
    if (await isRateLimited(shopId)) {
      return NextResponse.json({
        error: "rate_limit",
        message: "سقف درخواست پر شده است. لطفاً کمی بعد تلاش کنید."
      }, { status: 429 });
    }

    const { prompt, config } = await request.json();

    const basicValidation = validateAiRequest(prompt ?? '');
    if (!basicValidation.valid) {
      return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
    }

    // Fetch real store settings from database to provide dynamic context for AI copywriting
    const [shopSettings, settings] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        select: {
          shopName: true,
          contactPhone: true,
          contactEmail: true,
          address: true,
        }
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key']
          }
        }
      })
    ]);

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const aiEnabled = settingsMap.get('ai_enabled') !== 'false';

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled,
      hasApiKey: !!apiKey
    });

    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    const aiModel = await getAiModel('content', shopId);

    const realStoreDetails = `
═══════════════════════════════════
اطلاعات واقعی و فیزیکی ثبت‌شده در سیستم برای این فروشگاه (الزامی):
شما موظف هستید هنگام ایجاد یا ویرایش اطلاعات تماس، فاقد هرگونه اطلاعات ساختگی یا پیش‌فرض تستی (مانند info@example.com یا ۰۲۱-۱۲۳۴۵۶۷۸ یا تهران پارک فناوری) عمل کنید. حتماً از مقادیر واقعی زیر استفاده کرده و آن‌ها را در داستان برند، فیلدهای اطلاعات تماس و سرویس‌ها جایگذاری نمایید:
- نام فروشگاه: ${shopSettings?.shopName || 'مشخص نشده'}
- شماره تلفن رسمی فروشگاه: ${shopSettings?.contactPhone || 'مشخص نشده'}
- ایمیل رسمی پشتیبانی فروشگاه: ${shopSettings?.contactEmail || 'مشخص نشده'}
- نشانی و آدرس دفتر مرکزی فروشگاه: ${shopSettings?.address || 'مشخص نشده'}
═══════════════════════════════════
`;

    const dynamicContext = `پیکربندی فعلی صفحه درباره ما:\n${JSON.stringify(config || {}, null, 2)}\n\n${realStoreDetails}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - About Us AI Assistant',
    };

    const { gregorianDate, jalaliDate, time } = getIranDateTime();
    const systemPromptWithTime = SYSTEM_PROMPT + `\nمبنای زمانی زنده ایران: ${gregorianDate} (${jalaliDate}) - ساعت ${time}`;

    const openRouterResponse = await openRouterFetch(apiUrl, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        model: aiModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: systemPromptWithTime,
                cache_control: { type: "ephemeral" }
              }
            ]
          },
          {
            role: "user",
            content: `${dynamicContext}\n\n${userPrompt}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter error in About Us generation:', errorText);
      return NextResponse.json({ error: 'خطا در ارتباط با سرویس هوش مصنوعی.' }, { status: 502 });
    }

    const responseData = await openRouterResponse.json();
    const aiText = responseData.choices?.[0]?.message?.content || '';

    const parsedResponse = parseAiJson<{ success: boolean; explanation: string; warnings: string[]; config: any }>(
      aiText,
      ['success', 'config'],
      { success: true, explanation: '', warnings: [], config }
    );

    const resultData = parsedResponse.data;

    // Build default warnings if store settings are incomplete
    const warnings = resultData.warnings || [];
    if (!shopSettings?.contactPhone) {
      warnings.push('شماره تلفن رسمی فروشگاه در تنظیمات عمومی خالی است؛ بهتر است ابتدا آن را در بخش تنظیمات عمومی تکمیل کنید.');
    }
    if (!shopSettings?.address) {
      warnings.push('آدرس فیزیکی فروشگاه در تنظیمات عمومی خالی است؛ بهتر است ابتدا آن را در بخش تنظیمات عمومی تکمیل کنید.');
    }

    const finalConfig = {
      ...config,
      ...resultData.config,
      isStructured: true
    };

    return NextResponse.json({
      success: true,
      explanation: resultData.explanation || 'تغییرات با موفقیت تحلیل و آماده اعمال گردید.',
      warnings,
      config: finalConfig
    });

  } catch (error) {
    console.error('Error in About Us AI assistant route:', error);
    return NextResponse.json({ error: 'خطای سرور در دستیار هوش مصنوعی' }, { status: 500 });
  }
}
