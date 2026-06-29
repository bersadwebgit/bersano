// [AI-OPTIMIZED] — caching, selective context, retry added
// [HARDENED] — validation, error isolation, save safety
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { validators } from '@/lib/validate-ai-output';
import { getAiModel } from '@/lib/ai-model-resolver';


const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت و اعمال تغییرات روی کدهای تخفیف (Discount Codes) فروشگاه در پنل مدیریت هستی.
وظیفه تو این است که لیست فعلی کدهای تخفیف را به همراه لیست دسته‌بندی‌ها و محصولات موجود فروشگاه و دستور (پرامپت) کاربر دریافت کنی و تغییرات درخواستی کاربر (ایجاد کد تخفیف جدید، ویرایش اطلاعات کد تخفیف موجود، یا حذف آن) را پردازش کنی و آرایه‌ای از عملیات‌های دیتابیسی موردنیاز را برگردانی.

اطلاعات زمانی مبنا:
__TODAY_DATE__
- اگر کاربر به زمان‌هایی مثل "تا آخر تیر" یا "از فردا تا ۱۰ روز دیگر" اشاره کرد، باید تاریخ شمسی را دقیقاً به میلادی تبدیل کنی و با فرمت ISO 8601 (مثل "2026-07-22T23:59:59.000Z") تنظیم کنی.
__TODAY_DATE_JALALI__
  * خرداد ۳۱ روزه است. تیر ۳۱ روزه است. مرداد ۳۱ روزه است. شهریور ۳۱ روزه است. مهر ۳۰ روزه است. آبان ۳۰ روزه است. آذر ۳۰ روزه است. دی ۳۰ روزه است. بهمن ۳۰ روزه است. اسفند ۲۹ یا ۳۰ روزه است.

مجموعه عملیات‌های مجاز (operations):
هر عملیات در آرایه "operations" باید یکی از ۳ ساختار زیر را داشته باشد:

1. ایجاد کد تخفیف جدید (create):
   {
     "type": "create",
     "data": {
       "code": "کد تخفیف (رشته انگلیسی بزرگ، بدون فاصله و حروف خاص، مثلاً SUMMER1405)",
       "discount": مقدار عددی تخفیف (مثلاً 20 برای درصد یا 50000 برای مبلغ ثابت),
       "type": "percentage" یا "flat" (پیش‌فرض "percentage"),
       "maxUses": کل دفعات استفاده مجاز (عدد یا null),
       "isActive": true یا false (پیش‌فرض true),
       "startDate": "تاریخ شروع اعتبار به فرمت ISO (مثلاً 2026-06-10T00:00:00.000Z) یا null",
       "expiresAt": "تاریخ انقضا به فرمت ISO (مثلاً 2026-06-20T23:59:59.000Z) یا null",
       "minOrderAmount": حداقل مبلغ خرید به تومان (عدد یا null),
       "minQuantity": حداقل تعداد خرید از محصول یا دسته‌بندی خاص به عدد (عدد یا null - مثلاً اگر کاربر گفت بالای ۱۰ عدد از این محصول، این فیلد را ۱۰ بگذار),
       "maxDiscountAmount": سقف تخفیف به تومان (عدد یا null - مخصوص نوع percentage),
       "maxUsesPerUser": حداکثر دفعات استفاده برای هر کاربر (عدد، پیش‌فرض 1),
       "firstOrderOnly": true یا false (پیش‌فرض false),
       "allowedGender": "all" یا "male" یا "female" (پیش‌فرض "all"),
       "targetUserId": "شناسه مشتری مشخص از لیست مشتریان (مثلاً clx123) در صورتی که کد تخفیف مخصوص یک مشتری خاص است، وگرنه null",
       "targetCategoryIds": "رشته JSON شامل آرایه‌ای از شناسه‌های دسته‌بندی‌های انتخاب شده (مثلاً \\"[\\\\\\"cat_1\\\\\\",\\\\\\"cat_2\\\\\\"]\\"). اگر محدودیتی ندارد، \\"[]\\" بگذار. برای پیدا کردن شناسه‌ها، از لیست دسته‌بندی‌های موجود استفاده کن.",
       "targetProductIds": "رشته JSON شامل آرایه‌ای از شناسه‌های محصولات انتخاب شده (مثلاً \\"[\\\\\\"prod_1\\\\\\"]\\"). اگر محدودیتی ندارد، \\"[]\\" بگذار. برای پیدا کردن شناسه‌ها، از لیست محصولات موجود استفاده کن."
     }
   }

