// [HARDENED] — validation, error isolation, tenant isolation
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { clearShopDemoDataWithTx } from '@/lib/clear-demo-data';
import { Invalidate } from '@/lib/invalidate';
import { openRouterFetch } from '@/lib/openrouter-fetch';
import { parseAiJson } from '@/lib/parse-ai-json';

interface ArticleProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  brand: string | null;
  features: string | null;
  specs: string | null;
  imageUrl: string | null;
}

interface GeneratedArticle {
  content?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  faqs?: { question: string; answer: string }[];
}

// Generates a complete, SEO-ready blog article (mirrors the blog "all-in-one" generator)
// so accepting a calendar item produces a full draft, not just a skeleton.
async function generateFullArticle(params: {
  apiKey: string;
  model: string;
  title: string;
  summary: string;
  pillar?: string;
  keywords: string[];
  occasion?: string;
  isEvergreen?: boolean;
  brandName: string;
  brandGuidelines: string;
  shopUrl: string;
  host: string;
  products: ArticleProduct[];
}): Promise<GeneratedArticle | null> {
  const productsContext = params.products.map((p, i) => `
محصول ${i + 1}:
- شناسه: ${p.id}
- عنوان: ${p.title}
- برند: ${p.brand || 'نامشخص'}
- قیمت: ${p.price} تومان
- آدرس محصول (لینک): /product/${p.id}
- ویژگی‌ها: ${p.features || 'ندارد'}
- مشخصات فنی: ${p.specs || 'ندارد'}
- توضیحات: ${p.description || 'ندارد'}
- آدرس عکس محصول (imageUrl): ${p.imageUrl || 'ندارد'}
`).join('\n---\n');

  const systemPrompt = `تو یک نویسنده محتوای سئو، کپی‌رایتر و متخصص سئو تکنیکال هستی.
وظیفه تو این است که یک مقاله وبلاگ فوق‌العاده جامع، جذاب، سئو شده و کاملاً آماده را به صورت یکجا تولید کنی.

قوانین استایل‌دهی بصری شیک و مینیمال:
1. تمام پاراگراف‌های عادی با کلاس: <p class="text-justify leading-relaxed mb-4" style="text-align: justify;">
2. اولین پاراگراف مقدمه (لید) با کلاس: <p class="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 text-justify" style="text-align: justify;">
3. برجسته‌سازی هوشمند و محدود جملات کلیدی با <strong> (زیاده‌روی نکن).
4. باکس نکته مینیمال: <blockquote class="border-r-4 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl my-6 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">💡 <strong>نکته:</strong> ...</blockquote>
5. تیترهای فرعی: <h3 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4 border-b pb-2"> و <h4 class="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-6 mb-3">. هرگز از <h1> یا <h2> در بدنه استفاده نکن.
6. لیست‌ها: <ul class="list-disc list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;"> و <ol class="list-decimal list-inside space-y-2 my-4 ...">.
7. جدول مقایسه‌ای تمیز در صورت نیاز: <div class="overflow-x-auto my-6"><table class="w-full text-right border-collapse">...</table></div>.
8. حداکثر یک تا دو باکس کال‌تواکشن (CTA) با ساختار زیر (شناسه و عکس را دقیقاً از اطلاعات محصولات بردار؛ اگر imageUrl نبود تگ img را حذف کن):
   <div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right"><img src="آدرس_عکس_محصول" alt="عنوان_محصول" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" /><div class="flex-1"><h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب</h4><p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح ترغیب‌کننده...</p><a href="/product/ID" class="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all">مشاهده و خرید محصول</a></div></div>

قوانین محتوایی و سئو:
1. مقاله را کامل و باکیفیت بنویس (متناسب با موضوع، حدود ۸۰۰ تا ۱۵۰۰ کلمه)، با ساختار منظم و کلیدواژه‌های هدف.
2. نام برند: "${params.brandName}". دستورالعمل برند: "${params.brandGuidelines}". آدرس فروشگاه: "${params.shopUrl}" (دامنه: "${params.host}"). هرگز آدرس یا دامنه ساختگی نساز؛ فقط از "/" یا "${params.shopUrl}" استفاده کن.
3. لینک‌دهی داخلی طبیعی به محصولات با <a href="/product/ID" class="text-blue-600 hover:underline font-bold">نام محصول</a> (دقیقاً "/product/ID"، نه "/products/ID"). فقط از محصولات ارائه‌شده استفاده کن.
4. بخش سوالات متداول (۳ تا ۵ مورد) را فقط در فیلد faqs بده، نه داخل content.

خروجی فقط یک شیء JSON معتبر با این ساختار:
{
  "content": "محتوای کامل مقاله به صورت HTML تمیز و استایل‌دهی‌شده",
  "summary": "خلاصه کوتاه ۲ تا ۳ جمله‌ای",
  "seoTitle": "عنوان سئو (۵۰ تا ۶۰ کاراکتر)",
  "seoDescription": "توضیحات متا (۱۵۰ تا ۱۶۰ کاراکتر)",
  "tags": ["تگ۱", "تگ۲"],
  "faqs": [{ "question": "سوال؟", "answer": "پاسخ." }]
}`;

  const userContent = `موضوع/عنوان مقاله: "${params.title}"
خلاصه و زاویه محتوا: "${params.summary}"
نوع محتوا (pillar): "${params.pillar || 'مقاله'}"${params.isEvergreen === false && params.occasion ? `\nمناسبت مرتبط: "${params.occasion}"` : ''}
کلیدواژه‌های هدف: ${params.keywords.join('، ') || 'ندارد'}

محصولات مرتبط جهت لینک‌دهی و تولید محتوا:
${productsContext || 'محصولی انتخاب نشده است.'}`;

  try {
    const response = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder',
      },
      body: JSON.stringify({
        model: params.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 7000,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;
    if (!aiText) return null;
    const { data: parsed } = parseAiJson<GeneratedArticle>(aiText, ['content'], {});
    if (!parsed || !parsed.content || typeof parsed.content !== 'string' || parsed.content.trim().length < 50) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('[ContentCalendar] full article generation failed:', err);
    return null;
  }
}

interface CalendarItem {
  id: string;
  type: 'blog' | 'story' | 'discount';
  pillar?: string;
  isEvergreen?: boolean;
  occasionKey?: string;
  occasion: string;
  occasionDate?: string;
  occasionDateJalali?: string;
  title: string;
  summary: string;
  keywords: string[];
  targetProductIds: string[];
  categoryId: string | null;
  suggestedPublishAt: string;
  rationale: string;
  status: 'suggested' | 'accepted' | 'dismissed';
  createdPostId?: string | null;
  createdAt: string;
}

function readCalendar(raw: string | null): CalendarItem[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/['"«».,؛:!?()]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || `post-${Date.now().toString(36)}`
  );
}

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
      select: { contentCalendar: true },
    });

    const items = readCalendar(shop?.contentCalendar || '[]');

    // Build a product lookup for any product referenced by calendar items so the
    // UI can show product names and flag products that no longer exist.
    const referencedIds = Array.from(
      new Set(items.flatMap((it) => (Array.isArray(it.targetProductIds) ? it.targetProductIds : [])))
    );
    const products = referencedIds.length
      ? await prisma.product.findMany({
          where: { shopId, id: { in: referencedIds } },
          select: { id: true, title: true },
        })
      : [];
    const productMap: Record<string, string> = {};
    products.forEach((p) => { productMap[p.id] = p.title; });

    return NextResponse.json({ items, productMap });
  } catch (error) {
    console.error('[ERROR] [ContentCalendarGet]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId as string;

    const body = await req.json().catch(() => ({}));
    const { id, op } = body as { id?: string; op?: 'accept' | 'dismiss' | 'restore' };

    if (!id || !op) {
      return NextResponse.json({ error: 'پارامترهای id و op الزامی هستند.' }, { status: 400 });
    }

    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
      select: { contentCalendar: true, hasDemoData: true, themeColor: true, shopName: true, description: true, subdomain: true, customDomain: true },
    });
    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const items = readCalendar(shop.contentCalendar);
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'آیتم تقویم یافت نشد.' }, { status: 404 });
    }
    const item = items[index];

    if (op === 'dismiss') {
      items[index] = { ...item, status: 'dismissed' };
      await prisma.shopSettings.update({ where: { shopId }, data: { contentCalendar: JSON.stringify(items) } });
      return NextResponse.json({ success: true, items });
    }

    if (op === 'restore') {
      items[index] = { ...item, status: 'suggested' };
      await prisma.shopSettings.update({ where: { shopId }, data: { contentCalendar: JSON.stringify(items) } });
      return NextResponse.json({ success: true, items });
    }

    if (op === 'accept') {
      if (item.type !== 'blog') {
        return NextResponse.json({ error: 'فقط آیتم‌های نوع مقاله قابل زمان‌بندی خودکار هستند.' }, { status: 400 });
      }
      if (item.status === 'accepted' && item.createdPostId) {
        return NextResponse.json({ success: true, items, postId: item.createdPostId, alreadyAccepted: true });
      }

      // Clear demo data once before creating the first real post (same as posts route).
      if (shop.hasDemoData) {
        try {
          await prisma.$transaction(async (tx) => {
            await clearShopDemoDataWithTx(shopId, tx);
          });
        } catch (clearErr) {
          console.error('Failed to clear demo data on calendar accept:', clearErr);
        }
      }

      // Unique slug within the shop.
      const baseSlug = slugify(item.title);
      let uniqueSlug = baseSlug;
      let attempt = 0;
      while (true) {
        const existing = await prisma.blogPost.findFirst({ where: { shopId, slug: uniqueSlug } });
        if (!existing) break;
        attempt++;
        uniqueSlug = `${baseSlug}-${attempt}`;
      }

      // Validate category still exists.
      let categoryId: string | null = item.categoryId || null;
      if (categoryId) {
        const catExists = await prisma.blogCategory.findFirst({ where: { id: categoryId, shopId } });
        if (!catExists) categoryId = null;
      }

      // Keep only product targets that still exist; hidden `_prod_{id}` tags link to products.
      const validProducts: ArticleProduct[] = item.targetProductIds?.length
        ? await prisma.product.findMany({
            where: { shopId, id: { in: item.targetProductIds } },
            select: { id: true, title: true, description: true, price: true, brand: true, features: true, specs: true, imageUrl: true },
          })
        : [];
      const validProductIds = validProducts.map((p) => p.id);

      const keywords = Array.isArray(item.keywords) ? item.keywords : [];
      const keywordsLine = keywords.join('، ');

      // Skeleton content as a safe fallback if AI generation is unavailable or fails.
      const skeletonContent = `<p>${(item.summary || item.title).trim()}</p>
<p><em>این پیش‌نویس به‌صورت خودکار از تقویم محتوایی ساخته شده است. محتوای کامل را تکمیل و سپس منتشر کنید.</em></p>
${keywordsLine ? `<p><strong>کلیدواژه‌های هدف:</strong> ${keywordsLine}</p>` : ''}`;

      // Generate the full article via AI (OpenRouter). Falls back to skeleton on any failure.
      const aiSettings = await prisma.systemSetting.findMany({
        where: { key: { in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model', 'openrouter_blog_model'] } },
      });
      const aiMap = new Map(aiSettings.map((s) => [s.key, s.value]));
      const apiKey = aiMap.get('openrouter_api_key') || '';
      const aiEnabled = aiMap.get('ai_enabled') !== 'false';
      const aiModel = aiMap.get('openrouter_blog_model') || aiMap.get('openrouter_control_model') || aiMap.get('openrouter_model') || 'google/gemini-2.5-flash';

      const host = req.headers.get('host') || shop.customDomain || (shop.subdomain ? `${shop.subdomain}.localhost:3000` : 'localhost:3000');

      let articleContent = skeletonContent;
      let postSummary = item.summary || null;
      let postSeoTitle = item.title.trim();
      let postSeoDescription = item.summary || null;
      let resolvedTags = [...keywords];
      let resolvedFaqs: { question: string; answer: string }[] = [];

      if (aiEnabled && apiKey) {
        const generated = await generateFullArticle({
          apiKey,
          model: aiModel,
          title: item.title.trim(),
          summary: item.summary || '',
          pillar: item.pillar,
          keywords,
          occasion: item.occasion,
          isEvergreen: item.isEvergreen,
          brandName: shop.shopName || 'فروشگاه ما',
          brandGuidelines: shop.description || 'لحن صمیمی و حرفه‌ای',
          shopUrl: `http://${host}`,
          host,
          products: validProducts,
        });
        if (generated?.content) {
          articleContent = generated.content;
          if (generated.summary) postSummary = generated.summary;
          if (generated.seoTitle) postSeoTitle = generated.seoTitle;
          if (generated.seoDescription) postSeoDescription = generated.seoDescription;
          if (Array.isArray(generated.tags) && generated.tags.length) {
            resolvedTags = generated.tags.filter((t) => typeof t === 'string' && t.trim());
          }
          if (Array.isArray(generated.faqs)) {
            resolvedFaqs = generated.faqs.filter((f) => f && typeof f.question === 'string' && typeof f.answer === 'string');
          }
        }
      }

      const tags = [
        ...resolvedTags,
        ...validProductIds.map((pid) => `_prod_${pid}`),
      ];

      let finalFeaturedImage: string | null = null;
      try {
        const { generateMinimalImage } = require('@/lib/minimal-image');
        let categoryName: string | undefined;
        if (categoryId) {
          const category = await prisma.blogCategory.findUnique({ where: { id: categoryId } });
          if (category) categoryName = category.name;
        }
        finalFeaturedImage = generateMinimalImage(item.title.trim(), 'article', categoryName, shop.themeColor || undefined);
      } catch (imgErr) {
        finalFeaturedImage = null;
      }

      const publishDate = item.suggestedPublishAt && !isNaN(new Date(item.suggestedPublishAt).getTime())
        ? new Date(item.suggestedPublishAt)
        : new Date();

      const authorExists = payload.id
        ? await prisma.user.findFirst({ where: { id: payload.id as string, shopId } })
        : null;

      const post = await prisma.blogPost.create({
        data: {
          shopId,
          title: item.title.trim(),
          slug: uniqueSlug,
          content: articleContent,
          summary: postSummary,
          featuredImage: finalFeaturedImage,
          status: 'scheduled',
          publishedAt: publishDate,
          authorId: authorExists ? (payload.id as string) : null,
          categoryId,
          tags: JSON.stringify(tags),
          seoTitle: postSeoTitle,
          seoDescription: postSeoDescription,
          faqs: JSON.stringify(resolvedFaqs),
        },
      });

      items[index] = { ...item, status: 'accepted', createdPostId: post.id };
      await prisma.shopSettings.update({ where: { shopId }, data: { contentCalendar: JSON.stringify(items) } });

      try {
        await Invalidate.blogPost(shopId, post.slug);
      } catch (invErr) {
        console.error('Invalidate after calendar accept failed:', invErr);
      }

      return NextResponse.json({ success: true, items, postId: post.id });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر است.' }, { status: 400 });
  } catch (error) {
    console.error('[ERROR] [ContentCalendarPatch]:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
