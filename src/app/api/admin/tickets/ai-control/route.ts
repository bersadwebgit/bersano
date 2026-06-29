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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت تیکت‌های پشتیبانی مشتریان (Customer Tickets) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که لیست تیکت‌های مشتریان فروشگاه را به همراه دستور (پرامپت) کاربر دریافت کرده و بر اساس آن، اقدامات لازم (پاسخ به تیکت، تغییر وضعیت تیکت یا گزارش تحلیلی) را تشخیص داده و خروجی ساختاریافته تولید کنی.

مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

انواع عملیات‌های مجاز (actions):
۱. پاسخ به تیکت (action: "reply"):
   - اگر کاربر گفت "به تیکت علی جواب بده که بسته‌ت فرستاده شد" یا "پاسخ تیکت شماره clx123 رو بده..."
   - تو باید شناسه تیکت هدف را در "ticketId" قرار دهی.
   - متن پاسخ را در "message" بنویسی (متن پاسخ باید به زبان فارسی محترمانه، صمیمی و گره‌گشا باشد).
   - وضعیت تیکت پس از پاسخ‌دهی به صورت خودکار به "answered" تغییر خواهد کرد.

۲. تغییر وضعیت تیکت (action: "update_status"):
   - اگر کاربر گفت "تیکت مریم رضایی رو ببند" یا "وضعیت تیکت clx123 رو بذار روی در حال بررسی".
   - تو باید شناسه تیکت را در "ticketId" و وضعیت جدید را در "status" قرار دهی: "new" (جدید)، "in_progress" (در حال بررسی)، "answered" (پاسخ داده شده)، "closed" (بسته شده).

۳. گزارش‌گیری و خلاصه تیکت‌ها (action: "report"):
   - اگر کاربر گزارش کلی از وضعیت تیکت‌ها خواست یا سوال مبهمی در مورد تیکت‌ها پرسید.
   - تو باید وضعیت آماری و تحلیلی تیکت‌ها را به فارسی روان در فیلد "explanation" گزارش کنی.

قوانین تطبیق هوشمند نام‌ها:
- با بررسی تیکت‌های فعلی سیستم، تیکتی که مربوط به مشتری ذکر شده توسط کاربر است را پیدا کن و شناسه آن را برگردان.

قوانین خروجی:
خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "reply" | "update_status" | "report",
  "ticketId": "شناسه تیکت هدف (در صورت وجود، وگرنه null)",
  "status": "new" | "in_progress" | "answered" | "closed", // فقط برای اکشن update_status
  "message": "متن پاسخ به مشتری (فقط برای اکشن reply)",
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
      const openrouterModel = await getAiModel('chat', shopId);

      if (!apiKey) {
        return NextResponse.json({ error: 'کلید وب‌سرویس هوش مصنوعی تنظیم نشده است.' }, { status: 400 });
      }

      // Fetch customer tickets for context
      const tickets = await prisma.ticket.findMany({
        where: { shopId },
        include: {
          user: {
            select: { name: true, email: true, phone: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      });

      const formattedTickets = tickets.map(t => ({
        id: t.id,
        customerName: t.user?.name || 'مشتری نامشخص',
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt
      }));

      const dynamicContext = `لیست تیکت‌های پشتیبانی مشتریان فروشگاه شما (۳۰ مورد اخیر):\n${JSON.stringify(formattedTickets, null, 2)}`;
      const userPrompt = `دستور کاربر: "${prompt}"`;

      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder - Customer Tickets AI',
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
      if (aiParsed.action === 'reply' && aiParsed.ticketId && aiParsed.message) {
        // Verify ticket belongs to shop
        const exists = await prisma.ticket.findFirst({
          where: { id: aiParsed.ticketId, shopId }
        });
        if (exists) {
          // Create Ticket Message
          await prisma.ticketMessage.create({
            data: {
              ticketId: aiParsed.ticketId,
              shopId,
              senderId: adminUser.id as string,
              isStaff: true,
              message: aiParsed.message
            }
          });

          // Update Ticket Status to answered
          await prisma.ticket.updateMany({
            where: { id: aiParsed.ticketId, shopId },
            data: { status: 'answered' }
          });

          // Notify Customer
          await prisma.notification.create({
            data: {
              shopId,
              userId: exists.userId,
              title: 'پاسخ جدید به تیکت شما',
              message: `پشتیبانی به تیکت شما پاسخ داد: "${aiParsed.message.slice(0, 100)}${aiParsed.message.length > 100 ? '...' : ''}"`,
              type: 'info',
              linkUrl: `/profile/support/${exists.id}`
            }
          });
        }
      } else if (aiParsed.action === 'update_status' && aiParsed.ticketId && aiParsed.status) {
        await prisma.ticket.updateMany({
          where: { id: aiParsed.ticketId, shopId },
          data: { status: aiParsed.status }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'تغییرات تیکت مشتری با موفقیت اعمال گردید.',
        rawResult: aiParsed
      });
    }

    return NextResponse.json(aiParsed);

  } catch (error) {
    console.error('[ERROR] Customer Tickets AI Control Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