2. ویرایش کد تخفیف موجود (update):
   {
     "type": "update",
     "id": "شناسه کد تخفیف مورد نظر",
     "data": {
       // فقط فیلدهایی که تغییر کرده‌اند را قرار بده:
       "code": "کد جدید",
       "discount": مقدار جدید,
       "type": "percentage" یا "flat",
       "maxUses": عدد یا null,
       "isActive": true یا false,
       "startDate": "تاریخ شروع جدید یا null",
       "expiresAt": "تاریخ انقضا جدید یا null",
       "minOrderAmount": عدد یا null,
       "minQuantity": عدد یا null,
       "maxDiscountAmount": عدد یا null,
       "maxUsesPerUser": عدد,
       "firstOrderOnly": true یا false,
       "allowedGender": "all" یا "male" یا "female",
       "targetUserId": "شناسه مشتری مشخص یا null",
       "targetCategoryIds": "رشته JSON آرایه شناسه‌ها",
       "targetProductIds": "رشته JSON آرایه شناسه‌ها"
     }
   }

3. حذف کد تخفیف (delete):
   {
     "type": "delete",
     "id": "شناسه کد تخفیف برای حذف"
   }

قوانین محاسباتی و منطقی:
- کد تخفیف (Code): حتماً به حروف بزرگ انگلیسی تبدیل شود. اگر کاربر کدی نگفت، خودت یک کد جذاب انگلیسی متناسب با موضوع بساز (مثلاً BEAUTY40 برای لوازم آرایشی، یا YALDA1405 برای شب یلدا).
- تشخیص نوع تخفیف: درصد تخفیف معمولاً با علامت % یا کلمه "درصد" مشخص می‌شود. مبالغ ثابت معمولاً با کلماتی مثل "تومان" یا "ریال" یا اعداد بزرگ (مثل ۱۰۰۰۰، ۵۰۰۰۰) مشخص می‌شوند.
- تاریخ شمسی به میلادی:
  * امروز چهارشنبه ۲۰ خرداد ۱۴۰۵ (Wednesday, June 10, 2026) است.
  * فردا ۲۱ خرداد ۱۴۰۵ (June 11, 2026) است.
  * آخر خرداد ۱۴۰۵ (June 21, 2026) است.
  * اول تیر ۱۴۰۵ (June 22, 2026) است.
  * آخر تیر ۱۴۰۵ (July 22, 2026) است.
  * آخر مرداد ۱۴۰۵ (August 22, 2026) است.
  * آخر شهریور ۱۴۰۵ (September 22, 2026) است.
  * آخر سال ۱۴۰۵ (March 20, 2027) است.
  * حتماً محاسبات دقیق را انجام بده و تاریخ‌های میلادی معتبر تولید کن.
- قوانین و محدودیت‌های اعتبارسنجی (بسیار مهم):
  ۱. تخفیف درصدی (percentage) نمی‌تواند بیشتر از ۱۰۰٪ باشد.
  ۲. تخفیف ثابت (flat) نمی‌تواند منفی باشد.
  ۳. محدودیت استفاده (maxUses) در صورت تعریف شدن باید حداقل ۱ باشد.
