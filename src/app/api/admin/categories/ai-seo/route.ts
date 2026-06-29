import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAiModel } from '@/lib/ai-model-resolver';

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

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { id, name, description, parentId } = body;

    if (!id && !name) {
      return NextResponse.json({ error: 'اطلاعات دسته‌بندی ارسال نشده است.' }, { status: 400 });
    }

    // 1. Fetch category details (if id is provided)
    let categoryName = name || '';
    let categoryDescription = description || '';
    let parentCategoryName = '';
    let productNames: string[] = [];

    if (id) {
      const category = await prisma.category.findFirst({
        where: { id, shopId },
        include: {
          parent: true,
          products: {
            where: { isActive: true },
            take: 10,
            select: { title: true }
          }
        }
      });

      if (category) {
        categoryName = category.name;
        categoryDescription = category.description || '';
        if (category.parent) {
          parentCategoryName = category.parent.name;
        }
        productNames = category.products.map(p => p.title);
      }
    } else if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parentId, shopId }
      });
      if (parent) {
        parentCategoryName = parent.name;
      }
    }

    // 2. Fetch Shop Settings
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId }
    });

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    // 3. Fetch OpenRouter Configuration
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' },
    });

    const openrouterApiKey = openrouterApiKeySetting?.value;
    let openrouterModel = await getAiModel('simple', shopId);

    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی سئو در حال حاضر پیکربندی نشده است.' }, { status: 503 });
    }

    // 4. Prepare Prompt
    const systemPrompt = `تو یک متخصص سئو (SEO Specialist) و کپی‌رایتر حرفه‌ای هستی. وظیفه تو تولید عنوان سئو (SEO Title) و توضیحات سئو جامع (SEO Description / Meta Description) برای یک دسته‌بندی محصول در یک فروشگاه اینترنتی است.

اطلاعات فروشگاه:
- نام فروشگاه: "${shop.shopName}"
- توضیحات کلی فروشگاه: "${shop.description || 'فروشگاه اینترنتی برتر'}"

اطلاعات دسته‌بندی:
- نام دسته‌بندی: "${categoryName}"
- توضیحات دسته‌بندی: "${categoryDescription || 'ندارد'}"
${parentCategoryName ? `- دسته‌بندی والد: "${parentCategoryName}"` : ''}
${productNames.length > 0 ? `- نمونه محصولات این دسته‌بندی: ${productNames.map(p => `«${p}»`).join('، ')}` : ''}

قوانین تولید عنوان سئو (seoTitle):
۱. طول عنوان باید بین ۵۰ تا ۶۰ کاراکتر باشد.
۲. کلیدواژه اصلی (نام دسته‌بندی) حتماً در ابتدای عنوان قرار گیرد.
۳. جذاب، ترغیب‌کننده و دارای ارزش کلیک بالا باشد.
۴. نام فروشگاه (${shop.shopName}) به شکل مناسب در انتهای عنوان قرار گیرد (مثلاً با جداکننده | یا -).

قوانین تولید توضیحات سئو (seoDescription):
۱. این توضیحات به عنوان مقاله کوتاه سئو شده در انتهای صفحه دسته‌بندی نمایش داده می‌شود، بنابراین باید یک متن غنی، سئو شده، جذاب و متقاعدکننده در حدود ۳ الی ۵ جمله کامل (بین ۱۵۰ تا ۲۵۰ کلمه) باشد.
۲. باید شامل نام دسته‌بندی، مزایای خرید از این دسته‌بندی، اشاره به تنوع محصولات (در صورت وجود نمونه محصولات، از نام آن‌ها به صورت طبیعی در متن استفاده کن) و دعوت به اقدام (CTA) برای خرید باشد.
۳. کلمات کلیدی مرتبط با دسته‌بندی را به صورت کاملاً طبیعی و بدون تکرار اسپم‌گونه در متن پخش کن.
۴. لحن متن باید کاملاً حرفه‌ای، معتبر، صمیمی و ترغیب‌کننده باشد.

خروجی شما باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:
{
  "seoTitle": "عنوان سئو تولید شده",
  "seoDescription": "توضیحات کامل و سئو شده برای انتهای صفحه دسته‌بندی"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder SEO',
      },
      body: JSON.stringify({
        model: openrouterModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `لطفاً عنوان سئو و توضیحات سئو عالی برای دسته‌بندی «${categoryName}» تولید کن.`,
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const responseData = await response.json();
    const aiText = responseData.choices?.[0]?.message?.content;

    if (!aiText) {
      throw new Error('پاسخی از هوش مصنوعی دریافت نشد.');
    }

    const parsedResult = cleanAndParseJson(aiText);

    return NextResponse.json({
      success: true,
      seoTitle: parsedResult.seoTitle,
      seoDescription: parsedResult.seoDescription,
    });

  } catch (error: any) {
    console.error('Error in Category AI SEO API:', error);
    return NextResponse.json({ error: error.message || 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
