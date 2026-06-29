import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAiModel } from '@/lib/ai-model-resolver';

const EXPORT_SYSTEM_PROMPT = `تو یک متخصص تحلیل، خروجی‌گیری داده‌ها (Data Exporter) و نویسنده محتوای فروشگاهی فوق‌حرفه‌ای هستی.
وظیفه تو این است که لیست کامل محصولات فروشگاه را دریافت کنی و بر اساس دستور (پرامپت) کاربر، یک فایل خروجی یا گزارش متنی با ساختار دقیق و بهینه تولید کنی.

═══════════════════════════════════
قوانین تولید فرمت‌های خروجی:
═══════════════════════════════════

۱. اگر کاربر فرمت CSV خواست (مثلاً "CSV با ستون‌های انگلیسی" یا "خروجی اکسل"):
   - یک رشته متنی معتبر CSV تولید کن.
   - ستون‌ها را بر اساس درخواست کاربر انگلیسی یا فارسی بگذار.
   - مقادیر ستون‌ها را به درستی با کاما (,) جدا کن و مقادیری که شامل کاما یا خط جدید هستند را داخل دابل‌کوتیشن (") قرار بده.
   - فیلد fileName را چیزی شبیه به "products-export.csv" و mimeType را "text/csv" قرار بده.

۲. اگر کاربر فرمت XML یا سازگار با پلتفرم‌های دیگر خواست (مثلاً "فرمت ترب" یا "فرمت ایمالز"):
   - ساختار استاندارد XML یا JSON مورد نیاز آن پلتفرم را تولید کن.
   - برای مثال، فرمت ترب (Torob) معمولاً شامل تگ‌های محصولات با فیلدهای شناسه، عنوان، قیمت، موجودی و لینک است.
   - فیلد fileName را متناسب با فرمت (مثلاً "torob-feed.xml") و mimeType را مناسب (مثلاً "application/xml") قرار بده.

۳. اگر کاربر فرمت متنی یا معرفی خواست (مثلاً "معرفی برای کانال تلگرام" یا "متن اینستاگرام"):
   - یک متن خلاقانه، جذاب و بسیار حرفه‌ای همراه با ایموجی‌های مناسب (فقط در صورتی که کاربر درخواست متن شبکه‌های اجتماعی کرده باشد) تولید کن.
   - قیمت‌ها را با فرمت خوانا (مثلاً ۱,۲۵۰,۰۰۰ تومان) بنویس.
   - فیلد fileName را "products-social.txt" و mimeType را "text/plain" قرار بده.

۴. اگر کاربر فرمت JSON خواست:
   - یک آرایه JSON تمیز و ساختاریافته از محصولات تولید کن.
   - فیلد fileName را "products-export.json" و mimeType را "application/json" قرار بده.

خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل، بعد یا در توضیحات مارک‌داون) بازنگردانی:

{
  "success": true,
  "explanation": "توضیح فارسی کوتاه درباره فرمت خروجی تولید شده و تعداد محصولات پردازش شده...",
  "content": "محتوای اصلی فایل خروجی (رشته متنی CSV، XML، JSON یا متن ساده معرفی)...",
  "fileName": "نام فایل پیشنهادی با پسوند مناسب (مثلاً products.csv)",
  "mimeType": "نوع MIME مناسب برای دانلود فایل (مثلاً text/csv یا application/json)"
}
`;

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'دستور خروجی‌گیری الزامی است.' }, { status: 400 });
    }

    const shopId = payload.shopId;

    // Fetch all products with their categories and variants
    const products = await prisma.product.findMany({
      where: { shopId },
      include: {
        category: {
          select: {
            name: true
          }
        },
        variants: {
          select: {
            name: true,
            price: true,
            stock: true,
            colorCode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'هیچ محصولی در فروشگاه برای خروجی‌گیری وجود ندارد.' }, { status: 400 });
    }

    // Fetch AI settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
        }
      }
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    if (settingsMap.get('ai_enabled') === 'false') {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
    }

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = await getAiModel('simple', payload.shopId);

    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی پیکربندی نشده است. لطفا کلید API را در تنظیمات وارد کنید.' }, { status: 503 });
    }

    // Strip bulky fields to save tokens while keeping essential data
    const lightProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      brand: p.brand,
      description: p.description,
      price: p.price,
      discount: p.discount,
      stock: p.stock,
      type: p.type,
      categoryName: p.category?.name || null,
      features: p.features ? JSON.parse(p.features) : null,
      specs: p.specs ? JSON.parse(p.specs) : null,
      variants: p.variants
    }));

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder Product AI Exporter',
      'Connection': 'close',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        model: openrouterModel,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: EXPORT_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `دستور کاربر برای فرمت خروجی: "${prompt}"\n\nلیست محصولات فروشگاه:\n${JSON.stringify(lightProducts, null, 2)}`,
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `خطا در ارتباط با هوش مصنوعی: ${errorText}` }, { status: 502 });
    }

    const responseData = await response.json();
    const aiText = responseData.choices?.[0]?.message?.content;

    if (!aiText) {
      return NextResponse.json({ error: 'پاسخی از هوش مصنوعی دریافت نشد.' }, { status: 502 });
    }

    try {
      const parsedData = JSON.parse(aiText);
      return NextResponse.json(parsedData);
    } catch (e) {
      return NextResponse.json({ error: 'پاسخ هوش مصنوعی در قالب JSON معتبر نبود.', raw: aiText }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Error in AI Export:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
