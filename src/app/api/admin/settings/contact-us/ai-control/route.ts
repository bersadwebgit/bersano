import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { getAiModel } from '@/lib/ai-model-resolver';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { parseAiJson } from '@/lib/parse-ai-json';

const SYSTEM_PROMPT = `تو یک کپی‌رایتر حرفه‌ای، متخصص برندینگ و طراح تجربه کاربری (UX) برای فروشگاه‌های اینترنتی پیشرفته هستی.
وظیفه تو: دریافت تنظیمات فعلی صفحه «تماس با ما» (ContactUsConfig) و دستور کاربر (prompt) برای تولید، تکمیل یا بازنویسی بخش‌های مختلف این صفحه به زبان فارسی بسیار صمیمی، متقاعدکننده، داستانی و سئوشده است.

خروجی نهایی شما حتماً و الزامی است که صرفاً و منحصراً یک شیء JSON معتبر با ساختار زیر باشد (بدون هیچ متنی در ابتدا یا انتها و بدون قرار دادن آن داخل تگ‌های کد مثل \`\`\`json):

{
  "success": true,
  "explanation": "توضیح صمیمی و روان به زبان فارسی از تغییرات اعمال‌شده در بخش‌های مختلف، دلایل زیبایی‌شناختی و تاثیر آن روی سئو و فروشگاه.",
  "warnings": [
    "آرایه‌ای از هشدارهای منطقی؛ مثلاً اگر تلفن یا آدرس واقعی فروشگاه خالی است، هشدار دهید تا در بخش تنظیمات عمومی آن را پر کنند."
  ],
  "config": {
    "isStructured": true,
    "hero": {
      "title": "عنوان صفحه تماس (مثال: ارتباط با ما)",
      "subtitle": "زیرعنوان صمیمی و دلگرم‌کننده",
      "description": "توضیحات و خوش‌آمدگویی کامل صفحه تماس (به زبان شیوا و سئوشده)",
      "imageUrl": "نشانی تصویر قهرمان (خالی بگذارید یا مقدار فعلی را حفظ کنید)"
    },
    "departments": {
      "title": "عنوان بخش دپارتمان‌ها (مثال: دپارتمان‌های پاسخگویی و بخش‌های تخصصی)",
      "list": [
        { 
          "id": "شناسه تصادفی منحصربه‌فرد (مثال: dep1 یا srv-123)", 
          "name": "نام دپارتمان (مثال: پشتیبانی سفارشات، همکاری تجاری)", 
          "phone": "تلفن یا داخلی اختصاصی دپارتمان", 
          "email": "ایمیل اختصاصی دپارتمان", 
          "responsiblePerson": "نام شخص مسئول دپارتمان (اختیاری)" 
        }
      ]
    },
    "openingHours": {
      "title": "عنوان بخش ساعات کاری",
      "list": [
        { 
          "id": "شناسه ساعت کار", 
          "dayRange": "بازه روزها (مثال: شنبه تا چهارشنبه، پنج‌شنبه‌ها)", 
          "hours": "ساعت کار (مثال: ۰۹:۰۰ الی ۱۸:۰۰)" 
        }
      ]
    },
    "socialLinks": {
      "title": "عنوان بخش شبکه‌های اجتماعی",
      "list": [
        { 
          "id": "شناسه رسانه", 
          "platform": "نام پلتفرم (فقط یکی از: instagram, telegram, bale, eitaa, whatsapp)", 
          "username": "آیدی کاربری یا شماره تلفن بدون لینک", 
          "url": "آدرس اینترنتی کامل شبکه اجتماعی" 
        }
      ]
    },
    "contactForm": {
      "enabled": true,
      "title": "عنوان فرم تماس مستقیم",
      "description": "توضیحات کوتاه فرم برای جلب اعتماد کاربر جهت ارسال پیام",
      "successMessage": "متن تایید پس از ارسال موفقیت‌آمیز پیام"
    },
    "map": {
      "enabled": true,
      "provider": "embed یا coordinates",
      "embedUrl": "اگر embed انتخاب شد، آدرس فریم نقشه را بگذارید در غیر این صورت خالی بماند",
      "latitude": "عرض جغرافیایی (مثال: 35.6997)",
      "longitude": "طول جغرافیایی (مثال: 51.3380)",
      "zoom": 14,
      "addressDescription": "نشانی آدرس پستی دقیق و راهنمای آدرس"
    },
    "faqs": {
      "title": "عنوان بخش سوالات متداول",
      "list": [
        { 
          "id": "شناسه سوال", 
          "question": "سوال پرتکرار کاربران درباره نحوه تماس یا پشتیبانی", 
          "answer": "پاسخ کامل و شیوا" 
        }
      ]
    }
  }
}

═══════════════════════════════════
دستورالعمل‌های حیاتی تولید محتوا:
═══════════════════════════════════
۱. دپارتمان‌ها (departments) باید بسیار منظم و کاربردی چیده شوند تا خریداران دکان مستقیماً متوجه شوند با کدام بخش تماس بگیرند. برای نمونه، همواره یک دپارتمان پیگیری سفارشات و یک دپارتمان فروش عمده/همکاری ایجاد کنید.
۲. ساعات کاری (openingHours) را واقع‌گرایانه و متناسب با فرهنگ ایرانی تنظیم کنید (پنج‌شنبه‌ها ساعات کاری کوتاه‌تر است، روزهای جمعه تعطیل و تیکت‌ها آنلاین پشتیبانی می‌شوند).
۳. فرم تماس (contactForm) و توضیحات آن باید صمیمی باشد و از هدر رفتن وقت مشتری و ارسال هرزنامه جلوگیری کند.
۴. نقشه (map) و توضیحات آدرس آن باید بسیار واضح و دقیق باشد و تمام اطلاعات آدرس پستی فروشگاه در آن ادغام گردد.
۵. سوالات متداول (faqs) فایده دوگانه دارند: کاهش بارهای پشتیبانی و بهبود سئو (SEO). سوالاتی بنویس که واقعاً به ذهن مشتری می‌رسند و کلمات کلیدی سئو را دارند.
۶. اگر کاربر خواست فقط بخش خاصی را بازنویسی کند (مثلاً "دپارتمان پیگیری سفارشات را ویرایش کن" یا "ساعت کاری پنج‌شنبه‌ها را تا ساعت ۱۵:۰۰ کن")، بقیه بخش‌های شیء ورودی را عینا حفظ کن و فقط بخش موردنظر را با خلاقیت بازنویسی کن.
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
شما موظف هستید هنگام ایجاد یا ویرایش اطلاعات تماس، فاقد هرگونه اطلاعات ساختگی یا پیش‌فرض تستی (مانند info@example.com یا ۰۲۱-۱۲۳۴۵۶۷۸ یا تهران پارک فناوری) عمل کنید. حتماً از مقادیر واقعی زیر استفاده کرده و آن‌ها را در دپارتمان‌ها، فیلدهای اطلاعات تماس پستی و بخش‌های نقشه جایگذاری نمایید:
- نام فروشگاه: ${shopSettings?.shopName || 'مشخص نشده'}
- شماره تلفن رسمی فروشگاه: ${shopSettings?.contactPhone || 'مشخص نشده'}
- ایمیل رسمی پشتیبانی فروشگاه: ${shopSettings?.contactEmail || 'مشخص نشده'}
- نشانی و آدرس دفتر مرکزی فروشگاه: ${shopSettings?.address || 'مشخص نشده'}
═══════════════════════════════════
`;

    const dynamicContext = `پیکربندی فعلی صفحه تماس با ما:\n${JSON.stringify(config || {}, null, 2)}\n\n${realStoreDetails}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Contact Us AI Assistant',
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
      console.error('OpenRouter error in Contact Us generation:', errorText);
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
    console.error('Error in Contact Us AI assistant route:', error);
    return NextResponse.json({ error: 'خطای سرور در دستیار هوش مصنوعی' }, { status: 500 });
  }
}
