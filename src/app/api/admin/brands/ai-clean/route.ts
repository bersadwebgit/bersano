import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { callAiGateway } from '@/lib/ai-gateway';

const SYSTEM_PROMPT = `تو یک دستیار هوش مصنوعی فوق‌العاده دقیق برای استخراج و تمیز کردن اطلاعات برندهای تجاری هستی.
وظیفه تو این است که یک متن توضیحی، آشفته، طولانی یا نامنظم درباره یک برند تجاری را دریافت کنی و آن را به اطلاعات تمیز و استاندارد تبدیل کنی.

اطلاعاتی که باید استخراج کنی:
1. name: نام تمیز و رسمی برند (مثلاً اگر ورودی "شرکت نایک تولید کننده کفش ورزشی درجه یک" بود، نام تمیز "Nike" یا "نایک" است. ترجیحاً نام معروف، تجاری و کوتاه آن را استخراج کن).
2. logoUrl: آدرس لوگوی رسمی برند (اختیاری). اگر برند بسیار معروف جهانی یا ایرانی است و دامنه وب‌سایت رسمی آن را می‌دانی (مثلاً nike.com یا apple.com)، آدرس لوگوی آن را با استفاده از سرویس Clearbit به صورت "https://logo.clearbit.com/دامنه" (مثلاً https://logo.clearbit.com/nike.com) تولید کن. در غیر این صورت، مقدار null بگذار.

خروجی تو باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:
{
  "success": true,
  "name": "نام تمیز برند",
  "logoUrl": "آدرس لوگوی تولید شده یا null"
}
`;

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'لطفاً متن توضیحات برند را وارد کنید.' }, { status: 400 });
    }

    // Call the central AI Gateway
    const result = await callAiGateway<{ success: boolean; name: string; logoUrl: string | null }>({
      shopId: payload.shopId,
      endpoint: 'brands:ai-clean',
      slot: 'simple',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `متن ورودی کاربر برای استخراج برند:\n"${prompt}"`,
        }
      ],
      mode: 'json',
      temperature: 0.1,
      maxTokens: 1000,
      requiredFields: ['success', 'name'],
      fallbackValue: { success: false, name: '', logoUrl: null },
    });

    if (!result.success || !result.data || !result.data.success) {
      return NextResponse.json({ error: result.error || 'پردازش هوشمند برند ناموفق بود.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      name: result.data.name,
      logoUrl: result.data.logoUrl,
    });

  } catch (error) {
    console.error('Error in Brand AI Clean API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
