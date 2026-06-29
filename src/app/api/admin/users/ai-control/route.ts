// [AI-OPTIMIZED] — caching, selective context, retry added
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { getAiModel } from '@/lib/ai-model-resolver';
import { isRateLimited } from '@/lib/rate-limiter';

function cleanAndParseJson(text: string) {
  let cleaned = text.trim();
  
  const tryParse = (str: string) => {
    let cleanStr = str
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments on their own line
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // Replace smart quotes
    
    return JSON.parse(cleanStr);
  };

  try {
    return tryParse(cleaned);
  } catch (e) {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return tryParse(jsonMatch[1]);
      } catch (innerError) {}
    }
    
    const firstBracket = cleaned.indexOf('{');
    const lastBracket = cleaned.lastIndexOf('}');
    if (firstBracket !== -1 && lastBracket !== -1) {
      try {
        return tryParse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch (innerError) {}
    }
    
    console.error("Failed to parse AI response. Raw Response was:\n", text);
    throw new Error('Failed to parse AI response as JSON Object');
  }
}

function pruneUsersContext(prompt: string, users: any[]) {
  const normalizedPrompt = prompt.toLowerCase();
  const before = JSON.stringify(users).length;

  const pointsKeywords = ['امتیاز', 'points', 'loyalty', 'باشگاه', 'club'];
  const blockKeywords = ['مسدود', 'بلاک', 'فعال', 'غیرفعال', 'block', 'unblock'];
  const groupKeywords = ['گروه', 'دسته', 'طلایی', 'نقره', 'برنز', 'vip', 'group'];
  const ordersKeywords = ['سفارش', 'خرید', 'تعداد', 'orders', 'sales'];

  const hasPoints = pointsKeywords.some(kw => normalizedPrompt.includes(kw));
  const hasBlock = blockKeywords.some(kw => normalizedPrompt.includes(kw));
  const hasGroup = groupKeywords.some(kw => normalizedPrompt.includes(kw));
  const hasOrders = ordersKeywords.some(kw => normalizedPrompt.includes(kw));

  const keepAll = !hasPoints && !hasBlock && !hasGroup && !hasOrders;

  const pruned = users.map((u: any) => {
    const item: any = { id: u.id, name: u.name, email: u.email, phone: u.phone };
    
    if (keepAll || hasPoints) {
      item.loyaltyPoints = u.loyaltyPoints;
    }
    if (keepAll || hasBlock) {
      item.isBlocked = u.isBlocked;
    }
    if (keepAll || hasGroup) {
      item.group = u.group;
    }
    if (keepAll || hasOrders) {
      item.ordersCount = u.ordersCount;
    }
    
    item.createdAt = u.createdAt;
    return item;
  });

  const after = JSON.stringify(pruned).length;
  console.log(`[AI] Context reduced: ${before} → ${after} chars`);
  return pruned;
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند، فوق‌العاده دقیق و باتجربه برای مدیریت بخش باشگاه مشتریان (Customer Club) و مدیریت ارتباط با مشتری (CRM) در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که دستور (پرامپت) کاربر را دریافت کرده و بر اساس آن، لیستی از اقدامات (پیشنهادها) برای تغییر تنظیمات باشگاه مشتریان، تغییر گروه/دسته کاربران، تغییر امتیازات، مسدودسازی، تغییر رمز عبور، ثبت کاربر جدید یا خروجی گرفتن از اطلاعات کاربران تولید کنی.

مبنای زمانی امروز: Wednesday, June 10, 2026 (چهارشنبه، ۲۰ خرداد ۱۴۰۵)

برای این کار، تو اطلاعات زیر را دریافت می‌کنی:
1. دستور کاربر (Prompt)
2. تنظیمات فعلی باشگاه مشتریان (Current Club Settings)
3. لیست کاربران فعلی فروشگاه (Current Users) - شامل شناسه، نام، ایمیل، تلفن همراه، امتیاز، گروه فعلی، وضعیت مسدودیت، تاریخ ثبت‌نام.

═══════════════════════════════════
انواع اقدامات (Actions) قابل تولید:
═══════════════════════════════════
هر اقدام در آرایه "actions" باید یکی از انواع زیر باشد:

1. تغییر تنظیمات باشگاه مشتریان (updateSettings):
   - برای فعال/غیرفعال کردن باشگاه، تغییر نرخ کسب امتیاز، ارزش نقدی هر امتیاز، حد نصاب امتیاز، مبلغ تخفیف هدیه یا نوع تخفیف هدیه.
   - فرمت داده:
     {
       "type": "updateSettings",
       "data": {
         "customerClubEnabled": true/false (اختیاری),
         "loyaltyPointsRate": number (اختیاری - تومان خرید به ازای ۱ امتیاز),
         "loyaltyPointValue": number (اختیاری - ارزش نقدی هر امتیاز به تومان),
         "loyaltyDiscountThreshold": number (اختیاری - حد نصاب امتیاز برای کد تخفیف),
         "loyaltyDiscountAmount": number (اختیاری - مبلغ یا درصد تخفیف هدیه),
         "loyaltyDiscountType": "flat" یا "percentage" (اختیاری)
       }
     }

2. تغییر گروه/دسته کاربر (updateUserGroup):
   - برای دسته‌بندی کاربر در گروه‌های مختلف (مثلاً طلایی، نقره‌ای، برنزی، VIP، عادی و غیره).
   - فرمت داده:
     {
       "type": "updateUserGroup",
       "userId": "شناسه کاربر",
       "userName": "نام کاربر برای نمایش در لیست اقدامات",
       "group": "نام گروه جدید (مثلاً 'طلایی')"
     }

3. تغییر دستی امتیاز کاربر (adjustUserPoints):
   - برای افزایش یا کاهش امتیاز وفاداری کاربر.
   - فرمت داده:
     {
       "type": "adjustUserPoints",
       "userId": "شناسه کاربر",
       "userName": "نام کاربر",
       "points": number (مثبت برای افزایش، منفی برای کاهش امتیاز),
       "reason": "علت تغییر امتیاز به فارسی روان"
     }

4. مسدودسازی یا رفع مسدودیت کاربر (toggleUserBlock):
   - برای تغییر وضعیت دسترسی کاربر به فروشگاه.
   - فرمت داده:
     {
       "type": "toggleUserBlock",
       "userId": "شناسه کاربر",
       "userName": "نام کاربر",
       "isBlocked": true/false
     }

5. تغییر رمز عبور کاربر (changeUserPassword):
   - برای تغییر گذرواژه کاربر به یک رمز عبور جدید.
   - فرمت داده:
     {
       "type": "changeUserPassword",
       "userId": "شناسه کاربر",
       "userName": "نام کاربر",
       "password": "رمز عبور جدید (حداقل ۶ کاراکتر)"
     }

6. ویرایش اطلاعات کاربر (updateUserDetails):
   - برای ویرایش نام، تلفن همراه، یا ایمیل کاربر موجود.
   - فرمت داده:
     {
       "type": "updateUserDetails",
       "userId": "شناسه کاربر",
       "userName": "نام کاربر",
       "data": {
         "name": "نام جدید (اختیاری)",
         "phone": "شماره تلفن جدید (اختیاری)",
         "email": "ایمیل جدید (اختیاری)"
       }
     }

7. ثبت مشتری جدید (createUser):
   - برای ایجاد یک کاربر/مشتری جدید در سیستم.
   - فرمت داده:
     {
       "type": "createUser",
       "data": {
         "name": "نام و نام خانوادگی",
         "email": "آدرس ایمیل کاربر",
         "phone": "شماره تلفن همراه کاربر (اختیاری)",
         "password": "رمز عبور کاربر"
       }
     }

8. خروجی گرفتن از اطلاعات کاربران (exportUsers):
   - فقط و فقط برای دانلود فایل اکسل/CSV از یک «گروه» یا «دسته‌ای» از کاربران بر اساس فیلترهای جمعی (مثلاً کاربران مسدود شده، کاربران گروه طلایی، کاربران با امتیاز بالای ۱۰۰ و غیره).
   - این اقدام برای «نمایش/دریافت مشخصات یک مشتری مشخص» استفاده نمی‌شود (برای آن از اقدام شماره ۹ استفاده کن).
   - فرمت داده:
     {
       "type": "exportUsers",
       "filters": {
         "group": "نام گروه (اختیاری)",
         "isBlocked": true/false (اختیاری),
         "minPoints": number (اختیاری),
         "maxPoints": number (اختیاری),
         "userIds": ["شناسه کاربر ۱", "شناسه کاربر ۲"] (اختیاری - در صورتی که کاربر به افراد خاصی اشاره کرد)
       },
       "explanation": "توضیح فارسی روان درباره خروجی (مثلاً: خروجی اکسل از کاربران گروه طلایی با امتیاز بالای ۵۰)"
     }

9. نمایش/دریافت مشخصات یک مشتری مشخص (getUserDetails):
   - وقتی کاربر فقط می‌خواهد اطلاعات یک مشتری مشخص را ببیند یا دریافت کند (مثلاً "دریافت مشخصات مشتری با شماره 09158243254"، "اطلاعات علی تاجیک را نشان بده"، "مشخصات مشتری با ایمیل x را بده")، این یک اقدام «فقط‌خواندنی» است و هیچ تغییری در دیتابیس ایجاد نمی‌کند.
   - تو باید کاربرِ منطبق با شماره تلفن/نام/ایمیلِ ذکرشده را دقیقاً در لیست کاربران پیدا کنی و فقط مشخصات همان «یک» کاربر را برگردانی. به هیچ وجه نباید اطلاعات همه کاربران یا کاربران دیگر را برگردانی.
   - تطبیق شماره تلفن باید دقیق باشد: ارقام انگلیسی و فارسی، صفر ابتدایی و پیش‌شماره +98/0098 را نرمال‌سازی کن و فقط کاربری را انتخاب کن که شماره‌اش واقعاً با شماره درخواستی یکسان است. اگر هیچ کاربری با آن شماره دقیق نبود، طبق قانون «عدم وجود مشتری خاص» عمل کن (یافت نشد).
   - فرمت داده:
     {
       "type": "getUserDetails",
       "userId": "شناسه کاربر",
       "userName": "نام کاربر",
       "data": {
         "name": "نام کاربر",
         "phone": "شماره تلفن",
         "email": "ایمیل",
         "group": "گروه فعلی",
         "loyaltyPoints": number,
         "isBlocked": true/false,
         "ordersCount": number,
         "createdAt": "تاریخ عضویت"
       }
     }

10. تایید یا رد درخواست همکاری عمده (toggleWholesaler):
    - برای تایید یا رد وضعیت همکار عمده‌فروش برای یک کاربر.
    - اگر کاربر درخواست تایید درخواست همکاری شرکت یا شخصی را داد (مثلاً "درخواست همکاری شرکت مریم را تایید کن" یا "علی علوی را به عنوان همکار تایید کن" یا "درخواست همکاری مریم رضایی را رد کن"):
      * در لیست درخواست‌های همکاری معلق بگرد و درخواست مربوطه را بر اساس نام شرکت یا نام کاربر پیدا کن.
      * مقدار \`isWholesaler\` را \`true\` (برای تایید) یا \`false\` (برای رد) بگذار.
      * مقدار \`requestId\` را برابر شناسه درخواست (\`id\`) پیدا شده بگذار.
      * مقدار \`status\` را برابر \`approved\` (برای تایید) یا \`rejected\` (برای رد) بگذار.
    - فرمت داده:
      {
        "type": "toggleWholesaler",
        "userId": "شناسه کاربر",
        "userName": "نام کاربر",
        "isWholesaler": true/false,
        "requestId": "شناسه درخواست (اختیاری)",
        "status": "approved" / "rejected" (اختیاری)
      }

11. مدیریت سقف اعتبار خرید عمده (updateCredit):
    - برای تغییر سقف اعتبار خرید عمده (اعتباری) همکار.
    - اگر کاربر خواست سقف اعتبار یک همکار را تغییر دهد (مثلاً "اعتبار خرید عمده علی تاجیک را به ۵۰ میلیون تومان تغییر بده" یا "سقف اعتبار مریم رضایی را ۱۰ میلیون تومان کن"):
      * کاربر را در لیست کاربران پیدا کن.
      * مقدار \`creditLimit\` را به تومان (مثلاً ۵۰۰۰۰۰۰۰ برای ۵۰ میلیون تومان) قرار بده.
      * اگر کاربر خواست بدهی همکار صفر شود یا حسابش تسویه شود، مقدار \`resetBalance\` را \`true\` بگذار.
    - فرمت داده:
      {
        "type": "updateCredit",
        "userId": "شناسه کاربر",
        "userName": "نام کاربر",
        "creditLimit": number,
        "resetBalance": true/false (اختیاری)
      }

═══════════════════════════════════
قوانین بسیار مهم تحلیل و تطبیق نام‌ها:
═══════════════════════════════════
1. تطبیق هوشمند نام کاربر:
   - اگر کاربر گفت "علی تاجیک را مسدود کن" یا "امتیاز مریم رضایی را ۵۰ تا زیاد کن"، تو باید در لیست کاربران جستجو کنی و کاربری که نامش بیشترین شباهت را دارد پیدا کنی و شناسه (id) او را در اقدام قرار دهی.
   - اگر نام کاربر را پیدا نکردی، اما ایمیل یا تلفن همراه مشابهی دیدی، از آن استفاده کن.
   - @اگر اصلاً کاربری با این نام پیدا نشد، در بخش "warnings" بنویس که کاربری با نام فلان یافت نشد.

2. عدم وجود مشتری خاص (عدم تطبیق) — بسیار حیاتی:
   - اگر کاربر درخواست نمایش/دریافت مشخصات، خروجی گرفتن، مسدود کردن، ویرایش یا هر کار دیگری برای یک مشتری خاص (با ذکر نام، شماره تلفن یا ایمیل مشخص) داشت، اما هیچ کاربری با این مشخصات دقیق در لیست کاربران فعلی فروشگاه وجود نداشت:
     * باید "success" را برابر false قرار دهی.
     * بخش "actions" باید حتماً یک آرایه خالی ([]) باشد.
     * در "explanation" یک پیام روشن و مودبانه به فارسی بنویس که دقیقاً اعلام کند مشتری با آن شماره/نام/ایمیلِ مشخص یافت نشد (مثلاً: «مشتری‌ای با شماره ۰۹۱۲۰۱۴۳۰۰۴ در فروشگاه شما ثبت نشده است.»).
     * به هیچ وجه نباید خروجی کلی از همه کاربران تولید کنی، اقدام exportUsers بدون فیلتر بسازی، یا اقدامی با شناسه نامعتبر/حدسی بفرستی.

3. محاسبات ریاضی فیلترها و تنظیمات:
   - اگر کاربر گفت "نرخ امتیاز را دو برابر کن"، مقدار فعلی \`loyaltyPointsRate\` را در ۲ ضرب کن.
   - اگر گفت "باشگاه مشتریان را فعال کن و حد نصاب را روی ۲۰۰ بذار"، هم \`customerClubEnabled\` را true کن و هم \`loyaltyDiscountThreshold\` را ۲۰۰ قرار بده.

4. خروجی نهایی:
   - خروجی تو باید **حتماً و بدون هیچ متنی قبل یا بعد از آن**، یک شیء JSON معتبر با ساختار زیر باشد:
     {
       "success": true,
       "explanation": "توضیح کلی درباره کارهایی که قرار است انجام شود به زبان فارسی روان و صمیمی",
       "warnings": ["هشدار ۱ در صورت وجود", "هشدار ۲..."],
       "actions": [
         // لیست اقدامات پیشنهادی
       ]
     }
   - @اگر دستور کاربر نامفهوم بود یا هیچ اقدامی قابل استخراج نبود، \`success\` را false قرار بده و در \`explanation\` علت را توضیح بده.
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
    const { prompt, users, settings: currentSettings, wholesaleRequests } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    // Fetch OpenRouter settings
    const systemSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
        }
      }
    });

    const settingsMap = new Map(systemSettings.map(s => [s.key, s.value]));

    if (settingsMap.get('ai_enabled') === 'false') {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
    }

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = await getAiModel('simple', shopId);

    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی کنترل هوشمند در حال حاضر پیکربندی نشده است.' }, { status: 503 });
    }

    // Format users list to minimize tokens
    const formattedUsers = (users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || u.addresses?.[0]?.phone || null,
      loyaltyPoints: u.loyaltyPoints || 0,
      isBlocked: !!u.isBlocked,
      group: u.group || 'عادی',
      ordersCount: u.orders?.length || 0,
      createdAt: u.createdAt,
      isWholesaler: !!u.isWholesaler,
      creditLimit: u.creditLimit || 0,
      creditBalance: u.creditBalance || 0
    }));

    // Format wholesale requests
    const formattedRequests = (wholesaleRequests || []).map((r: any) => ({
      id: r.id,
      userId: r.userId,
      companyName: r.companyName,
      businessType: r.businessType,
      phone: r.phone,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt
    }));

    // Apply Selective Context
    const prunedUsers = pruneUsersContext(prompt, formattedUsers);

    const dynamicContext = `تنظیمات فعلی باشگاه مشتریان:\n${JSON.stringify(currentSettings, null, 2)}\n\nلیست کاربران فعلی فروشگاه (تا ۱۰۰ کاربر اخیر):\n${JSON.stringify(prunedUsers.slice(0, 100), null, 2)}\n\nدرخواست‌های همکاری عمده‌فروشی معلق یا اخیر:\n${JSON.stringify(formattedRequests, null, 2)}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - CRM & Loyalty AI',
    };

    const { gregorianDate, jalaliDate, time } = getIranDateTime();
    const currentSystemPrompt = SYSTEM_PROMPT.replace(
      "مبنای زمانی امروز: Wednesday, June 10, 2026 (چهارشنبه، ۲۰ خرداد ۱۴۰۵)",
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

    try {
      const response = await openRouterFetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(apiBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[ERROR] OpenRouter API Error:', errText);
        return NextResponse.json({ error: 'خطا در ارتباط با سرویس هوش مصنوعی.' }, { status: 502 });
      }

      const resData = await response.json();
      const aiText = resData.choices?.[0]?.message?.content || '';
      
      const parsedResult = cleanAndParseJson(aiText);
      return NextResponse.json(parsedResult);
    } catch (err: any) {
      console.error('[ERROR] CRM AI Control failed:', err);
      return NextResponse.json({
        success: false,
        explanation: 'متأسفانه دستیار هوشمند نتوانست پاسخ معتبری تولید کند. لطفاً مجدداً تلاش کنید یا دستور خود را واضح‌تر بنویسید.',
        warnings: ['خطا در ارتباط یا پارس پاسخ هوش مصنوعی'],
        actions: []
      });
    }

  } catch (error) {
    console.error('[ERROR] CRM AI Control Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
