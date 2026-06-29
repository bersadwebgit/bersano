// [AI-OPTIMIZED] — caching, selective context, retry added
// [HARDENED] — validation, error isolation, save safety
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { getAiModel } from '@/lib/ai-model-resolver';

function toSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و مجرب برای انتقال داده‌ها، برون‌بری و درون‌ریزی اطلاعات (Data Import & Export Specialist) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که درخواست‌های کاربر در زمینه ایمپورت (وارد کردن محصولات و دسته‌بندی‌ها از روی متن یا لیست‌های نامرتب) یا اکسپورت (خروجی گرفتن از اطلاعات) را تحلیل کرده و پاسخ مناسب تولید کنی.

انواع عملیات‌های مجاز (actions):
۱. درخواست خروجی گرفتن / اکسپورت (action: "export"):
   - اگر کاربر گفت "از محصولاتم خروجی اکسل بده" یا "یک بک‌آپ csv از دسته‌بندی‌ها میخوام" یا "کل اطلاعات فروشگاه رو خروجی بگیر".
   - تو باید نوع خروجی را در "exportType" ('products' | 'categories' | 'settings' | 'full') و فرمت آن را در "format" ('csv' | 'json') مشخص کنی.
   - آدرس لینک دانلود مستقیم را به صورت زیر تولید کن و در "downloadUrl" قرار بده:
     - محصولات: "/api/admin/import-export/export?type=products&format=csv" (یا format=json)
     - دسته‌بندی‌ها: "/api/admin/import-export/export?type=categories&format=csv"
     - کل اطلاعات: "/api/admin/import-export/export?type=full&format=json"

۲. پیش‌نمایش وارد کردن داده‌ها / ایمپورت (action: "import_preview"):
   - اگر کاربر متنی شامل چندین محصول، قیمت، موجودی یا دسته‌بندی ارسال کرد و گفت "این لیست رو ایمپورت کن" یا "این محصولات رو ثبت کن...".
   - تو باید محصولات و دسته‌بندی‌ها را از متن کاربر استخراج کرده و در قالب فیلدهای کاملاً استاندارد زیر به صورت یک لیست در "products" و "categories" سازماندهی کنی:
     - هر محصول در "products":
       * title (رشته، الزامی): عنوان محصول
       * price (عدد، الزامی): قیمت محصول (به تومان، عدد بدون ویرگول)
       * stock (عدد، اختیاری): موجودی انبار (پیش‌فرض ۱۰)
       * description (رشته، اختیاری): توضیحات کوتاه
       * categoryName (رشته، اختیاری): نام دسته‌بندی محصول (مثلاً "موبایل")
     - هر دسته‌بندی در "categories":
       * name (رشته، الزامی): نام دسته‌بندی
       * slug (رشته، اختیاری): اسلاگ انگلیسی مناسب

قوانین خروجی:
خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "export" | "import_preview",
  "exportType": "products" | "categories" | "settings" | "full" | null,
  "format": "csv" | "json" | null,
  "downloadUrl": "آدرس دانلود مستقیم برای اکشن اکسپورت (در صورت وجود، وگرنه null)",
  "products": [
    {
      "title": "عنوان محصول",
      "price": 1250000,
      "stock": 10,
      "description": "توضیحات کوتاه",
      "categoryName": "نام دسته‌بندی"
    }
  ],
  "categories": [
    {
      "name": "نام دسته‌بندی",
      "slug": "slug-daste-bandi"
    }
  ],
  "warnings": [],
  "explanation": "توضیح فارسی روان از کاری که قرار است انجام شود..."
}
`;

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = adminUser.shopId;

    if (await isRateLimited(shopId)) {
      return NextResponse.json({
        error: "rate_limit",
        message: "سقف درخواست روزانه پر شده. لطفاً چند دقیقه صبر کنید."
      }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, preview, execute, rawResult } = body;

    let aiParsed: any = null;

    if (execute && rawResult) {
      aiParsed = rawResult;
    } else {
      const basicValidation = validateAiRequest(prompt ?? '');
      if (!basicValidation.valid) {
        return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
      }

      // Fetch system settings for OpenRouter
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      });

      const settingsMap = new Map(settings.map(s => [s.key, s.value]));
      const apiKey = settingsMap.get('openrouter_api_key') || '';
      const openrouterModel = await getAiModel('simple', shopId);

      if (!apiKey) {
        return NextResponse.json({ error: 'کلید وب‌سرویس هوش مصنوعی تنظیم نشده است.' }, { status: 400 });
      }

      const userPrompt = `دستور کاربر: "${prompt}"`;

      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder - Import Export AI',
      };

      const apiBody = {
        model: openrouterModel,
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" }
              }
            ]
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      };

      const response = await openRouterFetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(apiBody)
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'خطا در ارتباط با سرویس هوش مصنوعی.' }, { status: 502 });
      }

      const resData = await response.json();
      const aiText = resData.choices?.[0]?.message?.content || '';
      aiParsed = parseAiJson(aiText);
    }

    // Direct Database Execution if 'execute' is true and action is import
    if (execute && aiParsed && aiParsed.success && aiParsed.action === 'import_preview') {
      const importedProducts = aiParsed.products || [];
      const importedCategories = aiParsed.categories || [];

      await prisma.$transaction(async (tx) => {
        // 1. Process Categories
        const categoryMap = new Map<string, string>(); // name -> id

        for (const cat of importedCategories) {
          if (!cat.name) continue;
          const cleanName = cat.name.trim();
          const targetSlug = cat.slug ? toSlug(cat.slug) : toSlug(cleanName);

          // Find or create category
          let category = await tx.category.findFirst({
            where: { name: cleanName, shopId }
          });

          if (!category) {
            category = await tx.category.create({
              data: {
                shopId,
                name: cleanName,
                slug: targetSlug || `cat-${Date.now()}`
              }
            });
          }
          categoryMap.set(cleanName, category.id);
        }

        // 2. Process Products
        for (const prod of importedProducts) {
          if (!prod.title) continue;
          const cleanTitle = prod.title.trim();

          let categoryId: string | null = null;
          if (prod.categoryName) {
            const catName = prod.categoryName.trim();
            if (categoryMap.has(catName)) {
              categoryId = categoryMap.get(catName) || null;
            } else {
              // Create category on the fly
              const newCat = await tx.category.create({
                data: {
                  shopId,
                  name: catName,
                  slug: toSlug(catName) || `cat-${Date.now()}`
                }
              });
              categoryMap.set(catName, newCat.id);
              categoryId = newCat.id;
            }
          }

          // Create Product
          await tx.product.create({
            data: {
              shopId,
              title: cleanTitle,
              price: prod.price || 0,
              stock: prod.stock !== undefined ? prod.stock : 10,
              description: prod.description || null,
              categoryId,
              type: 'physical',
              isActive: true
            }
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `درون‌ریزی اطلاعات با موفقیت انجام شد: تعداد ${importedProducts.length} محصول و ${importedCategories.length} دسته‌بندی ایجاد شد.`,
        rawResult: aiParsed
      });
    }

    return NextResponse.json(aiParsed);

  } catch (error: any) {
    console.error('[ERROR] Import-Export AI Control Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
