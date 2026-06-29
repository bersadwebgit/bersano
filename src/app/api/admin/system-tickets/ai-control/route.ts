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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت تیکت‌های پشتیبانی سیستم (System Tickets) هستی. این تیکت‌ها پیام‌هایی هستند که خود مدیر فروشگاه (کاربر ادمین) برای پشتیبانی فنی پلتفرم کل ارسال می‌کند.
وظیفه تو این است که لیست تیکت‌های سیستمی قبلی را به همراه دستور (پرامپت) کاربر دریافت کرده و اقدامات لازم (ایجاد تیکت سیستمی جدید، پاسخ به تیکت سیستمی قبلی، یا گزارش وضعیت) را تحلیل، استخراج و پردازش کنی.

مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

انواع عملیات‌های مجاز (actions):
۱. ایجاد تیکت جدید به پشتیبانی فنی پلتفرم (action: "create"):
   - اگر کاربر گفت "یه تیکت به پشتیبانی سیستم بزن بگو بخش پرداخت قطع شده" یا "تیکت ثبت کن با عنوان..."
   - تو باید موضوع را در "subject" (مثلاً "اختلال در درگاه پرداخت") و بدنه/توضیحات را در "description" قرار دهی.
   - فیلد "priority" را بر اساس شدت درخواست کاربر بین "low" (کم)، "normal" (عادی)، "high" (زیاد)، یا "urgent" (فوری) تنظیم کن (پیش‌فرض "normal").

۲. پاسخ به تیکت سیستمی موجود (action: "reply"):
   - اگر کاربر گفت "پاسخ تیکت شماره clx456 پشتیبانی سیستم رو بده که بله تست کردم درست شد" یا "به تیکت پشتیبانی بگو..."
   - تو باید شناسه تیکت فنی را در "ticketId" و متن پیام پاسخ را در "message" بنویسی.

۳. گزارش‌گیری و خلاصه تیکت‌های سیستمی (action: "report"):
   - اگر کاربر خواست تیکت‌های فنی ارسالی به پلتفرم را ببیند یا سوالی در مورد تیکت‌های فنی پرسید.
   - تو باید آمار و پاسخ‌های قبلی پلتفرم را بررسی و به فارسی روان در فیلد "explanation" گزارش دهی.

قوانین خروجی:
خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "create" | "reply" | "report",
  "ticketId": "شناسه تیکت هدف (فقط برای اکشن reply، وگرنه null)",
  "subject": "موضوع تیکت جدید (فقط برای اکشن create)",
  "description": "توضیحات کامل تیکت جدید (فقط برای اکشن create)",
  "priority": "low" | "normal" | "high" | "urgent", // فقط برای اکشن create
  "message": "متن پاسخ شما به پشتیبانی پلتفرم (فقط برای اکشن reply)",
  "warnings": [],
  "explanation": "توضیح فارسی روان از کاری که قرار است انجام شود یا گزارش وضعیت تیکت‌های فنی ارسالی..."
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
      const openrouterModel = await getAiModel('chat', shopId);

      if (!apiKey) {
        return NextResponse.json({ error: 'کلید وب‌سرویس هوش مصنوعی تنظیم نشده است.' }, { status: 400 });
      }

      // Fetch technical system tickets for context
      const tickets = await prisma.systemTicket.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 30
      });

      const dynamicContext = `لیست تیکت‌های فنی ارسالی شما به پشتیبانی پلتفرم (۳۰ مورد اخیر):\n${JSON.stringify(tickets, null, 2)}`;
      const userPrompt = `دستور کاربر: "${prompt}"`;

      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder - System Support Tickets AI',
      };

      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)",
        `مبنای زمانی امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
      );

      const apiBody = {
        model: openrouterModel,
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

    // Direct Database Execution if 'execute' is true and valid parsed actions
    if (execute && aiParsed && aiParsed.success) {
      if (aiParsed.action === 'create' && aiParsed.subject && aiParsed.description) {
        await prisma.systemTicket.create({
          data: {
            shopId,
            subject: aiParsed.subject,
            description: aiParsed.description,
            priority: aiParsed.priority || 'normal',
            status: 'new',
            messages: {
              create: {
                senderId: adminUser.id as string,
                senderRole: 'admin',
                message: aiParsed.description
              }
            }
          }
        });
      } else if (aiParsed.action === 'reply' && aiParsed.ticketId && aiParsed.message) {
        const exists = await prisma.systemTicket.findFirst({
          where: { id: aiParsed.ticketId, shopId }
        });
        if (exists) {
          await prisma.systemTicketMessage.create({
            data: {
              ticketId: aiParsed.ticketId,
              senderId: adminUser.id as string,
              senderRole: 'admin',
              message: aiParsed.message
            }
          });

          await prisma.systemTicket.update({
            where: { id: aiParsed.ticketId },
            data: { 
              status: 'new',
              updatedAt: new Date()
            }
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'اقدام تیکت سیستمی با موفقیت روی دیتابیس پشتیبانی اعمال گردید.',
        rawResult: aiParsed
      });
    }

    return NextResponse.json(aiParsed);

  } catch (error) {
    console.error('[ERROR] System Tickets AI Control Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
