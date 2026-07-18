// [AI-OPTIMIZED] — caching, selective context, retry added
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { getAiModel } from '@/lib/ai-model-resolver';
import { isRateLimited } from '@/lib/rate-limiter';

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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت و اعمال تغییرات روی برندهای تجاری فروشگاه در پنل مدیریت هستی.
وظیفه تو این است که لیست فعلی برندها را به همراه دستور (پرامپت) کاربر دریافت کنی و تغییرات درخواستی کاربر (ایجاد برند جدید، ویرایش اطلاعات برند موجود، یا حذف برند) را پردازش کنی و آرایه‌ای از عملیات‌های دیتابیسی موردنیاز را برگردانی.

اطلاعات زمانی مبنا:
- امروز: Tuesday, June 9, 2026 (سه‌شنبه، ۱۹ خرداد ۱۴۰۵)

مجموعه عملیات‌های مجاز (operations):
هر عملیات در آرایه "operations" باید یکی از ۳ ساختار زیر را داشته باشد:

1. ایجاد برند جدید (create):
   {
     "type": "create",
     "data": {
       "name": "نام تمیز و دقیق برند (مثلاً Nike یا سامسونگ)",
       "logoUrl": "آدرس لوگوی برند (اختیاری). اگر برند بسیار معروف جهانی است، می‌توانی آدرس لوگوی رسمی یا یک آدرس لوگوی عمومی معتبر برای آن حدس بزنی (مثلاً از لوگوهای معروف وب یا Clearbit)، در غیر این صورت مقدار null یا خالی بگذار."
     }
   }

2. ویرایش برند موجود (update):
   {
     "type": "update",
     "id": "شناسه برند مورد نظر",
     "data": {
       // فقط فیلدهایی که تغییر کرده‌اند را قرار بده:
       "name": "نام جدید برند",
       "logoUrl": "آدرس لوگوی جدید برند"
     }
   }

3. حذف برند (delete):
   {
     "type": "delete",
     "id": "شناسه برند برای حذف"
   }

قوانین محاسباتی و منطقی:
- نام برند را بسیار تمیز، بدون فواصل اضافی و با فرمت درست (مثلاً شروع با حروف بزرگ در انگلیسی یا فرمت استاندارد فارسی) تنظیم کن.
- برای پیدا کردن برند مورد نظر جهت ویرایش یا حذف، نام یا مشخصات اعلام شده توسط کاربر را با لیست برندهای فعلی مطابقت بده (به شباهت‌های اسمی فارسی و انگلیسی دقت کن، مثلاً "نایک" با "Nike" یا "سامسونگ" با "Samsung" تطبیق داده شود).
- جلوگیری از تداخل نام برند: لیست برندهای فعلی را بررسی کن. هرگز برندی با نام تکراری ایجاد نکن، مگر اینکه قصد ویرایش همان برند را داشته باشی. اگر برند از قبل وجود دارد، به جای ایجاد مجدد، در بخش explanation توضیح بده که این برند از قبل موجود است.

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
    const { prompt, brands, confirmed, operations, preview } = body;

    // If already confirmed and operations are provided, we can execute immediately without calling OpenRouter!
    if (confirmed && Array.isArray(operations)) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const op of operations) {
            if (op.type === 'create') {
              const name = op.data.name?.trim();
              if (!name) continue;

              const existing = await tx.brand.findFirst({
                where: {
                  shopId,
                  name: {
                    equals: name,
                  },
                },
              });

              if (!existing) {
                await tx.brand.create({
                  data: {
                    shopId,
                    name,
                    logoUrl: op.data.logoUrl || null,
                  },
                });
              }
            } else if (op.type === 'update') {
              if (!op.id) continue;
              
              const updateData: any = {};
              if (op.data.name !== undefined) updateData.name = op.data.name.trim();
              if (op.data.logoUrl !== undefined) updateData.logoUrl = op.data.logoUrl || null;

              await tx.brand.update({
                where: {
                  id: op.id,
                  shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete') {
              if (!op.id) continue;

              await tx.brand.delete({
                where: {
                  id: op.id,
                  shopId,
                },
              });
            }
          }
        });

        return NextResponse.json({
          success: true,
          explanation: body.explanation || 'تغییرات با موفقیت در پایگاه‌داده ثبت شدند.'
        });
      } catch (err: any) {
        console.error('Error executing pre-approved brand operations:', err);
        return NextResponse.json({ error: `خطا در ثبت نهایی تغییرات: ${err.message}` }, { status: 500 });
      }
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
    const openrouterControlModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_control_model' },
    });
    const openrouterModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_model' },
    });

    const openrouterApiKey = openrouterApiKeySetting?.value;
    let openrouterModel = await getAiModel('simple', shopId);

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
      brands: brands || [],
    };

    const dynamicContext = `لیست برندهای فعلی سیستم:\n${JSON.stringify(inputState.brands, null, 2)}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

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

      parsedResult = cleanAndParseJson(aiText);

      if (parsedResult.success && Array.isArray(parsedResult.operations)) {
        const hasDelete = parsedResult.operations.some((op: any) => op.type === 'delete');
        const isBulk = parsedResult.operations.length > 1;

        const isImportant = hasDelete || isBulk;

        // When called from the Agent (preview mode), always surface operations for confirmation
        // instead of auto-executing, so the admin can review before persisting.
        if ((isImportant || preview) && !confirmed) {
          return NextResponse.json({
            success: true,
            requireConfirmation: true,
            explanation: parsedResult.explanation,
            operations: parsedResult.operations
          });
        }

        // Execute database operations inside transaction
        await prisma.$transaction(async (tx) => {
          for (const op of parsedResult.operations) {
            if (op.type === 'create') {
              const name = op.data.name?.trim();
              if (!name) continue;

              const existing = await tx.brand.findFirst({
                where: {
                  shopId,
                  name: {
                    equals: name,
                  },
                },
              });

              if (!existing) {
                await tx.brand.create({
                  data: {
                    shopId,
                    name,
                    logoUrl: op.data.logoUrl || null,
                  },
                });
              }
            } else if (op.type === 'update') {
              if (!op.id) continue;
              
              const updateData: any = {};
              if (op.data.name !== undefined) updateData.name = op.data.name.trim();
              if (op.data.logoUrl !== undefined) updateData.logoUrl = op.data.logoUrl || null;

              await tx.brand.update({
                where: {
                  id: op.id,
                  shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete') {
              if (!op.id) continue;

              await tx.brand.delete({
                where: {
                  id: op.id,
                  shopId,
                },
              });
            }
          }
        });
      } else if (parsedResult.success && parsedResult.operations !== undefined) {
        throw new Error('Invalid operations format returned by AI');
      }
    } catch (err: any) {
      console.error(`Brand AI Control failed:`, err);
      let friendlyMessage = `کنترل هوشمند برندها پس از چند بار تلاش ناموفق بود: ${err?.message || 'خطای ناشناخته'}`;
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
    });

  } catch (error) {
    console.error('Error in Brand AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
