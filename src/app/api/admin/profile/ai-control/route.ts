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
import bcrypt from 'bcryptjs';

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت پروفایل شخصی مدیر اصلی فروشگاه (Admin Profile Settings) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که اطلاعات حساب کاربری مدیر را به همراه دستور (پرامپت) کاربر دریافت کرده و اقدامات لازم (ویرایش نام، ویرایش تلفن تماس، ویرایش ایمیل، تغییر تصویر آواتار، یا تغییر رمز عبور امن) را تشخیص داده و خروجی ساختاریافته تولید کنی.

مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

انواع عملیات‌های مجاز (actions):
۱. ویرایش اطلاعات پروفایل (action: "update_profile"):
   - اگر کاربر گفت "نام کاربری منو بذار علی راد" یا "ایمیل منو عوض کن به..." یا "عکس پروفایلم رو بذار آدرس فلان".
   - فیلدهای تغییر یافته را در شیء "data" قرار بده (مانند: "name", "email", "phone", "avatarUrl").

۲. تغییر رمز عبور حساب (action: "change_password"):
   - اگر کاربر گفت "رمز عبور من رو تغییر بده" یا "پسوردم رو عوض کن به..."
   - تو باید رمز عبور قدیمی را در "currentPassword" و رمز عبور جدید خواسته شده را در "newPassword" بگذاری.
   - اگر کاربر رمز عبور قدیمی را نگفته بود، حتماً درwarnings بنویس: "برای ثبت نهایی رمز عبور جدید، وارد کردن رمز عبور قدیمی در فرم الزامی است."

۳. گزارش وضعیت حساب مدیر (action: "report"):
   - اگر کاربر سوالی عمومی در مورد مشخصات حساب کاربری خود پرسید.
   - مشخصات را آنالیز کرده و به فارسی روان در فیلد "explanation" توضیح بده.

قوانین خروجی:
خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "update_profile" | "change_password" | "report",
  "data": {
    // فقط برای اکشن update_profile (فیلدهای ویرایش شده):
    "name": "نام جدید",
    "email": "ایمیل جدید",
    "phone": "تلفن جدید",
    "avatarUrl": "آدرس آواتار جدید"
  },
  "currentPassword": "رمز عبور فعلی (در صورت وجود، وگرنه null)",
  "newPassword": "رمز عبور جدید (فقط برای اکشن change_password، وگرنه null)",
  "warnings": [],
  "explanation": "توضیح فارسی روان از تغییراتی که قرار است انجام شود..."
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

      // Fetch admin's user info
      const user = await prisma.user.findFirst({
        where: { id: adminUser.id as string, shopId: adminUser.shopId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true
        }
      });

      const dynamicContext = `اطلاعات فعلی پروفایل شما (مدیر فروشگاه):\n${JSON.stringify(user, null, 2)}`;
      const userPrompt = `دستور کاربر: "${prompt}"`;

      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder - Admin Profile AI',
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

    // Direct Database Execution if 'execute' is true
    if (execute && aiParsed && aiParsed.success) {
      const user = await prisma.user.findFirst({
        where: { id: adminUser.id as string, shopId: adminUser.shopId }
      });

      if (!user) {
        throw new Error('کاربر یافت نشد.');
      }

      if (aiParsed.action === 'update_profile' && aiParsed.data) {
        const { name, email, phone, avatarUrl } = aiParsed.data;
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (email !== undefined && email.toLowerCase() !== user.email.toLowerCase()) {
          const duplicate = await prisma.user.findFirst({
            where: { email: email.toLowerCase(), shopId, id: { not: adminUser.id } }
          });
          if (duplicate) throw new Error('کاربری با این ایمیل جدید در سیستم وجود دارد.');
          updateData.email = email.toLowerCase();
        }

        await prisma.user.update({
          where: { id: adminUser.id as string },
          data: updateData
        });
      } else if (aiParsed.action === 'change_password' && aiParsed.newPassword) {
        if (!aiParsed.currentPassword) {
          throw new Error('برای تغییر رمز عبور، وارد کردن رمز عبور فعلی الزامی است.');
        }
        const isValid = await bcrypt.compare(aiParsed.currentPassword, user.password);
        if (!isValid) {
          throw new Error('رمز عبور فعلی ادمین اشتباه است.');
        }

        const hashedPassword = await bcrypt.hash(aiParsed.newPassword, 10);
        await prisma.user.update({
          where: { id: adminUser.id as string },
          data: { password: hashedPassword }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'مشخصات پروفایل با موفقیت بروزرسانی شد.',
        rawResult: aiParsed
      });
    }

    return NextResponse.json(aiParsed);

  } catch (error: any) {
    console.error('[ERROR] Profile AI Control Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