- تطبیق دسته‌بندی‌ها: اگر کاربر گفت "فقط برای دسته‌بندی موبایل"، در لیست دسته‌بندی‌های موجود بگرد و شناسه دسته‌بندی موبایل را پیدا کن و آن را در آرایه targetCategoryIds به صورت رشته JSON قرار بده (مثلاً "[\"id_of_mobile\"]").
- تطبیق محصولات: اگر کاربر گفت "فقط برای محصول آیفون ۱۳"، در لیست محصولات موجود بگرد و شناسه محصول آیفون ۱۳ را پیدا کن و آن را در آرایه targetProductIds قرار بده.
- تطبیق مشتری خاص: اگر کاربر گفت "کد تخفیف برای علی تاجیک بساز" یا "کد تخفیف مخصوص ali@gmail.com" یا "کاربر با شماره تلفن 09158243254"، در لیست مشتریان موجود بگرد و با توجه به نام، ایمیل یا شماره تلفن، شناسه کاربر (targetUserId) را پیدا کن و در فیلد "targetUserId" قرار بده. اگر محدودیتی برای مشتری خاص نیست، این فیلد را ارسال نکن یا null بگذار.
- برای پیدا کردن کد تخفیف جهت ویرایش یا حذف، کد اعلام شده توسط کاربر را با لیست کدهای تخفیف فعلی مطابقت بده (به شباهت‌های اسمی یا کدهای دقیق دقت کن).
- عدم پشتیبانی از فیلترهای غیرموجود: سیستم تخفیف‌های ما فقط فیلدهای مشخصی را در دیتابیس دارد (مانند خرید اول، حداقل مبلغ خرید، سقف تخفیف، دسته‌بندی یا محصول خاص، جنسیت و مشتری مشخص). فیلترهایی مانند «مدت زمان عضویت کاربران» (مثلاً کاربران بالای یک سال)، «تعداد خریدهای قبلی»، «محل سکونت/شهر» یا «محدودیت‌های سنی» در سیستم وجود ندارند! اگر کاربر چنین درخواست‌هایی داشت، هرگز تظاهر نکن که آن‌ها را اعمال کرده‌ای یا در توضیح (explanation) نگو که این محدودیت اعمال خواهد شد. بلکه باید:
  ۱. در بخش "explanation" به زبان فارسی بسیار واضح توضیح دهی که این فیلتر خاص (مثلاً فیلتر مدت زمان عضویت یا تعداد خرید) در سیستم تخفیف‌ها پشتیبانی نمی‌شود و شدنی نیست.
  ۲. کد تخفیف را به صورت عمومی یا با نزدیک‌ترین فیلترهای موجود (مثلاً بدون فیلتر عضویت یا فقط برای خرید اول) بسازی.
  ۳. هرگز فیلد یا ویژگی فرضی و غیرموجود به دیتابیس اضافه نکن و در توضیحات خود کاملاً صادق و دقیق باش.
- حفاظت در برابر کدهای تخفیف نامحدود و حساس: اگر کاربر در پرامپت خود محدودیتی برای تعداد استفاده (maxUses), تاریخ انقضا (expiresAt), حداقل مبلغ خرید (minOrderAmount), یا سقف تخفیف درصدی (maxDiscountAmount) مشخص نکرده باشد، تو باید در بخش "explanation" به صورت کاملاً برجسته و واضح به کاربر هشدار دهی که این کد به صورت «نامحدود» (بدون سقف استفاده، بدون انقضا، بدون حداقل خرید یا بدون سقف تخفیف) ساخته خواهد شد تا کاربر در جریان قرار گیرد و بتواند آن را ویرایش کند.

