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

    // 3. Prepare Prompt
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

    // Call the central AI Gateway
    const result = await callAiGateway<{ seoTitle: string; seoDescription: string }>({
      shopId,
      endpoint: 'categories:ai-seo',
      slot: 'simple',
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
      mode: 'json',
      temperature: 0.7,
      maxTokens: 1500,
      requiredFields: ['seoTitle', 'seoDescription'],
      fallbackValue: { seoTitle: '', seoDescription: '' },
    });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'پردازش هوشمند سئو ناموفق بود.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      seoTitle: result.data.seoTitle,
      seoDescription: result.data.seoDescription,
    });

  } catch (error: any) {
    console.error('Error in Category AI SEO API:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
