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
import { ADMIN_ROLES } from '@/lib/admin-roles';
import bcrypt from 'bcryptjs';

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت همکاران، پرسنل و دسترسی‌های کاربران ادمین (Staff & Role Management) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که لیست همکاران موجود در فروشگاه را به همراه دستور (پرامپت) کاربر دریافت کرده و اقدامات لازم (تعریف همکار جدید، ویرایش اطلاعات یا نقش همکار، حذف همکار، یا گزارش کلی همکاران) را تشخیص داده و خروجی ساختاریافته تولید کنی.

نقش‌های مجاز در سیستم (ADMIN_ROLES):
- 'admin': مدیر کل (دسترسی کامل)
- 'editor': نویسنده/ویرایشگر (فقط محتوا و بلاگ)
- 'storekeeper': انباردار (فقط موجودی و محصولات)
- 'support': پشتیبان (فقط تیکت‌ها و نظرات)

مبنای زمانی امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

انواع عملیات‌های مجاز (actions):
۱. تعریف همکار جدید (action: "create"):
   - اگر کاربر گفت "یک همکار جدید با ایمیل mery@gmail.com و نقش انباردار بساز" یا "علی را به عنوان ادیتور استخدام کن..."
   - تو باید نام را در "name"، ایمیل را در "email" (رشته معتبر انگلیسی)، شماره همراه را در "phone" (رشته معتبر)، رمز عبور را در "password" (حداقل ۶ کاراکتر - اگر مشخص نشده بود یک پسورد قوی پیش‌فرض مثل 'Staff1405!' بساز) و نقش را در "role" (یکی از نقش‌های مجاز بالا) قرار دهی.

۲. ویرایش اطلاعات همکار (action: "update"):
   - اگر کاربر گفت "نقش علی مهدوی رو بذار روی پشتیبان" یا "شماره تلفن همکار با ایمیل mery را تغییر بده به..." یا "حساب مریم را مسدود کن" یا "مریم را رفع مسدودیت کن".
   - تو باید شناسه همکار هدف را در "staffId" قرار دهی.
   - فیلدهای تغییر یافته را در شیء "data" بگذاری (مانند: "role", "name", "phone", "email", "isBlocked", "password").

۳. حذف همکار (action: "delete"):
   - اگر کاربر گفت "همکار مریم رضایی رو حذف کن" یا "دسترسی مریم رو لغو کن و پاکش کن".
   - تو باید شناسه همکار هدف را در "staffId" قرار دهی.

۴. گزارش‌گیری و خلاصه همکاران (action: "report"):
   - اگر کاربر خواست گزارش یا آماری از همکاران و نقش‌هایشان دریافت کند.
   - تو باید اطلاعات همکاران را آنالیز کرده و به فارسی روان در فیلد "explanation" گزارش دهی.

قوانین تطبیق هوشمند نام‌ها:
- با بررسی لیست همکاران، همکاری که بیشترین شباهت نام یا ایمیل را به پرامپت کاربر دارد پیدا کن و شناسه (id) او را در "staffId" قرار دهی.