قوانین خروجی:
- خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "explanation": "توضیحات کامل فارسی از تغییراتی که قرار است روی دیتابیس اعمال شود...",
  "operations": [
    // لیست عملیات‌ها به ترتیب اجرا
  ]
}
`;

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = adminUser.shopId;

    // Rate Limiting
    if (await isRateLimited(shopId)) {
      return NextResponse.json({
        error: "rate_limit",
        message: "سقف درخواست روزانه پر شده. لطفاً چند دقیقه صبر کنید.",
        retryAfter: 60
      }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, discounts, confirmed, operations } = body;

    // If already confirmed and operations are provided, we can execute immediately without calling OpenRouter!
    if (confirmed && Array.isArray(operations)) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const op of operations) {
            if (op.type === 'create') {
              const existing = await tx.discountCode.findFirst({
                where: {
                  shopId,
                  code: { equals: op.data.code.trim().toUpperCase() }
                }
              });
              if (existing) {
                throw new Error(`کد تخفیف ${op.data.code} قبلاً تعریف شده است.`);
              }

              await tx.discountCode.create({
                data: {
                  shopId,
                  code: op.data.code.trim().toUpperCase(),
                  discount: parseFloat(op.data.discount),
                  type: op.data.type || 'percentage',
                  maxUses: op.data.maxUses ? parseInt(op.data.maxUses) : null,
                  usedCount: 0,
                  isActive: op.data.isActive !== undefined ? op.data.isActive : true,
                  expiresAt: op.data.expiresAt ? new Date(op.data.expiresAt) : null,
                  startDate: op.data.startDate ? new Date(op.data.startDate) : null,
                  minOrderAmount: op.data.minOrderAmount ? parseFloat(op.data.minOrderAmount) : null,
                  minQuantity: op.data.minQuantity ? parseInt(op.data.minQuantity) : null,
                  maxDiscountAmount: op.data.maxDiscountAmount ? parseFloat(op.data.maxDiscountAmount) : null,
                  maxUsesPerUser: op.data.maxUsesPerUser ? parseInt(op.data.maxUsesPerUser) : 1,
                  firstOrderOnly: op.data.firstOrderOnly || false,
                  targetCategoryIds: op.data.targetCategoryIds || "[]",
                  targetProductIds: op.data.targetProductIds || "[]",
                  allowedGender: op.data.allowedGender || "all",
                  targetUserId: op.data.targetUserId || null
                }
              });
            } else if (op.type === 'update') {
              if (!op.id) continue;

              if (op.data.code) {
                const duplicate = await tx.discountCode.findFirst({
                  where: {
                    shopId,
                    code: { equals: op.data.code.trim().toUpperCase() },
                    id: { not: op.id }
                  }
                });
                if (duplicate) {
                  throw new Error(`کد تخفیف ${op.data.code} قبلاً روی یک کوپن دیگر تعریف شده است.`);
                }
              }

              const updateData: any = {};
              if (op.data.code !== undefined) updateData.code = op.data.code.trim().toUpperCase();
              if (op.data.discount !== undefined) updateData.discount = parseFloat(op.data.discount);
              if (op.data.type !== undefined) updateData.type = op.data.type;
              if (op.data.maxUses !== undefined) updateData.maxUses = op.data.maxUses ? parseInt(op.data.maxUses) : null;
              if (op.data.isActive !== undefined) updateData.isActive = op.data.isActive;
              if (op.data.expiresAt !== undefined) updateData.expiresAt = op.data.expiresAt ? new Date(op.data.expiresAt) : null;
              if (op.data.startDate !== undefined) updateData.startDate = op.data.startDate ? new Date(op.data.startDate) : null;
              if (op.data.minOrderAmount !== undefined) updateData.minOrderAmount = op.data.minOrderAmount ? parseFloat(op.data.minOrderAmount) : null;
              if (op.data.minQuantity !== undefined) updateData.minQuantity = op.data.minQuantity ? parseInt(op.data.minQuantity) : null;
              if (op.data.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = op.data.maxDiscountAmount ? parseFloat(op.data.maxDiscountAmount) : null;
              if (op.data.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = op.data.maxUsesPerUser ? parseInt(op.data.maxUsesPerUser) : null;
              if (op.data.firstOrderOnly !== undefined) updateData.firstOrderOnly = op.data.firstOrderOnly;
              if (op.data.targetCategoryIds !== undefined) updateData.targetCategoryIds = op.data.targetCategoryIds;
              if (op.data.targetProductIds !== undefined) updateData.targetProductIds = op.data.targetProductIds;
              if (op.data.allowedGender !== undefined) updateData.allowedGender = op.data.allowedGender;
              if (op.data.targetUserId !== undefined) updateData.targetUserId = op.data.targetUserId || null;

              await tx.discountCode.update({
                where: { id: op.id, shopId },
                data: updateData
              });
            } else if (op.type === 'delete') {
              if (!op.id) continue;
              await tx.discountCode.delete({
                where: { id: op.id, shopId }
              });
            }
          }
        });

        return NextResponse.json({
          success: true,
          explanation: body.explanation || 'تغییرات با موفقیت در پایگاه‌داده ثبت شدند.'
        });
      } catch (err: any) {
        console.error('Error executing pre-approved discount operations:', err);
        return NextResponse.json({ error: `خطا در ثبت نهایی تغییرات: ${err.message}` }, { status: 500 });
      }
    }

    const basicValidation = validateAiRequest(prompt ?? '');
    if (!basicValidation.valid) {
      return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    // Fetch categories, products, and users to help AI resolve IDs
    const [categories, products, users, settings] = await Promise.all([
      prisma.category.findMany({
        where: { shopId },
        select: { id: true, name: true, slug: true }
      }),
      prisma.product.findMany({
        where: { shopId, isActive: true },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.user.findMany({
        where: { shopId, role: 'customer' },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      })
    ]);

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    let openrouterModel = await getAiModel('simple', shopId);

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled: settingsMap.get('ai_enabled') !== 'false',
      hasApiKey: !!apiKey,
    });
    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    // Auto-correct slow/invalid/unstable models to extremely fast and stable google/gemini-2.5-flash
    const lowerModel = openrouterModel.toLowerCase();
    if (
      lowerModel.includes('gpt-oss') || 
      lowerModel.includes('gemma-4') || 
      lowerModel.includes('flash-lite') || 
      lowerModel.includes('lite') || 
      (lowerModel.includes('free') && (lowerModel.includes('llama-2') || lowerModel.includes('mistral-7b'))) ||
      !openrouterModel.trim()
    ) {
      openrouterModel = 'google/gemini-2.5-flash';
    }

    const userMessageContent = `
