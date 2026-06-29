// [AI-OPTIMIZED] — caching, selective context, retry added
// [HARDENED] — validation, error isolation, save safety
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { getAiModel } from '@/lib/ai-model-resolver';


const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت و اعمال تغییرات روی دسته‌بندی‌های فروشگاه در پنل مدیریت هستی.
وظیفه تو این است که لیست فعلی دسته‌بندی‌ها را به همراه دستور (پرامپت) کاربر دریافت کنی و تغییرات درخواستی کاربر (ایجاد دسته‌بندی جدید، ویرایش اطلاعات دسته‌بندی موجود، یا حذف دسته‌بندی) را پردازش کنی و آرایه‌ای از عملیات‌های دیتابیسی موردنیاز را برگردانی.

اطلاعات زمانی مبنا:
- امروز: Tuesday, June 9, 2026 (سه‌شنبه، ۱۹ خرداد ۱۴۰۵)

مجموعه عملیات‌های مجاز (operations):
هر عملیات در آرایه "operations" باید یکی از ۳ ساختار زیر را داشته باشد:

1. ایجاد دسته‌بندی جدید (create):
   {
     "type": "create",
     "tempId": "یک شناسه موقت دلخواه مثل temp_1 (فقط در صورتی که می‌خواهی در همین درخواست، دسته‌بندی‌های فرزند زیرمجموعه این دسته‌بندی بسازی)",
     "data": {
       "name": "نام دسته‌بندی",
       "slug": "نامک-انگلیسی-کوچک-و-با-خط-تیره",
       "description": "توضیحات دسته‌بندی (اختیاری)",
       "seoTitle": "عنوان سئو (اختیاری)",
       "seoDescription": "توضیحات کامل سئو (اختیاری)",
       "icon": "نام انگلیسی آیکون مرتبط از کتابخانه Lucide (اجباری - حتماً باید یک آیکون کاملاً مرتبط با موضوع دسته‌بندی انتخاب شود)",
       "parentId": "شناسه والد در صورت وجود (اختیاری). اگر والد در همین درخواست ایجاد می‌شود، از tempId آن استفاده کن.",
       "isActive": true یا false (پیش‌فرض true)
     }
   }

2. ویرایش دسته‌بندی موجود (update):
   {
     "type": "update",
     "id": "شناسه دسته‌بندی مورد نظر",
     "data": {
       // فقط فیلدهایی که تغییر کرده‌اند را قرار بده:
       "name": "نام جدید",
       "slug": "نامک-جدید",
       "description": "توضیحات جدید",
       "seoTitle": "عنوان سئو جدید",
       "seoDescription": "توضیحات سئو جدید",
       "icon": "نام انگلیسی آیکون جدید Lucide",
       "parentId": "شناسه والد جدید",
       "isActive": true یا false
     }
   }

3. حذف دسته‌بندی (delete):
   {
     "type": "delete",
     "id": "شناسه دسته‌بندی برای حذف"
   }

قوانین محاسباتی و منطقی:
- نامک (Slug): فقط حروف انگلیسی کوچک، اعداد و خط تیره (-) بدون فاصله. اگر نام دسته‌بندی تغییر کرد یا ایجاد شد، نامک انگلیسی متناسب با آن تولید کن.
- آیکون (Icon): انتخاب آیکون مرتبط با موضوع دسته‌بندی الزامی و بسیار حیاتی است. باید یک نام آیکون انگلیسی معتبر، مدرن و کاملاً مرتبط از کتابخانه Lucide انتخاب کنی. نمونه‌های دقیق برای موضوعات مختلف:
  * پوشاک، مد و فشن: Shirt, Scissors, Footprints, Crown, Glasses, Watch, ShoppingBag, Sparkles
  * موبایل، تبلت و لوازم جانبی: Smartphone, Tablet, Headphones, BatteryCharging, Cable, Plug
  * لپ‌تاپ، کامپیوتر و اداری: Laptop, Monitor, Mouse, Keyboard, Printer, Cpu, HardDrive
  * خانه، آشپزخانه و دکوراسیون: Home, Bed, Sofa, Lamp, Utensils, Refrigerator, ChefHat, Flower
  * آرایشی، بهداشتی و زیبایی: Sparkles, Heart, Flower2, Scissors, Eye, Smile
  * کافه، رستوران و مواد غذایی: Coffee, Cake, Pizza, Cookie, Wine, IceCream, Apple, Soup, Beer
  * ابزارآلات، صنعتی و خودرو: Wrench, Hammer, Nut, Drill, Car, ShieldAlert, Settings, Construction
  * هدیه، کادو و اسباب‌بازی: Gift, Sparkles, PartyPopper, Cake, Trophy, ToyBrick, Baby
  * کتاب، فرهنگ و آموزش: BookOpen, Book, GraduationCap, School, PenTool, Pencil, Compass
  * ورزش، سفر و سرگرمی: Trophy, Dumbbell, Bike, Compass, Map, Tent, Plane, Luggage, Gamepad, Disc
  * دیجیتال، الکترونیک و تکنولوژی: Cpu, Wifi, Tv, Radio, Camera, Speaker, Watch, Lightbulb
  * پت شاپ و حیوانات: Dog, Cat, Fish, Bone, Heart
  * خدمات، تعمیرات و پشتیبانی: PhoneCall, Shield, LifeBuoy, HelpCircle, MessageSquare
  Every icon field must be filled. Choose the best Lucide name.

