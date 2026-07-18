import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { callAiGateway } from '@/lib/ai-gateway';

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { title, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'لطفاً عنوان محصول را وارد کنید.' }, { status: 400 });
    }

    const [shop, categories] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        include: { package: true },
      }),
      prisma.category.findMany({
        where: { shopId, isActive: true },
        select: {
          id: true,
          name: true,
          parentId: true,
          parent: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    // Format categories to show their hierarchical structure to the AI for better matching
    const formattedCategories = categories.map(c => {
      const parentName = c.parent?.name;
      const displayName = parentName ? `${parentName} ← ${c.name}` : c.name;
      return {
        id: c.id,
        name: displayName,
        rawName: c.name
      };
    });

    const prompt = `تو یک دستیار هوشمند، فوق‌حرفه‌ای و باسابقه در مدیریت محصولات فروشگاه‌های اینترنتی بزرگ (مانند دیجی‌کالا و آمازون) هستی.
وظیفه تو این است که عنوان ورودی و توضیحات (در صورت وجود) یک محصول را با دقت تحلیل کرده و ۳ کار اصلی را با بالاترین کیفیت انجام دهی:

۱. **بهینه‌سازی نام محصول (suggestedTitle)**:
   - یک عنوان بسیار حرفه‌ای، جذاب، تمیز و استاندارد فروشگاهی برای این کالا بنویس.
   - عنوان باید کوتاه، روان، بدون لغات اضافی یا تبلیغاتی باشد.
   - نام مدل‌ها یا مشخصات کلیدی انگلیسی (مانند Galaxy S24 Ultra یا Nike Air Max) را با دیکته صحیح انگلیسی بنویس، اما بقیه عنوان فارسی باشد.
   - اگر عنوان ورودی در حال حاضر کاملاً استاندارد و عالی است، همان را برگردان.

۲. **استخراج برند محصول (brand)**:
   - نام دقیق برند کالا را استخراج یا شناسایی کن (مثلاً: "سامسونگ"، "Apple"، "شیائومی"، "نایک").
   - اگر برندی در عنوان وجود ندارد، آن را حدس بزن یا در غیر این صورت فیلد را null بگذار.

۳. **انتخاب دقیق‌ترین دسته‌بندی (categoryId)**:
   - از میان لیست دسته‌بندی‌های فعال موجود در فروشگاه، مناسب‌ترین دسته‌بندی را انتخاب و شناسه (id) آن را برگردان.
   - حتماً به ساختار درختی دسته‌بندی‌ها (والد ← فرزند) دقت کن تا دسته‌بندی بسیار دقیق و مرتبط باشد.
   - اگر هیچ‌کدام از دسته‌بندی‌های موجود برای این محصول مناسب نبود، فیلد "categoryId" را null بگذار و در فیلد "suggestedCategoryName" یک نام دسته‌بندی جدید، استاندارد و بسیار مناسب برای این محصول پیشنهاد بده (مثلاً: "لوازم جانبی موبایل"). در غیر این صورت، فیلد "suggestedCategoryName" را null بگذار.

---
اطلاعات محصول ورودی:
عنوان ورودی: "${title}"
توضیحات ورودی: "${description || 'بدون توضیحات'}"

دسته‌بندی‌های موجود در فروشگاه (به صورت والد ← فرزند):
${JSON.stringify(formattedCategories, null, 2)}

قوانین سخت‌گیرانه خروجی:
خروجی تو باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی دیگر، تگ، یا کاراکتر قبل یا بعد آن بازنگردانی:
{
  "suggestedTitle": "عنوان اصلاح شده، حرفه‌ای و استاندارد محصول",
  "brand": "نام برند کالا (به صورت تمیز و کوتاه) یا null",
  "categoryId": "شناسه دقیق (id) دسته‌بندی انتخاب شده از لیست یا null",
  "suggestedCategoryName": "نام دسته‌بندی پیشنهادی جدید در صورت عدم وجود دسته‌بندی مناسب در لیست یا null",
  "explanation": "توضیح کوتاه و حرفه‌ای فارسی درباره علت انتخاب این برند، دسته‌بندی و اصلاح عنوان"
}`;

    // Call the central AI Gateway
    const result = await callAiGateway<{
      suggestedTitle: string;
      brand: string | null;
      categoryId: string | null;
      suggestedCategoryName: string | null;
      explanation: string | null;
    }>({
      shopId,
      endpoint: 'products:ai-suggest-meta',
      slot: 'simple',
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      mode: 'json',
      temperature: 0.2,
      maxTokens: 600,
      requiredFields: ['suggestedTitle'],
      fallbackValue: {
        suggestedTitle: title,
        brand: null,
        categoryId: null,
        suggestedCategoryName: null,
        explanation: null,
      },
    });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'پردازش هوشمند محصول ناموفق بود.' }, { status: 502 });
    }

    const parsedData = result.data;

    let finalCategoryId = parsedData.categoryId || null;
    let finalSuggestedCategoryName = parsedData.suggestedCategoryName || null;
    let matchedCategoryName = null;

    if (finalCategoryId) {
      const matched = categories.find(c => c.id === finalCategoryId);
      if (matched) {
        // Build category display name: Parent ← Child
        const parentName = matched.parent?.name;
        matchedCategoryName = parentName ? `${parentName} ← ${matched.name}` : matched.name;
      } else {
        finalCategoryId = null;
      }
    }

    // Fallback: If categoryId is null but we have suggestedCategoryName, check if it matches existing category names (case-insensitive)
    if (!finalCategoryId && finalSuggestedCategoryName) {
      const searchName = finalSuggestedCategoryName.toLowerCase().trim();
      const matched = categories.find(c => c.name.toLowerCase().trim() === searchName);
      if (matched) {
        finalCategoryId = matched.id;
        const parentName = matched.parent?.name;
        matchedCategoryName = parentName ? `${parentName} ← ${matched.name}` : matched.name;
        finalSuggestedCategoryName = null;
      }
    }

    return NextResponse.json({
      success: true,
      suggestedTitle: parsedData.suggestedTitle || title,
      brand: parsedData.brand || null,
      categoryId: finalCategoryId,
      suggestedCategoryName: finalSuggestedCategoryName,
      matchedCategoryName: matchedCategoryName,
      explanation: parsedData.explanation || null,
    });

  } catch (error: any) {
    console.error('Error suggesting category and brand:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