دستور کاربر: "${prompt}"

لیست کدهای تخفیف فعلی سیستم:
${JSON.stringify(discounts.map((d: any) => ({
  id: d.id,
  code: d.code,
  discount: d.discount,
  type: d.type,
  maxUses: d.maxUses,
  usedCount: d.usedCount,
  isActive: d.isActive,
  expiresAt: d.expiresAt,
  startDate: d.startDate,
  minOrderAmount: d.minOrderAmount,
  minQuantity: d.minQuantity,
  maxDiscountAmount: d.maxDiscountAmount,
  maxUsesPerUser: d.maxUsesPerUser,
  firstOrderOnly: d.firstOrderOnly,
  allowedGender: d.allowedGender,
  targetUserId: d.targetUserId,
  targetCategoryIds: d.targetCategoryIds,
  targetProductIds: d.targetProductIds
})), null, 2)}

لیست دسته‌بندی‌های موجود فروشگاه (جهت پیدا کردن شناسه دسته‌بندی):
${JSON.stringify(categories, null, 2)}

لیست محصولات موجود فروشگاه (تا ۵۰ محصول اخیر - جهت پیدا کردن شناسه محصول):
${JSON.stringify(products, null, 2)}

لیست مشتریان موجود فروشگاه (جهت پیدا کردن شناسه کاربر برای کدهای تخفیف مخصوص یک مشتری خاص):
${JSON.stringify(users, null, 2)}
`;

    let aiText: string | null = null;
    try {
      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT
        .replace(
          "__TODAY_DATE__",
          `- امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
        )
        .replace(
          "__TODAY_DATE_JALALI__",
          `  * امروز ${jalaliDate} است.`
        );

      const host = request.headers.get('host') || 'localhost:3000';
      const response = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': `https://${host}`,
          'X-Title': 'SaaS Shop Builder - Discounts AI',
        },
        body: JSON.stringify({
          model: openrouterModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                {
                  type: "text",
                  text: currentSystemPrompt,
                  cache_control: { type: "ephemeral" }
                }
              ]
            },
            {
              role: "user",
              content: userMessageContent
            }
          ],
          temperature: 0.1,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({ error: `خطای سرویس هوش مصنوعی: ${errText}` }, { status: response.status });
      }

      const responseData = await response.json();
      aiText = responseData.choices?.[0]?.message?.content;

      if (!aiText) {
        return NextResponse.json({ error: 'پاسخی از هوش مصنوعی دریافت نشد.' }, { status: 502 });
      }

      const { data, warnings: parseWarnings } = parseAiJson<any>(
        aiText,
        ['success'],
        { success: false, explanation: 'پاسخ AI ناقص بود.', operations: [] }
      );
      const parsedResult = data;

      const outputIssues: string[] = [];
      if (parsedResult.operations && Array.isArray(parsedResult.operations)) {
        for (const op of parsedResult.operations) {
          if ((op.type === 'create' || op.type === 'update') && op.data) {
            const mappedData = {
              type: op.data.type === 'percentage' ? 'percent' : (op.data.type === 'flat' ? 'fixed' : op.data.type),
              value: op.data.discount,
              usageLimit: op.data.maxUses,
            };
            const issues = validators.discount(mappedData);
            outputIssues.push(...issues);
          }
        }
      }
      parsedResult.warnings = [...parseWarnings, ...outputIssues];

      if (parsedResult.success && Array.isArray(parsedResult.operations)) {
        if (!confirmed && parsedResult.operations.length > 0) {
          return NextResponse.json({
            success: true,
            requireConfirmation: true,
            explanation: parsedResult.explanation,
            operations: parsedResult.operations,
            warnings: parsedResult.warnings
          });
        }

        // Execute the database operations sequentially in an atomic TRANSACTION.
        await prisma.$transaction(async (tx) => {
          for (const op of parsedResult.operations) {
            if (op.type === 'create') {
              const existing = await tx.discountCode.findFirst({
                where: {
                  shopId,
                  code: { equals: op.data.code.trim().toUpperCase() }
                }
              });
              if (existing) {
                throw new Error(`کد تخفیف ${op.data.code} قبلاً تعریف شده است.`);
              }

              await tx.discountCode.create({
                data: {
                  shopId,
                  code: op.data.code.trim().toUpperCase(),
                  discount: parseFloat(op.data.discount),
                  type: op.data.type || 'percentage',
                  maxUses: op.data.maxUses ? parseInt(op.data.maxUses) : null,
                  usedCount: 0,
                  isActive: op.data.isActive !== undefined ? op.data.isActive : true,
                  expiresAt: op.data.expiresAt ? new Date(op.data.expiresAt) : null,
                  startDate: op.data.startDate ? new Date(op.data.startDate) : null,
                  minOrderAmount: op.data.minOrderAmount ? parseFloat(op.data.minOrderAmount) : null,
                  minQuantity: op.data.minQuantity ? parseInt(op.data.minQuantity) : null,
                  maxDiscountAmount: op.data.maxDiscountAmount ? parseFloat(op.data.maxDiscountAmount) : null,
                  maxUsesPerUser: op.data.maxUsesPerUser ? parseInt(op.data.maxUsesPerUser) : 1,
                  firstOrderOnly: op.data.firstOrderOnly || false,
                  targetCategoryIds: op.data.targetCategoryIds || "[]",
                  targetProductIds: op.data.targetProductIds || "[]",
                  allowedGender: op.data.allowedGender || "all",
                  targetUserId: op.data.targetUserId || null
                }
              });
            } else if (op.type === 'update') {
              if (!op.id) continue;

              if (op.data.code) {
                const duplicate = await tx.discountCode.findFirst({
                  where: {
                    shopId,
                    code: { equals: op.data.code.trim().toUpperCase() },
                    id: { not: op.id }
                  }
                });
                if (duplicate) {
                  throw new Error(`کد تخفیف ${op.data.code} قبلاً روی یک کوپن دیگر تعریف شده است.`);
                }
              }

              const updateData: any = {};
              if (op.data.code !== undefined) updateData.code = op.data.code.trim().toUpperCase();
              if (op.data.discount !== undefined) updateData.discount = parseFloat(op.data.discount);
              if (op.data.type !== undefined) updateData.type = op.data.type;
              if (op.data.maxUses !== undefined) updateData.maxUses = op.data.maxUses ? parseInt(op.data.maxUses) : null;
              if (op.data.isActive !== undefined) updateData.isActive = op.data.isActive;
              if (op.data.expiresAt !== undefined) updateData.expiresAt = op.data.expiresAt ? new Date(op.data.expiresAt) : null;
              if (op.data.startDate !== undefined) updateData.startDate = op.data.startDate ? new Date(op.data.startDate) : null;
              if (op.data.minOrderAmount !== undefined) updateData.minOrderAmount = op.data.minOrderAmount ? parseFloat(op.data.minOrderAmount) : null;
              if (op.data.minQuantity !== undefined) updateData.minQuantity = op.data.minQuantity ? parseInt(op.data.minQuantity) : null;
              if (op.data.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = op.data.maxDiscountAmount ? parseFloat(op.data.maxDiscountAmount) : null;
              if (op.data.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = op.data.maxUsesPerUser ? parseInt(op.data.maxUsesPerUser) : null;
              if (op.data.firstOrderOnly !== undefined) updateData.firstOrderOnly = op.data.firstOrderOnly;
              if (op.data.targetCategoryIds !== undefined) updateData.targetCategoryIds = op.data.targetCategoryIds;
              if (op.data.targetProductIds !== undefined) updateData.targetProductIds = op.data.targetProductIds;
              if (op.data.allowedGender !== undefined) updateData.allowedGender = op.data.allowedGender;
              if (op.data.targetUserId !== undefined) updateData.targetUserId = op.data.targetUserId || null;

              await tx.discountCode.update({
                where: { id: op.id, shopId },
                data: updateData
              });
            } else if (op.type === 'delete') {
              if (!op.id) continue;
              await tx.discountCode.delete({
                where: { id: op.id, shopId }
              });
            }
          }
        });

        return NextResponse.json({
          success: true,
          explanation: parsedResult.explanation || 'تغییرات با موفقیت اعمال شد.',
          warnings: parsedResult.warnings
        });
      } else {
        return NextResponse.json({ error: 'پاسخ هوش مصنوعی فرمت نامعتبر داشت.' }, { status: 502 });
      }
    } catch (parseError: any) {
      console.error('Failed to parse AI response:', aiText, parseError);
      return NextResponse.json({ error: parseError.message || 'پاسخ هوش مصنوعی فرمت نامعتبر داشت.' }, { status: 502 });
    }

  } catch (error) {
    console.error('Error in Discounts AI Control API:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور در پردازش درخواست.' }, { status: 500 });
  }
}
