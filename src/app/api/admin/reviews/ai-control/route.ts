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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند، فوق‌العاده سریع و دقیق برای مدیریت، بررسی، تایید، رد و ثبت نظرات مشتریان در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که لیست نظرات ثبت‌شده فعلی و محصولات فروشگاه را به همراه دستور (پرامپت) کاربر دریافت کنی، سناریوی عملیات را تشخیص دهی و دستور کاربر را تحلیل و استخراج کنی.

اطلاعات زمانی مبنا:
- امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)

═══════════════════════════════════
قوانین بسیار مهم برای تشخیص نظرات هدف (targetReviewIds) و محصولات مرتبط (productId):
═══════════════════════════════════
تو باید با دقت بالا نظرات یا محصولات هدف را شناسایی کنی.

۱. ثبت نظر جدید (action: "create"):
   - اگر کاربر خواست نظر جدیدی اضافه کند (مثلاً "یک نظر ۵ ستاره برای محصول کفش نایک علی تاجیک با متن عالیه بنویس" یا "نظر ثبت کن برای اسپیکر")، تو باید با بررسی لیست محصولات ارسالی، شناسه محصول (id) مورد نظر را پیدا کنی و آن را در فیلد "productId" خروجی قرار دهی.
   - نام نویسنده نظر را اگر مشخص نشده بود، یک نام ایرانی معتبر و تصادفی (مثل "امیرحسین رضایی"، "مریم حسینی"، "سارا احمدی"، "علی محمدی") بگذار.
   - امتیاز (rating) را بر اساس لحن کاربر یا صراحت پرامپت بین ۱ تا ۵ ستاره تنظیم کن (پیش‌فرض ۵ ستاره).
   - متن نظر (comment) را به فارسی روان و بسیار طبیعی بنویس؛ گویی که یک مشتری واقعی آن را ثبت کرده است.
   - فیلد "isBuyer" را به صورت پیش‌فرض true قرار بده مگر اینکه خلاف آن خواسته شود.
   - فیلد "showOnHomepage" را بر اساس درخواست کاربر (مثلاً "توی صفحه اصلی هم نشون داده بشه" -> true) تنظیم کن (پیش‌فرض false).

۲. تغییر وضعیت نظر (action: "update_status"):
   - اگر کاربر خواست نظرات را تایید، فعال، رد یا غیرفعال کند (مثلاً "نظرات تایید نشده را تایید کن" یا "نظرات کاربر مریم را تایید کن" یا "نظر مریم را رد کن").
   - تو باید وضعیت جدید را در فیلد "status" قرار دهی: "approved" (تایید شده)، "rejected" (رد شده)، "pending" (در انتظار تایید).
   - شناسه‌های نظرات هدف را در آرایه "targetReviewIds" قرار بده.

۳. حذف نظر (action: "delete"):
   - اگر کاربر خواست نظری را حذف کند (مثلاً "نظرات مریم را پاک کن" یا "نظر شماره فلان را حذف کن").
   - شناسه‌های نظرات هدف را در آرایه "targetReviewIds" قرار بده.

۴. گزارش‌گیری و تحلیل نظرات (action: "report"):
   - اگر کاربر گزارش یا تحلیل نظرات را خواست (مثلاً "یک گزارش از نظرات کاربران بده" یا "نظرات چه وضعیتی دارن؟").
   - تو باید با تحلیل لیست نظرات، یک گزارش فارسی بسیار دقیق، صمیمی، روان و آماری در فیلد "explanation" ارائه دهی.

═══════════════════════════════════
قوانین خروجی:
═══════════════════════════════════
خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد) بازنگردانی:

{
  "success": true,
  "action": "create" | "update_status" | "delete" | "report",
  "targetReviewIds": ["id1", "id2", ...], // فقط برای اکشن‌های update_status و delete
  "status": "approved" | "rejected" | "pending", // فقط برای اکشن update_status
  "data": {
    // فقط برای اکشن create:
    "productId": "شناسه محصول هدف",
    "userName": "نام نویسنده نظر",
    "avatarUrl": "آدرس تصویر پروفایل (اختیاری یا null)",
    "rating": 5, // عدد بین ۱ تا ۵
    "comment": "متن نظر تولید شده به فارسی روان و واقعی",
    "isBuyer": true,
    "showOnHomepage": false
  },
  "warnings": [
    "هشدار ۱: ...",
    "هشدار ۲: ..."
  ], // در صورت وجود تداخل یا هشدار منطقی، موارد را اینجا بنویس. در غیر این صورت آرایه خالی بگذار.
  "explanation": "توضیحات کامل فارسی از کاری که قرار است انجام شود یا گزارش تحلیل نظرات..."
}
`;

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopId } = adminUser;

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

      // Fetch current reviews and products list to give context to AI
      const [reviews, products] = await Promise.all([
        prisma.review.findMany({
          where: { shopId },
          include: {
            user: { select: { name: true, email: true } },
            product: { select: { title: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 30 // limits context size
        }),
        prisma.product.findMany({
          where: { shopId, isActive: true },
          select: { id: true, title: true },
          take: 50
        })
      ]);

      // Prune reviews for cleaner prompt token usage
      const reviewsContext = reviews.map(r => ({
        id: r.id,
        productTitle: r.product?.title || 'بدون نام',
        userName: r.user?.name || 'مشتری سایت',
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        showOnHomepage: r.showOnHomepage,
        createdAt: r.createdAt
      }));

      const userMessageContent = `دستور کاربر: "${prompt}"

لیست محصولات فعال برای انتساب نظر جدید:
${JSON.stringify(products)}

لیست نظرات ثبت شده اخیر فروشگاه:
${JSON.stringify(reviewsContext)}`;

      const { gregorianDate, jalaliDate, time } = getIranDateTime();
      const currentSystemPrompt = SYSTEM_PROMPT.replace(
        "- امروز: Tuesday, June 16, 2026 (سه‌شنبه، ۲۶ خرداد ۱۴۰۵)",
        `- امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
      );

      const response = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'SaaS Shop Builder Reviews AI Agent',
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            { role: 'system', content: currentSystemPrompt },
            { role: 'user', content: userMessageContent }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('OpenRouter error response:', errText);
        throw new Error('خطا در ارتباط با سرویس پردازش هوش مصنوعی.');
      }

      const resData = await response.json();
      const content = resData.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('پاسخی از هوش مصنوعی دریافت نشد.');
      }

      aiParsed = parseAiJson(content);
    }

    if (!aiParsed || !aiParsed.success) {
      return NextResponse.json({ error: 'قالب پاسخ هوش مصنوعی نامعتبر است.' }, { status: 500 });
    }

    // If preview is requested or it's a report, just return the preview structure
    if (preview || aiParsed.action === 'report') {
      return NextResponse.json(aiParsed);
    }

    // Otherwise, perform database execution directly
    if (aiParsed.action === 'create' && aiParsed.data) {
      const { productId, userName, avatarUrl, rating, comment, isBuyer, showOnHomepage } = aiParsed.data;
      if (!productId || !rating || !comment) {
        return NextResponse.json({ error: 'اطلاعات نظر جدید ناقص است.' }, { status: 400 });
      }

      // Create dummy user for the review
      const dummyUser = await prisma.user.create({
        data: {
          shopId,
          email: `manual-${Date.now()}-${Math.round(Math.random() * 1E5)}@shop.com`,
          name: userName || 'خریدار سایت',
          avatarUrl: avatarUrl || null,
          password: 'manual-reviews-password-not-used',
          role: 'customer'
        }
      });

      const newReview = await prisma.review.create({
        data: {
          shopId,
          productId,
          userId: dummyUser.id,
          rating: Number(rating),
          comment,
          isBuyer: !!isBuyer,
          status: 'approved',
          showOnHomepage: !!showOnHomepage
        }
      });

      return NextResponse.json({ success: true, action: 'create', id: newReview.id, review: newReview, explanation: aiParsed.explanation });
    }

    if (aiParsed.action === 'update_status' && aiParsed.targetReviewIds?.length > 0) {
      const { status } = aiParsed;
      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return NextResponse.json({ error: 'وضعیت نامعتبر است.' }, { status: 400 });
      }

      await prisma.review.updateMany({
        where: {
          shopId,
          id: { in: aiParsed.targetReviewIds }
        },
        data: { status }
      });

      return NextResponse.json({ success: true, action: 'update_status', count: aiParsed.targetReviewIds.length, explanation: aiParsed.explanation });
    }

    if (aiParsed.action === 'delete' && aiParsed.targetReviewIds?.length > 0) {
      await prisma.review.deleteMany({
        where: {
          shopId,
          id: { in: aiParsed.targetReviewIds }
        }
      });

      return NextResponse.json({ success: true, action: 'delete', count: aiParsed.targetReviewIds.length, explanation: aiParsed.explanation });
    }

    return NextResponse.json(aiParsed);
  } catch (error: any) {
    console.error('Error in reviews AI-control endpoint:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
