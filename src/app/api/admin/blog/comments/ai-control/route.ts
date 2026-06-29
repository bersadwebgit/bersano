import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAiModel } from '@/lib/ai-model-resolver';

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

const SYSTEM_PROMPT = `تو یک مدیر/پشتیبان واقعی، صمیمی، بسیار مودب و خوش‌صحبت برای یک فروشگاه اینترنتی هستی. پاسخ تو باید کاملاً شبیه به یک انسان (مدیر واقعی فروشگاه) باشد و لحن خشک، رسمی یا هوش مصنوعی‌مانند نداشته باشد.

دستورالعمل‌های حیاتی تولید پاسخ:
۱. لحن بسیار طبیعی و شبیه به انسان (Human-like Admin): از نوشتن مقدمه‌های کلیشه‌ای و تکراری (مثل "با سلام و احترام، کاربر گرامی از نظر شما متشکریم...") خودداری کن. کاملاً گرم، صمیمی، دلسوزانه و خلاصه بنویس؛ دقیقاً مثل اینکه خود مدیر فروشگاه به سرعت و با محبت پاسخ کاربر را داده است.
۲. بسیار کوتاه، کاربردی و غیرپاراگرافی: پاسخ تو نباید طولانی یا به صورت پاراگراف‌های چند خطی و خسته‌کننده باشد! حداکثر طول پاسخ باید بین ۱ تا ۳ جمله کوتاه، روان و ساده باشد. مستقیم به سراغ پاسخ یا راهنمایی برو.
۳. ارجاع هوشمندانه به محصولات خودمان (اختیاری و بسیار محدود): لیست محصولات فعال فروشگاه در اختیار تو قرار دارد. فقط و فقط اگر کاربر سوالی مشخص درباره خرید، مشخصات فنی، موجودی یا قیمت کالاها پرسیده باشد، حداکثر ۱ محصول کاملاً مرتبط را معرفی کن. در صورتی که کامنت صرفاً یک نظر کلی، تشکر، یا بحث عمومی است، هرگز لینک محصول نفرست و فقط پاسخی دوستانه و انسانی بده.
۴. قالب لینک محصولات (حتماً به صورت هایپر لینک HTML): در صورت لزوم معرفی محصول، از قالب هایپر لینک HTML استفاده کن تا در وب‌سایت به درستی رندر شود. دقیقاً به این صورت:
   <a href="/product/ID" class="text-blue-600 hover:underline">نام محصول</a>
   دقت کن که ID همان شناسه واقعی محصول در لیست داده شده است.
۵. حفظ هویت و برندینگ فروشگاه: پاسخ باید کاملاً در راستای نام برند و وب‌سایت فروشگاه باشد. هرگز نامی از رقبا یا دامنه‌های خارجی متفرقه نبر.
۶. پاسخ به شکایات یا انتقادات: با لحنی بسیار همدلانه، صمیمی و عذرخواهانه پاسخ بده و او را به بخش تماس با ما یا پشتیبانی دعوت کن.

فرمت خروجی تو باید دقیقاً یک شیء JSON با کلید "response" باشد که حاوی متن پاسخ پیشنهادی است. هیچ متن اضافی قبل یا بعد از JSON بازنگردان.
قالب نمونه خروجی:
{
  "response": "متن پاسخ طبیعی و کوتاه شما در اینجا..."
}`;

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await req.json();
    const { commentId, preview, execute, rawResult } = body;

    // ===== Agent batch EXECUTE: persist the drafted replies =====
    if (execute && rawResult && Array.isArray(rawResult.replies)) {
      let saved = 0;
      for (const r of rawResult.replies) {
        try {
          if (!r?.commentId || !r?.suggestedReply) continue;
          const original = await prisma.blogComment.findFirst({ where: { id: r.commentId, shopId } });
          if (!original) continue;
          await prisma.blogComment.create({
            data: {
              shopId,
              postId: original.postId,
              parentId: original.id,
              name: payload.name || 'مدیر سایت',
              email: payload.email || '',
              content: String(r.suggestedReply).trim(),
              status: 'approved',
            },
          });
          // Approve the original comment so the public conversation is visible.
          await prisma.blogComment.update({ where: { id: original.id }, data: { status: 'approved' } });
          saved++;
        } catch (e) {
          console.error('Failed to persist blog comment reply:', e);
        }
      }
      return NextResponse.json({
        success: true,
        explanation: `پاسخ به ${saved} دیدگاه با موفقیت ثبت و منتشر شد.`,
        savedCount: saved,
      });
    }

    // ===== Agent batch PREVIEW: draft replies for unanswered blog comments =====
    if (!commentId && (preview || typeof body.prompt === 'string')) {
      const shopForBatch = await prisma.shopSettings.findUnique({ where: { shopId } });
      if (!shopForBatch) {
        return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
      }

      const apiKeySetting = await prisma.systemSetting.findUnique({ where: { key: 'openrouter_api_key' } });
      const batchApiKey = apiKeySetting?.value;
      if (!batchApiKey) {
        return NextResponse.json({ error: 'سرویس هوش مصنوعی (OpenRouter) پیکربندی نشده است.' }, { status: 503 });
      }
      const batchModel = await getAiModel('simple', shopId);

      // Unanswered, non-rejected top-level comments (no admin reply yet).
      const candidates = await prisma.blogComment.findMany({
        where: { shopId, parentId: null, status: { in: ['pending', 'approved'] }, replies: { none: {} } },
        include: { post: { select: { id: true, title: true, summary: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });

      if (candidates.length === 0) {
        return NextResponse.json({
          success: true,
          explanation: 'در حال حاضر هیچ دیدگاه بی‌پاسخی برای پاسخ‌گویی خودکار وجود ندارد.',
          rawResult: { replies: [] },
          replies: [],
        });
      }

      const batchProducts = await prisma.product.findMany({
        where: { shopId, isActive: true },
        take: 12,
        select: { id: true, title: true, price: true, description: true },
      });

      const host = req.headers.get('host') || '';
      const shopUrl = `http://${host}`;

      const replies: any[] = [];
      await Promise.all(candidates.map(async (c) => {
        try {
          const perCommentContent = `
اطلاعات فروشگاه:
- نام برند/فروشگاه: "${shopForBatch.shopName}"
- وب‌سایت فروشگاه: "${shopUrl}"

اطلاعات مقاله وبلاگ مرتبط:
- عنوان مقاله: "${c.post.title}"
- خلاصه مقاله: "${c.post.summary || ''}"

اطلاعات کامنت کاربر:
- نام نویسنده کامنت: "${c.name}"
- متن کامنت: "${c.content}"

لیست برخی از محصولات فعال فروشگاه جهت معرفی در صورت تناسب و نیاز:
${JSON.stringify(batchProducts.map(p => ({ id: p.id, title: p.title, price: p.price, description: p.description?.slice(0, 150) })), null, 2)}

لطفاً بهترین پاسخ مناسب و بهینه را بر اساس دستورالعمل‌ها به صورت شیء JSON با فیلد "response" تولید کن.`;

          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${batchApiKey}`,
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'SaaS Shop Builder Comment AI (Batch)',
            },
            body: JSON.stringify({
              model: batchModel,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: perCommentContent },
              ],
              temperature: 0.7,
              max_tokens: 1200,
            }),
          });

          if (!resp.ok) return;
          const rd = await resp.json();
          const txt = rd.choices?.[0]?.message?.content;
          if (!txt) return;
          const parsed = cleanAndParseJson(txt);
          const suggested = typeof parsed?.response === 'string'
            ? parsed.response
            : (typeof parsed === 'string' ? parsed : '');
          if (!suggested.trim()) return;
          replies.push({
            commentId: c.id,
            postId: c.postId,
            postTitle: c.post.title,
            name: c.name,
            content: c.content,
            suggestedReply: suggested.trim(),
          });
        } catch (e) {
          console.error('Batch comment reply generation failed:', e);
        }
      }));

      return NextResponse.json({
        success: true,
        explanation: `برای ${replies.length} دیدگاه بی‌پاسخ، پاسخ پیشنهادی آماده شد. پس از تأیید، پاسخ‌ها ثبت و منتشر می‌شوند.`,
        rawResult: { replies },
        replies,
      });
    }

    if (!commentId) {
      return NextResponse.json({ error: 'شناسه کامنت الزامی است.' }, { status: 400 });
    }

    // 1. Fetch Comment with associated blog post
    const comment = await prisma.blogComment.findFirst({
      where: {
        id: commentId,
        shopId,
      },
      include: {
        post: {
          select: {
            title: true,
            summary: true,
            content: true,
          }
        },
        parent: {
          select: {
            name: true,
            content: true,
          }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'دیدگاه یافت نشد.' }, { status: 404 });
    }

    // 2. Fetch Shop Settings for branding
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
    });

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    // 3. Fetch Active Products to promote / reference if relevant
    const products = await prisma.product.findMany({
      where: {
        shopId,
        isActive: true,
      },
      take: 12,
      select: {
        id: true,
        title: true,
        price: true,
        description: true,
      }
    });

    // 4. Fetch OpenRouter Configurations
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' },
    });

    const openrouterApiKey = openrouterApiKeySetting?.value;
    const openrouterModel = await getAiModel('simple', shopId);

    if (!openrouterApiKey) {
      return NextResponse.json({ 
        error: 'سرویس هوش مصنوعی (OpenRouter) پیکربندی نشده است. لطفاً کلید API را در تنظیمات سیستم وارد کنید.' 
      }, { status: 503 });
    }

    // 5. Prepare prompt data
    const shopDomain = shop.customDomain || (shop.subdomain ? `${shop.subdomain}.localhost:3000` : 'localhost:3000');
    const host = req.headers.get('host') || shopDomain;
    const shopUrl = `http://${host}`;

    const userMessageContent = `
اطلاعات فروشگاه:
- نام برند/فروشگاه: "${shop.shopName}"
- وب‌سایت فروشگاه: "${shopUrl}"

اطلاعات مقاله وبلاگ مرتبط:
- عنوان مقاله: "${comment.post.title}"
- خلاصه مقاله: "${comment.post.summary || ''}"

اطلاعات کامنت کاربر:
- نام نویسنده کامنت: "${comment.name}"
- ایمیل نویسنده کامنت: "${comment.email}"
- متن کامنت: "${comment.content}"
${comment.parent ? `- این کامنت پاسخ به دیدگاه قبلی از "${comment.parent.name}" با متن زیر است:\n« ${comment.parent.content} »` : ''}

لیست برخی از محصولات فعال فروشگاه جهت معرفی در صورت تناسب و نیاز:
${JSON.stringify(products.map(p => ({ id: p.id, title: p.title, price: p.price, description: p.description?.slice(0, 150) })), null, 2)}

لطفاً بهترین پاسخ مناسب و بهینه را بر اساس دستورالعمل‌ها به صورت شیء JSON با فیلد "response" تولید کن.
`;

    // 6. Call OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder Comment AI',
      },
      body: JSON.stringify({
        model: openrouterModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userMessageContent,
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      return NextResponse.json({ error: `خطا در فراخوانی هوش مصنوعی: ${errorText}` }, { status: 502 });
    }

    const responseData = await openRouterResponse.json();
    const aiText = responseData.choices?.[0]?.message?.content;

    if (!aiText) {
      return NextResponse.json({ error: 'پاسخی از هوش مصنوعی دریافت نشد.' }, { status: 502 });
    }

    const parsedResult = cleanAndParseJson(aiText);

    return NextResponse.json({
      success: true,
      response: parsedResult.response || parsedResult,
    });

  } catch (error: any) {
    console.error('[ERROR] [BlogCommentAiControl]:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش پاسخ هوشمند کامنت.' }, { status: 500 });
  }
}