قوانین خروجی:
خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "create" | "update" | "delete" | "report",
  "staffId": "شناسه همکار هدف (در صورت وجود، وگرنه null)",
  "data": {
    // فقط برای اکشن‌های create و update (فیلدهای ویرایش شده یا ایجاد شده):
    "name": "نام همکار",
    "email": "ایمیل همکار",
    "phone": "تلفن همراه",
    "password": "رمز عبور جدید (فقط در صورت لزوم تغییر یا ایجاد)",
    "role": "admin" | "editor" | "storekeeper" | "support",
    "isBlocked": true | false
  },
  "warnings": [],
  "explanation": "توضیح فارسی روان از کاری که قرار است انجام شود..."
}
`;

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - فقط مدیر کل دسترسی دارد' }, { status: 403 });
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

      // Fetch current staff members
      const staff = await prisma.user.findMany({
        where: {
          shopId,
          role: { in: ADMIN_ROLES }
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isBlocked: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const dynamicContext = `لیست همکاران فعلی سیستم:\n${JSON.stringify(staff, null, 2)}`;
      const userPrompt = `دستور کاربر: "${prompt}"`;

      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder - Staff Management AI',
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
      if (aiParsed.action === 'create' && aiParsed.data) {
        const { name, email, phone, password, role } = aiParsed.data;
        if (!email || !password || !role) {
          throw new Error('ایمیل، رمز عبور و نقش همکار الزامی است.');
        }

        // Enforce staff package limitations
        const shopSettings = await prisma.shopSettings.findUnique({
          where: { shopId },
          include: { package: true }
        });

        const isPackageActive = shopSettings?.packageExpiresAt ? new Date(shopSettings.packageExpiresAt) > new Date() : false;
        const activePackage = isPackageActive ? shopSettings?.package : null;
        let maxStaff = 0;
        let staffEnabled = false;

        if (activePackage) {
          try {
            const features = JSON.parse(activePackage.features);
            staffEnabled = !!features.staffEnabled;
            if (features.maxStaff) maxStaff = parseInt(features.maxStaff);
          } catch (e) {}
        }

        if (!staffEnabled) {
          throw new Error('قابلیت مدیریت همکاران در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.');
        }

        if (maxStaff > 0) {
          const currentStaffCount = await prisma.user.count({
            where: { shopId, role: { in: ADMIN_ROLES } }
          });
          if (currentStaffCount >= maxStaff) {
            throw new Error(`شما به حد نصاب تعریف همکار پکیج خود (${maxStaff} همکار) رسیده‌اید. لطفاً پکیج خود را ارتقا دهید.`);
          }
        }

        // Check if email already exists
        const exists = await prisma.user.findFirst({
          where: { email: email.toLowerCase(), shopId }
        });
        if (exists) {
          throw new Error('کاربری با این آدرس ایمیل از قبل در سیستم وجود دارد.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            shopId,
            name: name || null,
            email: email.toLowerCase(),
            phone: phone || null,
            password: hashedPassword,
            role,
            isBlocked: false
          }
        });
      } else if (aiParsed.action === 'update' && aiParsed.staffId && aiParsed.data) {
        const { name, email, phone, password, role, isBlocked } = aiParsed.data;
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (isBlocked !== undefined) {
          if (aiParsed.staffId === adminUser.id && isBlocked === true) {
            throw new Error('شما نمی‌توانید حساب کاربری خودتان را مسدود کنید.');
          }
          updateData.isBlocked = isBlocked;
        }
        if (role !== undefined) {
          if (aiParsed.staffId === adminUser.id && role !== 'admin') {
            throw new Error('شما نمی‌توانید نقش مدیریت کل خود را تنزل دهید.');
          }
          if (!ADMIN_ROLES.includes(role)) throw new Error('نقش انتخاب شده نامعتبر است.');
          updateData.role = role;
        }
        if (email !== undefined) {
          const duplicate = await prisma.user.findFirst({
            where: { email: email.toLowerCase(), shopId, id: { not: aiParsed.staffId } }
          });
          if (duplicate) throw new Error('کاربری با این ایمیل جدید در سیستم وجود دارد.');
          updateData.email = email.toLowerCase();
        }
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.updateMany({
          where: { id: aiParsed.staffId, shopId, role: { in: ADMIN_ROLES } },
          data: updateData
        });
      } else if (aiParsed.action === 'delete' && aiParsed.staffId) {
        if (aiParsed.staffId === adminUser.id) {
          throw new Error('شما نمی‌توانید اکانت خودتان را حذف کنید.');
        }
        await prisma.user.deleteMany({
          where: { id: aiParsed.staffId, shopId, role: { in: ADMIN_ROLES } }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'عملیات مدیریت همکاران با موفقیت روی بانک اطلاعاتی اجرا شد.',
        rawResult: aiParsed
      });
    }

    return NextResponse.json(aiParsed);

  } catch (error: any) {
    console.error('[ERROR] Staff AI Control Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