- سئو (seoTitle, seoDescription): در صورت درخواست کاربر یا ایجاد دسته‌بندی جدید، عنوان و توضیحات سئو عالی و سئوشده تولید کن.
- برای پیدا کردن دسته‌بندی مورد نظر جهت ویرایش یا حذف، نام یا مشخصات اعلام شده توسط کاربر را با لیست دسته‌بندی‌های فعلی مطابقت بده (به شباهت‌های اسمی دقت کن).
- ایجاد همزمان والد و فرزند: اگر کاربر خواست یک دسته‌بندی والد و فرزندان آن را همزمان بسازد، برای والد یک فیلد "tempId" (مثلاً "temp_clothing") تعریف کن و در عملیات ایجاد فرزند، فیلد "parentId" را برابر با همان "tempId" والد قرار بده.
- جلوگیری از تداخل نامک (Slug): لیست دسته‌بندی‌های فعلی را بررسی کن. هرگز نامکی تولید نکن که در حال حاضر در لیست دسته‌بندی‌های فعال وجود دارد، مگر اینکه قصد ویرایش همان دسته‌بندی را داشته باشی. اگر نام دسته‌بندی جدیدی مشابه دسته‌بندی‌های قبلی است، نامک متفاوتی بساز (مثلاً با اضافه کردن عدد یا پیشوند/پسوند).

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
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    // Rate Limiting
    if (await isRateLimited(shopId)) {
      return NextResponse.json({
        error: "rate_limit",
        message: "سقف درخواست روزانه پر شده. لطفاً چند دقیقه صبر کنید.",
        retryAfter: 60
      }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, categories, confirmed, operations } = body;

    // If already confirmed and operations are provided, we can execute immediately without calling OpenRouter!
    if (confirmed && Array.isArray(operations)) {
      try {
        let createdCategory: any = null;
        await prisma.$transaction(async (tx) => {
          const tempIdMap = new Map<string, string>();

          for (const op of operations) {
            if (op.type === 'create') {
              let parentId = op.data.parentId;
              if (parentId) {
                if (tempIdMap.has(parentId)) {
                  parentId = tempIdMap.get(parentId);
                } else {
                  const parentExists = await tx.category.findFirst({
                    where: { id: parentId, shopId }
                  });
                  if (!parentExists) {
                    const parentBySlugOrName = await tx.category.findFirst({
                      where: {
                        shopId,
                        OR: [
                          { slug: parentId },
                          { name: parentId }
                        ]
                      }
                    });
                    if (parentBySlugOrName) {
                      parentId = parentBySlugOrName.id;
                    } else {
                      parentId = null;
                    }
                  }
                }
              }

              let slug = op.data.slug || 'category';
              let isUnique = false;
              let slugAttempt = 0;
              let uniqueSlug = slug;

              while (!isUnique) {
                const existing = await tx.category.findFirst({
                  where: {
                    shopId,
                    slug: uniqueSlug
                  }
                });

                if (!existing) {
                  isUnique = true;
                } else {
                  slugAttempt++;
                  uniqueSlug = `${slug}-${slugAttempt}`;
                }
              }

              createdCategory = await tx.category.create({
                data: {
                  ...op.data,
                  parentId: parentId || null,
                  slug: uniqueSlug,
                  shopId: shopId,
                }
              });

              if (op.tempId) {
                tempIdMap.set(op.tempId, createdCategory.id);
              }
            } else if (op.type === 'update') {
              if (!op.id) continue;

              let updateData = { ...op.data };

              if (updateData.parentId) {
                let parentId = updateData.parentId;
                if (tempIdMap.has(parentId)) {
                  parentId = tempIdMap.get(parentId);
                } else {
                  const parentExists = await tx.category.findFirst({
                    where: { id: parentId, shopId }
                  });
                  if (!parentExists) {
                    const parentBySlugOrName = await tx.category.findFirst({
                      where: {
                        shopId,
                        OR: [
                          { slug: parentId },
                          { name: parentId }
                        ]
                      }
                    });
                    if (parentBySlugOrName) {
                      parentId = parentBySlugOrName.id;
                    } else {
                      parentId = null;
                    }
                  }
                }
                updateData.parentId = parentId;
              }

              if (updateData.slug) {
                let slug = updateData.slug;
                let isUnique = false;
                let slugAttempt = 0;
                let uniqueSlug = slug;

                while (!isUnique) {
                  const existing = await tx.category.findFirst({
                    where: {
                      shopId,
                      slug: uniqueSlug,
                      id: { not: op.id }
                    }
                  });

                  if (!existing) {
                    isUnique = true;
                  } else {
                    slugAttempt++;
                    uniqueSlug = `${slug}-${slugAttempt}`;
                  }
                }
                updateData.slug = uniqueSlug;
              }

              await tx.category.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete') {
              if (!op.id) continue;
              await tx.category.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            }
          }
        });

        return NextResponse.json({
          success: true,
          id: createdCategory?.id,
          category: createdCategory,
          explanation: body.explanation || 'تغییرات با موفقیت در پایگاه‌داده ثبت شدند.'
        });
      } catch (err: any) {
        console.error('Error executing pre-approved category operations:', err);
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

    // 1. Fetch active package to verify AI subscription features
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
      include: { package: true },
    });

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    // 2. Fetch OpenRouter Configuration
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' },
    });
    const aiEnabledSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_enabled' },
    });
    const openrouterControlModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_control_model' },
    });
    const openrouterModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_model' },
    });

    const openrouterApiKey = openrouterApiKeySetting?.value || '';
    let openrouterModel = await getAiModel('simple', shopId);

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled: aiEnabledSetting?.value !== 'false',
      hasApiKey: !!openrouterApiKey,
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
      
      // Proactively update database settings to permanently optimize speed for the user
      if (
        openrouterControlModelSetting?.value === 'openai/gpt-oss-120b:free' || 
        openrouterControlModelSetting?.value?.includes('lite') || 
        openrouterControlModelSetting?.value?.includes('flash-lite')
      ) {
        try {
          await prisma.systemSetting.update({
            where: { key: 'openrouter_control_model' },
            data: { value: 'google/gemini-2.5-flash' }
          });
        } catch (e) {
          console.error('Failed to auto-update openrouter_control_model setting:', e);
        }
      }
      if (
        openrouterModelSetting?.value === 'google/gemma-4-31b-it:free' || 
        openrouterModelSetting?.value?.includes('lite') || 
        openrouterModelSetting?.value?.includes('flash-lite')
      ) {
        try {
          await prisma.systemSetting.update({
            where: { key: 'openrouter_model' },
            data: { value: 'google/gemini-2.5-flash' }
          });
        } catch (e) {
          console.error('Failed to auto-update openrouter_model setting:', e);
        }
      }
    }

    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی کنترل هوشمند در حال حاضر پیکربندی نشده است. لطفاً به پشتیبانی سیستم اطلاع دهید.' }, { status: 503 });
    }

    // 3. Prepare Prompt to OpenRouter
    const inputState = {
      categories: categories || [],
    };

    const dynamicContext = `لیست دسته‌بندی‌های فعلی سیستم:\n${JSON.stringify(inputState.categories, null, 2)}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    // 4. Request to OpenRouter
    let parsedResult: any = null;
    try {
      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "- امروز: Tuesday, June 9, 2026 (سه‌شنبه، ۱۹ خرداد ۱۴۰۵)",
        `- امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
      );

      const openRouterResponse = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
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
              content: dynamicContext + "\n\n" + userPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2500,
        }),
      });

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        let errorMessage = `OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson?.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const responseData = await openRouterResponse.json();
      let aiText = responseData.choices?.[0]?.message?.content;

      if (!aiText) {
        throw new Error('No content returned from AI model');
      }

      const { data, warnings } = parseAiJson<any>(
        aiText,
        ['success'],
        { success: false, explanation: 'پاسخ AI ناقص بود.', operations: [] }
      );
      parsedResult = data;
      parsedResult.warnings = warnings;

      if (parsedResult.success && Array.isArray(parsedResult.operations)) {
        const hasDelete = parsedResult.operations.some((op: any) => op.type === 'delete');
        const isBulk = parsedResult.operations.length > 1;
        const isDisable = parsedResult.operations.some((op: any) => op.type === 'update' && op.data && op.data.isActive === false);

        const isImportant = hasDelete || isBulk || isDisable;

        if (isImportant && !confirmed) {
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
          const tempIdMap = new Map<string, string>();

          for (const op of parsedResult.operations) {
            if (op.type === 'create') {
              let parentId = op.data.parentId;
              if (parentId) {
                if (tempIdMap.has(parentId)) {
                  parentId = tempIdMap.get(parentId);
                } else {
                  const parentExists = await tx.category.findFirst({
                    where: { id: parentId, shopId }
                  });
                  if (!parentExists) {
                    const parentBySlugOrName = await tx.category.findFirst({
                      where: {
                        shopId,
                        OR: [
                          { slug: parentId },
                          { name: parentId }
                        ]
                      }
                    });
                    if (parentBySlugOrName) {
                      parentId = parentBySlugOrName.id;
                    } else {
                      parentId = null;
                    }
                  }
                }
              }

              let slug = op.data.slug || 'category';
              let isUnique = false;
              let slugAttempt = 0;
              let uniqueSlug = slug;

              while (!isUnique) {
                const existing = await tx.category.findFirst({
                  where: {
                    shopId,
                    slug: uniqueSlug
                  }
                });

                if (!existing) {
                  isUnique = true;
                } else {
                  slugAttempt++;
                  uniqueSlug = `${slug}-${slugAttempt}`;
                }
              }

              const created = await tx.category.create({
                data: {
                  ...op.data,
                  parentId: parentId || null,
                  slug: uniqueSlug,
                  shopId: shopId,
                }
              });

              if (op.tempId) {
                tempIdMap.set(op.tempId, created.id);
              }
            } else if (op.type === 'update') {
              if (!op.id) continue;

              let updateData = { ...op.data };

              if (updateData.parentId) {
                let parentId = updateData.parentId;
                if (tempIdMap.has(parentId)) {
                  parentId = tempIdMap.get(parentId);
                } else {
                  const parentExists = await tx.category.findFirst({
                    where: { id: parentId, shopId }
                  });
                  if (!parentExists) {
                    const parentBySlugOrName = await tx.category.findFirst({
                      where: {
                        shopId,
                        OR: [
                          { slug: parentId },
                          { name: parentId }
                        ]
                      }
                    });
                    if (parentBySlugOrName) {
                      parentId = parentBySlugOrName.id;
                    } else {
                      parentId = null;
                    }
                  }
                }
                updateData.parentId = parentId;
              }

              if (updateData.slug) {
                let slug = updateData.slug;
                let isUnique = false;
                let slugAttempt = 0;
                let uniqueSlug = slug;

                while (!isUnique) {
                  const existing = await tx.category.findFirst({
                    where: {
                      shopId,
                      slug: uniqueSlug,
                      id: { not: op.id }
                    }
                  });

                  if (!existing) {
                    isUnique = true;
                  } else {
                    slugAttempt++;
                    uniqueSlug = `${slug}-${slugAttempt}`;
                  }
                }
                updateData.slug = uniqueSlug;
              }

              await tx.category.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete') {
              if (!op.id) continue;
              await tx.category.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            }
          }
        });
      } else if (parsedResult.success && parsedResult.operations !== undefined) {
        throw new Error('Invalid operations format returned by AI');
      }
    } catch (err: any) {
      console.error(`Category AI Control failed:`, err);
      let friendlyMessage = `کنترل هوشمند دسته‌بندی پس از چند بار تلاش ناموفق بود: ${err?.message || 'خطای ناشناخته'}`;
      if (err?.message?.includes('rate-limited') || err?.message?.includes('429')) {
        friendlyMessage = 'سرعت درخواست‌های شما بیش از حد مجاز است یا مدل انتخابی موقتاً با ترافیک بالا مواجه شده است. لطفاً چند لحظه دیگر دوباره تلاش کنید.';
      } else if (err?.message?.includes('API key')) {
        friendlyMessage = 'کلید API هوش مصنوعی نامعتبر یا منقضی شده است. لطفاً تنظیمات سیستم را بررسی کنید.';
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 502 });
    }

    return NextResponse.json({
      success: parsedResult.success,
      explanation: parsedResult.explanation,
      warnings: parsedResult.warnings
    });

  } catch (error) {
    console.error('Error in Category AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
