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


function pruneOrdersContext(prompt: string, orders: any[]) {
  const normalizedPrompt = prompt.toLowerCase();
  const before = JSON.stringify(orders).length;

  const statusKeywords = ['وضعیت', 'ارسال', 'پرداخت', 'status', 'shipping', 'payment', 'معلق', 'لغو', 'نهایی', 'تکمیل', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'];
  const financialKeywords = ['مبلغ', 'قیمت', 'فروش', 'درآمد', 'سود', 'amount', 'price', 'revenue', 'finalamount', 'تومان'];
  const customerKeywords = ['شهر', 'تلفن', 'نام', 'مشتری', 'موبایل', 'ایمیل', 'city', 'phone', 'name', 'customer', 'email', 'آدرس'];

  const hasStatus = statusKeywords.some(kw => normalizedPrompt.includes(kw));
  const hasFinancial = financialKeywords.some(kw => normalizedPrompt.includes(kw));
  const hasCustomer = customerKeywords.some(kw => normalizedPrompt.includes(kw));

  const keepAll = !hasStatus && !hasFinancial && !hasCustomer;

  const pruned = orders.map(o => {
    const item: any = { id: o.id, shortId: o.shortId };
    
    if (keepAll || hasStatus) {
      item.status = o.status;
      item.shippingStatus = o.shippingStatus;
      item.paymentStatus = o.paymentStatus;
    }
    if (keepAll || hasFinancial) {
      item.finalAmount = o.finalAmount;
    }
    if (keepAll || hasCustomer) {
      item.customerName = o.customerName;
      item.customerPhone = o.customerPhone;
      item.customerEmail = o.customerEmail;
      item.city = o.city;
    }
    
    item.createdAt = o.createdAt;
    item.items = o.items;
    return item;
  });

  const after = JSON.stringify(pruned).length;
  console.log(`[AI] Context reduced: ${before} → ${after} chars`);
  return pruned;
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند، فوق‌العاده سریع و دقیق برای مدیریت، ویرایش و کنترل سفارشات در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که لیست سفارشات موجود را به همراه دستور (پرامپت) کاربر دریافت کنی، سناریوی عملیات را تشخیص دهی و دستور کاربر را تحلیل و استخراج کنی.

اطلاعات زمانی مبنا:
- امروز: Tuesday, June 9, 2026 (سه‌شنبه، ۱۹ خرداد ۱۴۰۵)

═══════════════════════════════════
قوانین بسیار مهم برای تشخیص سفارشات هدف (targetOrderIds):
═══════════════════════════════════
تو باید با دقت و وسواس بسیار بالا، سفارشات هدف را شناسایی کنی تا از تغییرات ناخواسته یا اشتباه روی سفارشات دیگران یا سایر سفارشات غیرمرتبط مشتری جلوگیری شود.

۱. تطابق با محصول (کالا) درخواستی:
   - اگر کاربر به محصول خاصی در دستور خود اشاره کرده است (مثلاً "سفارش محصول کفش نایک علی تاجیک" یا "سفارش شلوار لی")، تو باید آرایه items تک‌تک سفارشات را بررسی کنی.
   - فقط و فقط شناسه‌های سفارشاتی را در targetOrderIds قرار بده که شامل محصول ذکر شده باشند.
   - به هیچ وجه تمام سفارشات آن شخص را انتخاب نکن! تغییر فله‌ای سفارشات یک مشتری در حالی که کاربر فقط یک محصول خاص را خواسته است، اکیداً ممنوع بوده و باعث خسارت سنگین می‌شود.

۲. تطابق با شناسه سفارش:
   - اگر کاربر شناسه سفارش (مانند شناسه کامل یا ۸ رقم آخر آن به صورت کوتاه در فیلد shortId) را ذکر کرده است، فقط و فقط همان یک سفارش را هدف قرار بده.

۳. تطابق با وضعیت پرداخت یا ارسال فعلی:
   - اگر کاربر گفت "سفارش‌های در انتظار پرداخت علی تاجیک" یا "سفارش‌های معلق علی تاجیک"، فقط سفارش‌هایی را انتخاب کن که وضعیت فعلی آن‌ها با خواسته کاربر مطابقت دارد (مثلاً paymentStatus یا status آن‌ها برابر "pending" باشد).

۴. عدم تغییر خودسرانه و فله‌ای سفارشات:
   - هرگز تمام سفارشات یک مشتری را تغییر نده، مگر اینکه کاربر صراحتاً از کلماتی مثل "همه سفارشات علی تاجیک"، "تمام فاکتورهای علی تاجیک" یا "هر چی سفارش داره" استفاده کرده باشد.
   - اگر کاربر گفت "سفارش علی تاجیک" و محصول خاصی را مشخص نکرد، اما علی تاجیک چندین سفارش دارد:
     * اگر فقط یکی از سفارشات او در وضعیت "pending" (در انتظار پرداخت) است، همان را انتخاب کن.
     * اگر چندین سفارش دارد، فقط آخرین سفارش ثبت شده او (جدیدترین بر اساس تاریخ یا موقعیت در لیست) را انتخاب کن و در توضیحات (explanation) به کاربر بگو که به دلیل وجود چندین سفارش، آخرین سفارش او را انتخاب کردی و بپرس که آیا سفارشات دیگر هم مد نظرش بوده یا خیر. هرگز همه را تغییر نده!

═══════════════════════════════════
قوانین تشخیص عملیات و خروجی:
═══════════════════════════════════
تو باید یکی از اکشن‌های زیر را تحت کلید "action" تشخیص دهی:

1. تغییر وضعیت سفارش (action: "update_status"):
   - اگر کاربر خواست وضعیت سفارش یا پرداخت یا ارسال مشتری خاصی را تغییر دهد (مثلاً "وضعیت سفارش علی تاجیک به نهایی تغییر کنه" یا "سفارش شماره فلان رو بزار روی ارسال شده").
   - تو باید فیلدهای تغییری را در شیء "updates" قرار دهی.
   - مقادیر مجاز برای فیلدهای وضعیت:
     * status: "pending" (در انتظار پرداخت)، "paid" (پرداخت شده)، "shipped" (ارسال شده)، "delivered" (تحویل شده)، "cancelled" (لغو شده)
     * shippingStatus: "new" (جدید)، "processing" (در حال آماده‌سازی)، "shipped" (ارسال شده)، "delivered" (تحویل شده/تکمیل شده)
     * paymentStatus: "pending" (در انتظار پرداخت)، "paid" (پرداخت موفق)، "failed" (پرداخت ناموفق)، "refunded" (مرجوع شده)
   - اگر کاربر گفت "نهایی" یا "تکمیل شده"، معمولاً منظور این است که:
     * status برابر "delivered" یا "paid" شود.
     * shippingStatus برابر "delivered" شود.
     * paymentStatus برابر "paid" شود.
   - شناسه‌های سفارشات هدف را در آرایه "targetOrderIds" قرار بده (با رعایت قوانین بالا).

2. چاپ فاکتور یا رسید پستی (action: "print_invoice"):
   - اگر کاربر خواست فاکتور یا رسید پستی/برچسب ارسال مشتری یا سفارش خاصی را چاپ کند (مثلاً "فاکتور علی تاجیک رو چاپ کن"، "رسید پستی سفارش فلان رو بده" یا "برچسب ارسال علی تاجیک").
   - شناسه‌های سفارشات هدف را در آرایه "targetOrderIds" قرار بده (با رعایت قوانین بالا).
   - حتماً نوع چاپ درخواستی را تحت کلید "printMode" مشخص کن:
     * اگر کاربر به "رسید پستی"، "رسید ارسال"، "برچسب پستی"، "لیبل پستی"، "برچسب ارسال"، "رسید"، "لیبل"، "برچسب" اشاره کرد، مقدار "printMode" را برابر "label" قرار بده.
     * اگر کاربر به "فاکتور"، "فاکتور خرید"، "صورتحساب" اشاره کرد، مقدار "printMode" را برابر "invoice" قرار بده.
     * اگر کاربر به هر دو اشاره کرد یا مشخص نکرد، مقدار "printMode" را برابر "both" قرار بده.

3. گزارش‌گیری (action: "report"):
   - اگر کاربر خواست گزارشی از وضعیت سفارشات بگیرد (مثلاً "یک گزارش بده از وضعیت سفارشات" یا "گزارش فروش امروز چقدره؟").
   - تو باید با تحلیل لیست سفارشات ارسالی، یک گزارش فوق‌العاده زیبا، دقیق، روان و حرفه‌ای به زبان فارسی در فیلد "explanation" تولید کنی.

- قوانین و محدودیت‌های اعتبارسنجی (بسیار مهم):
  ۱. وضعیت سفارش (status) فقط می‌تواند یکی از این مقادیر باشد: 'pending' (در انتظار پرداخت)، 'processing' (در حال آماده‌سازی)، 'shipped' (ارسال شده)، 'delivered' (تحویل شده)، 'cancelled' (لغو شده)، 'refunded' (مرجوع شده).
  ۲. شناسه‌های سفارشات هدف (targetOrderIds) حتماً باید به صورت یک آرایه معتبر از رشته‌ها ارسال شوند.

═══════════════════════════════════
قوانین تشخیص هشدارها و تداخل‌های منطقی (Warnings):
═══════════════════════════════════
تو باید با هوشمندی کامل، تداخل‌های تنظیماتی، ناسازگاری‌های منطقی یا مواردی که ممکن است ریسک مالی یا اشتباه مدیریتی داشته باشند را شناسایی کنی و آن‌ها را به صورت هشدارهای کاملاً واضح، دلسوزانه و راهنما به زبان فارسی در آرایه "warnings" قرار دهی.
مثال‌هایی از تداخل‌های منطقی در سفارشات:
۱. تغییر وضعیت به "ارسال شده" (shipped) در حالی که وضعیت پرداخت مشتری "pending" (در انتظار پرداخت) است (مگر اینکه روش پرداخت کارت به کارت یا پرداخت در محل باشد).
۲. تغییر وضعیت به "لغو شده" (cancelled) در حالی که سفارش قبلاً "ارسال شده" یا "تحویل شده" است.
۳. تغییر وضعیت پرداخت به "پرداخت شده" (paid) در حالی که سفارش قبلاً لغو شده است.
۴. تغییر وضعیت فله‌ای: اگر کاربر در حال تغییر وضعیت بیش از یک سفارش است (مثلاً ۳ سفارش همزمان)، هشدار بده: "توجه: شما در حال تغییر وضعیت همزمان ۳ سفارش هستید. لطفاً مطمئن شوید که این تغییرات روی تمامی این سفارشات مدنظر شماست."
۵. تغییر وضعیت به "تحویل شده" (delivered) در حالی که وضعیت ارسال هنوز "new" یا "processing" است.

تو باید این هشدارها را به عنوان یک مشاور دلسوز و متخصص مدیریت فروشگاه بنویسی تا مدیر فروشگاه از اشتباهات احتمالی مصون بماند.

═══════════════════════════════════
قوانین خروجی (بسیار مهم برای سرعت و بهینه‌سازی):
═══════════════════════════════════
- خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "update_status" | "print_invoice" | "report",
  "printMode": "invoice" | "label" | "both", // فقط در صورتی که اکشن print_invoice باشد، این فیلد الزامی است.
  "targetOrderIds": ["id1", "id2", ...],
  "updates": {
    // فقط در صورتی که اکشن update_status باشد، فیلدهای تغییریافته را اینجا بگذار:
    "status": "delivered",
    "shippingStatus": "delivered",
    "paymentStatus": "paid",
    "adminNotes": "تغییر وضعیت توسط دستیار هوشمند"
  },
  "warnings": [
    "هشدار ۱: ...",
    "هشدار ۲: ..."
  ], // در صورت وجود تداخل یا هشدار منطقی، موارد را اینجا بنویس. اگر هشداری نیست، این آرایه را خالی بگذار یا ارسال نکن.
  "explanation": "توضیحات فارسی روان، صمیمی و دقیق از کاری که قرار است انجام شود یا گزارش تحلیل سفارشات..."
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
    const { prompt, preview, execute, rawResult } = body;

    if (!execute) {
      const basicValidation = validateAiRequest(prompt ?? '');
      if (!basicValidation.valid) {
        return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
      }
    }

    if (!prompt && !rawResult) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    // If executing a pre-approved action, bypass AI call
    let parsedResult: any = null;
    if (execute && rawResult) {
      parsedResult = rawResult;
    } else {
      // 1. Parse prompt to extract phone numbers or names for database pre-filtering
      const normalizedPrompt = prompt.toLowerCase();
      
      // Extract phone number (e.g. 09123456789)
      const phoneMatch = normalizedPrompt.match(/(09\d{9})|(\+98\d{10})/);
      const phoneNumber = phoneMatch ? phoneMatch[0] : null;

      // Extract potential order ID (short cuid or full cuid)
      const words = normalizedPrompt
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?]/g, ' ')
        .split(/\s+/)
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 2);

      const stopWords = new Set([
        'را', 'به', 'در', 'از', 'با', 'رو', 'تا', 'بر', 'برای', 'روی', 'که', 'و', 'یک', 'این', 'آن',
        'کن', 'کنید', 'بده', 'بزن', 'شو', 'شود', 'باشه', 'باشد', 'کردن', 'همه', 'تمام', 'لیست',
        'سفارش', 'سفارشات', 'فاکتور', 'چاپ', 'گزارش', 'وضعیت', 'مشتری', 'تغییر', 'نهایی', 'تکمیل',
        'موبایل', 'شماره', 'تلفن'
      ]);

      const searchTerms = words.filter((w: string) => !stopWords.has(w));

      // Fetch matching orders (or latest 150 if no specific filter)
      let orders = await prisma.order.findMany({
        where: { shopId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  title: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      });

      // Filter in-memory for maximum safety and performance
      if (phoneNumber) {
        orders = orders.filter(o => 
          (o.phone && o.phone.includes(phoneNumber)) || 
          (o.user?.phone && o.user.phone.includes(phoneNumber))
        );
      } else if (searchTerms.length > 0) {
        orders = orders.filter(o => {
          return searchTerms.some((term: string) => {
            const inId = o.id.toLowerCase().includes(term);
            const inPhone = o.phone && o.phone.toLowerCase().includes(term);
            const inCity = o.city && o.city.toLowerCase().includes(term);
            const inName = o.user?.name && o.user.name.toLowerCase().includes(term);
            const inEmail = o.user?.email && o.user.email.toLowerCase().includes(term);
            const inUserPhone = o.user?.phone && o.user.phone.toLowerCase().includes(term);
            const inProducts = o.items.some(item => item.product?.title && item.product.title.toLowerCase().includes(term));
            return inId || inPhone || inCity || inName || inEmail || inUserPhone || inProducts;
          });
        });

        // Safe direct DB fallback with zero joins if no matches in memory
        if (orders.length === 0) {
          orders = await prisma.order.findMany({
            where: {
              shopId,
              OR: searchTerms.flatMap((term: string) => [
                { id: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term, mode: 'insensitive' } },
                { city: { contains: term, mode: 'insensitive' } }
              ])
            },
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true }
              },
              items: {
                include: { product: { select: { title: true } } }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          });
        }
      }

      // Fetch AI Settings
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      });

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

      // Prepare lightweight orders list for AI context
      const lightOrders = orders.map(o => ({
        id: o.id,
        shortId: o.id.slice(-8).toUpperCase(),
        customerName: o.user?.name || 'بدون نام',
        customerPhone: o.user?.phone || o.phone || 'بدون شماره',
        customerEmail: o.user?.email || 'بدون ایمیل',
        status: o.status,
        shippingStatus: o.shippingStatus,
        paymentStatus: o.paymentStatus,
        finalAmount: o.finalAmount,
        city: o.city,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : undefined,
        items: o.items.map(item => item.product?.title).filter(Boolean),
      }));

      // Apply Selective Context
      const prunedLightOrders = pruneOrdersContext(prompt, lightOrders);

      const dynamicContext = `لیست سفارشات موجود در سیستم برای بررسی و اعمال تغییرات:\n${JSON.stringify(prunedLightOrders, null, 2)}`;
      const userPrompt = `دستور کاربر: "${prompt}"`;

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
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'SaaS Shop Builder - Orders AI Control',
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
            max_tokens: 1500,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          throw new Error(`OpenRouter API error: ${errorText}`);
        }

        const responseData = await openRouterResponse.json();
        let aiText = responseData.choices?.[0]?.message?.content;

        if (!aiText) {
          throw new Error('No content returned from AI model');
        }

        const { data, warnings: parseWarnings } = parseAiJson<any>(
          aiText,
          ['success'],
          { success: false, explanation: 'پاسخ AI ناقص بود.' }
        );
        parsedResult = data;
        
        const outputIssues = validators.order({
          status: parsedResult.updates?.status,
          targetOrderIds: parsedResult.targetOrderIds
        });
        parsedResult.warnings = [...parseWarnings, ...outputIssues];
      } catch (err: any) {
        console.error(`AI Control failed:`, err);
        return NextResponse.json({ error: `دستیار هوشمند ناموفق بود: ${err?.message || 'خطای ناشناخته'}` }, { status: 502 });
      }
    }

    if (!parsedResult || !parsedResult.success) {
      return NextResponse.json({
        success: false,
        explanation: parsedResult?.explanation || 'دستور نامفهوم بود یا خطایی رخ داد.',
      });
    }

    const action = parsedResult.action;
    const targetOrderIds = parsedResult.targetOrderIds || [];

    // PREVIEW MODE: Calculate and return proposed changes without saving to DB
    if (preview) {
      if (action === 'report') {
        return NextResponse.json({
          success: true,
          preview: false,
          action: 'report',
          explanation: parsedResult.explanation,
        });
      }

      if (targetOrderIds.length === 0) {
        return NextResponse.json({
          success: false,
          explanation: 'سفارش هدف برای اعمال تغییرات یافت نشد. لطفاً نام مشتری یا شماره موبایل را دقیق‌تر وارد کنید.',
        });
      }

      // Fetch details of target orders
      const targetOrders = await prisma.order.findMany({
        where: { shopId, id: { in: targetOrderIds } },
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            }
          }
        }
      });

      const previewTargets = targetOrders.map(order => ({
        id: order.id,
        shortId: order.id.slice(-8).toUpperCase(),
        customerName: order.user?.name || 'بدون نام',
        customerPhone: order.user?.phone || order.phone || 'بدون شماره',
        currentStatus: order.status,
        proposedStatus: parsedResult.updates?.status || order.status,
        currentShippingStatus: order.shippingStatus,
        proposedShippingStatus: parsedResult.updates?.shippingStatus || order.shippingStatus,
        currentPaymentStatus: order.paymentStatus,
        proposedPaymentStatus: parsedResult.updates?.paymentStatus || order.paymentStatus,
        finalAmount: order.finalAmount,
      }));

      return NextResponse.json({
        success: true,
        preview: true,
        action,
        printMode: parsedResult.printMode || 'invoice',
        explanation: parsedResult.explanation,
        warnings: parsedResult.warnings || [],
        targets: previewTargets,
        rawResult: parsedResult,
      });
    }

    // EXECUTION MODE: Actually apply changes to database
    if (execute) {
      if (action === 'update_status' && targetOrderIds.length > 0) {
        const updates = parsedResult.updates || {};
        const updateData: any = {};

        if (updates.status) updateData.status = updates.status;
        if (updates.shippingStatus) updateData.shippingStatus = updates.shippingStatus;
        if (updates.paymentStatus) updateData.paymentStatus = updates.paymentStatus;
        if (updates.adminNotes) updateData.adminNotes = updates.adminNotes;

        // Process each order update
        for (const orderId of targetOrderIds) {
          const order = await prisma.order.findUnique({
            where: { id: orderId, shopId },
          });

          if (order && order.shopId === shopId) {
            let timeline: any[] = [];
            try {
              if (order.statusTimeline) {
                timeline = JSON.parse(order.statusTimeline);
              }
            } catch (e) {}

            const timelineEvents = [];
            const now = new Date();

            if (updates.status && updates.status !== order.status) {
              timelineEvents.push({
                title: `تغییر وضعیت عمومی سفارش`,
                description: `وضعیت سفارش توسط دستیار هوشمند به "${updates.status}" تغییر یافت.`,
                date: now.toISOString(),
              });
            }
            if (updates.shippingStatus && updates.shippingStatus !== order.shippingStatus) {
              timelineEvents.push({
                title: `تغییر وضعیت ارسال`,
                description: `وضعیت ارسال توسط دستیار هوشمند به "${updates.shippingStatus}" تغییر یافت.`,
                date: now.toISOString(),
              });
            }
            if (updates.paymentStatus && updates.paymentStatus !== order.paymentStatus) {
              timelineEvents.push({
                title: `تغییر وضعیت پرداخت`,
                description: `وضعیت پرداخت توسط دستیار هوشمند به "${updates.paymentStatus}" تغییر یافت.`,
                date: now.toISOString(),
              });
            }

            if (timelineEvents.length > 0) {
              timeline = [...timeline, ...timelineEvents];
              updateData.statusTimeline = JSON.stringify(timeline);
            }

            await prisma.order.update({
              where: { id: orderId, shopId },
              data: updateData,
            });

            // Award loyalty points if the order becomes paid
            const isBecomingPaid = (updates.paymentStatus === 'paid' && order.paymentStatus !== 'paid') || (updates.status === 'paid' && order.status !== 'paid');
            if (isBecomingPaid) {
              try {
                const { awardLoyaltyPoints } = await import('@/lib/loyalty');
                await awardLoyaltyPoints(order.userId, order.shopId, order.finalAmount);
              } catch (err) {
                console.error('Failed to award loyalty points on order update:', err);
              }
            }

            // Create notification for customer
            if (timelineEvents.length > 0) {
              await prisma.notification.create({
                data: {
                  shopId,
                  userId: order.userId,
                  title: 'به‌روزرسانی سفارش توسط سیستم',
                  message: `سفارش شما با شناسه ${order.id.slice(-8).toUpperCase()} به‌روزرسانی شد.`,
                  type: 'info',
                  linkUrl: `/profile/orders?orderId=${order.id}`,
                }
              });
            }
          }
        }

        return NextResponse.json({
          success: true,
          action: 'update_status',
          explanation: `✅ تغییرات وضعیت با موفقیت روی ${targetOrderIds.length} سفارش اعمال شد.\n\n${parsedResult.explanation}`,
          warnings: parsedResult.warnings
        });
      }

      if (action === 'print_invoice' && targetOrderIds.length > 0) {
        return NextResponse.json({
          success: true,
          action: 'print_invoice',
          targetOrderIds,
          printMode: parsedResult.printMode || 'invoice',
          explanation: parsedResult.explanation,
          warnings: parsedResult.warnings
        });
      }
    }

    return NextResponse.json({
      success: false,
      explanation: 'عملیات نامشخص است.',
    });

  } catch (error) {
    console.error('Error in Orders AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
