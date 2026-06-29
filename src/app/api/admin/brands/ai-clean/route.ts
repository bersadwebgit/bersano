import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

function cleanAndParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerError) {}
    }
    
    const firstBracket = text.indexOf('{');
    const lastBracket = text.lastIndexOf('}');
    if (firstBracket !== -1 && lastBracket !== -1) {
      try {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      } catch (innerError) {}
    }
    
    throw new Error('Failed to parse AI response as JSON Object');
  }
}

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

    // 1. Fetch OpenRouter Configuration
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' },
    });
    const openrouterModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_model' },
    });

    const openrouterApiKey = openrouterApiKeySetting?.value;
    const openrouterModel = openrouterModelSetting?.value || 'google/gemini-2.5-flash';

    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر پیکربندی نشده است. لطفاً به پشتیبانی سیستم اطلاع دهید.' }, { status: 503 });
    }

    // 2. Request to OpenRouter with Retry Logic
    let attempts = 0;
    const maxAttempts = 3;
    let parsedResult: any = null;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterApiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'SaaS Shop Builder',
          },
          body: JSON.stringify({
            model: openrouterModel,
            response_format: { type: "json_object" },
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
            temperature: 0.1,
            max_tokens: 1000,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          throw new Error(`OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`);
        }

        const responseData = await openRouterResponse.json();
        let aiText = responseData.choices?.[0]?.message?.content;

        if (!aiText) {
          throw new Error('No content returned from AI model');
        }

        parsedResult = cleanAndParseJson(aiText);
        break; // Success!
      } catch (err: any) {
        console.error(`Attempt ${attempts} failed for Brand AI Clean:`, err);
        lastError = err;
        parsedResult = null;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!parsedResult || !parsedResult.success) {
      return NextResponse.json({ error: `پردازش هوشمند برند ناموفق بود: ${lastError?.message || 'خطای ناشناخته'}` }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      name: parsedResult.name,
      logoUrl: parsedResult.logoUrl,
    });

  } catch (error) {
    console.error('Error in Brand AI Clean API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
