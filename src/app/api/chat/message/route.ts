import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { openRouterFetch, parseOpenRouterJsonResponse } from '@/lib/openrouter-fetch';
import { parseAiJson } from '@/lib/parse-ai-json';
import { getAiModel } from '@/lib/ai-model-resolver';
import { searchProducts } from '@/lib/product-search';
import { isRateLimited } from '@/lib/rate-limiter';
import { callAiGateway } from '@/lib/ai-gateway';

const PERSIAN_STOPWORDS = new Set([
  'این', 'آن', 'چی', 'چرا', 'چگونه', 'است', 'هست', 'بود', 'شد', 'با', 'در', 'به', 'از', 'رو', 'تا', 'که', 'را', 'یک', 'من', 'تو', 'او', 'ما', 'شما', 'آنها', 'برای', 'روی', 'زیر', 'هم', 'همین', 'همان', 'و', 'یا', 'اما', 'اگر', 'ولی', 'کی', 'کجا', 'کدام', 'کدوم', 'چند', 'چقدر', 'چطور', 'دارد', 'دارند', 'دارم', 'داریم', 'دارید', 'کنید', 'کنم', 'کنیم', 'کنند', 'کند', 'بسیار', 'خیلی', 'لطفا', 'لطفاً', 'ممنون', 'تشکر', 'سلام', 'درود', 'خوب', 'بد', 'عالی', 'مرسی', 'اینها', 'آنها', 'چیز', 'چیزها', 'کار', 'کارهای', 'مورد', 'موردی', 'باره', 'بابت', 'درباره', 'جهت', 'حدود', 'حدودی'
]);

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'درخواست نامعتبر است.' }, { status: 400 });
    }

    const { sessionId, message, sender = 'customer', messageType = 'text', metadata } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
      return NextResponse.json({ error: 'شناسه نشست نامعتبر است.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'متن پیام نمی‌تواند خالی باشد.' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'متن پیام نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد.' }, { status: 400 });
    }

    // Verify session exists and belongs to shop
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.shopId !== shop.shopId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Layered Rate Limiting (only for customer messages)
    if (sender !== 'admin') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
      const ipLimit = await isRateLimited(`chat:ip:${ip}`, 10, 60000);
      const sessionLimit = await isRateLimited(`chat:session:${sessionId}`, 20, 10 * 60000);
      const shopLimit = await isRateLimited(`chat:shop:${shop.shopId}`, 100, 60000);

      if (ipLimit || sessionLimit || shopLimit) {
        return NextResponse.json({ error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.' }, { status: 429 });
      }
    }

    // Save user message
    const savedMessage = await prisma.chatMessage.create({
      data: {
        shopId: shop.shopId,
        sessionId,
        sender,
        message,
        messageType,
        metadata: metadata || null,
      }
    });

    // Update session's updatedAt time
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    // If sender is admin, we don't trigger AI auto-reply
    if (sender === 'admin') {
      return NextResponse.json({ message: savedMessage });
    }

    // If session is in manual mode, do not trigger AI auto-reply
    if (session.mode === 'manual') {
      return NextResponse.json({ message: savedMessage });
    }

    // Trigger AI Auto-Reply
    try {
      // Smart database search for relevant products and articles
      const cleanedMessage = cleanText(message);
      const words = cleanedMessage.split(/\s+/).filter((w: string) => w.length > 1 && !PERSIAN_STOPWORDS.has(w));
      
      let products: any[] = [];
      let articles: any[] = [];

      if (words.length > 0) {
        // Query candidate products matching any keyword
        const candidateProducts = await prisma.product.findMany({
          where: {
            shopId: shop.shopId,
            isActive: true,
            OR: words.map((w: string) => ({
              OR: [
                { title: { contains: w, mode: 'insensitive' } },
                { brand: { contains: w, mode: 'insensitive' } },
                { description: { contains: w, mode: 'insensitive' } }
              ]
            }))
          },
          select: {
            id: true,
            title: true,
            price: true,
            discount: true,
            brand: true,
            description: true,
          },
          take: 50 // Fetch up to 50 candidates to rank in memory
        });

        // Score and rank candidate products
        const scoredProducts = candidateProducts.map((product: any) => {
          let score = 0;
          const titleLower = (product.title || '').toLowerCase();
          const brandLower = (product.brand || '').toLowerCase();
          const descLower = (product.description || '').toLowerCase();

          words.forEach((word: string) => {
            const wordLower = word.toLowerCase();

            // Exact word match in title gets highest score
            const titleWords = titleLower.split(/\s+/);
            if (titleWords.includes(wordLower)) {
              score += 15;
            } else if (titleLower.includes(wordLower)) {
              score += 8; // Substring match in title
            }

            // Brand match
            if (brandLower && brandLower.includes(wordLower)) {
              score += 5;
            }

            // Description match
            if (descLower && descLower.includes(wordLower)) {
              score += 2;
            }
          });

          // Bonus for matching multiple keywords
          let matchedWordsCount = 0;
          words.forEach((word: string) => {
            const wordLower = word.toLowerCase();
            if (titleLower.includes(wordLower) || (brandLower && brandLower.includes(wordLower)) || (descLower && descLower.includes(wordLower))) {
              matchedWordsCount++;
            }
          });

          if (matchedWordsCount > 1) {
            score += Math.pow(matchedWordsCount, 2) * 5;
          }

          return { product, score };
        });

        // Sort by score descending and take top 5
        scoredProducts.sort((a: any, b: any) => b.score - a.score);
        products = scoredProducts.slice(0, 5).map((item: any) => item.product);

        // Query candidate articles matching any keyword
        const candidateArticles = await prisma.blogPost.findMany({
          where: {
            shopId: shop.shopId,
            status: 'published',
            OR: words.map((w: string) => ({
              OR: [
                { title: { contains: w, mode: 'insensitive' } },
                { summary: { contains: w, mode: 'insensitive' } },
                { content: { contains: w, mode: 'insensitive' } }
              ]
            }))
          },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            content: true,
          },
          take: 30 // Fetch up to 30 candidates to rank in memory
        });

        // Score and rank candidate articles
        const scoredArticles = candidateArticles.map((article: any) => {
          let score = 0;
          const titleLower = (article.title || '').toLowerCase();
          const summaryLower = (article.summary || '').toLowerCase();
          const contentLower = (article.content || '').toLowerCase();

          words.forEach((word: string) => {
            const wordLower = word.toLowerCase();

            // Exact word match in title gets highest score
            const titleWords = titleLower.split(/\s+/);
            if (titleWords.includes(wordLower)) {
              score += 15;
            } else if (titleLower.includes(wordLower)) {
              score += 8; // Substring match in title
            }

            // Summary match
            if (summaryLower && summaryLower.includes(wordLower)) {
              score += 5;
            }

            // Content match
            if (contentLower && contentLower.includes(wordLower)) {
              score += 2;
            }
          });

          // Bonus for matching multiple keywords
          let matchedWordsCount = 0;
          words.forEach((word: string) => {
            const wordLower = word.toLowerCase();
            if (titleLower.includes(wordLower) || summaryLower.includes(wordLower) || contentLower.includes(wordLower)) {
              matchedWordsCount++;
            }
          });

          if (matchedWordsCount > 1) {
            score += Math.pow(matchedWordsCount, 2) * 5;
          }

          return { article, score };
        });

        // Sort by score descending and take top 3
        scoredArticles.sort((a: any, b: any) => b.score - a.score);
        articles = scoredArticles.slice(0, 3).map((item: any) => {
          // Exclude content from the final object passed to LLM to save tokens
          const { content, ...rest } = item.article;
          return rest;
        });
      }

      // Augment keyword matches with semantic (vector) search for better recall.
      // Gracefully skips when embeddings/config are unavailable (returns []).
      try {
        const semantic = await searchProducts({ shopId: shop.shopId, query: message, maxResults: 5 });
        if (semantic.length > 0) {
          const existingIds = new Set(products.map((p: any) => p.id));
          const newIds = semantic.map((s) => s.id).filter((id) => !existingIds.has(id));
          if (newIds.length > 0) {
            const semanticDetails = await prisma.product.findMany({
              where: { id: { in: newIds }, shopId: shop.shopId, isActive: true },
              select: { id: true, title: true, price: true, discount: true, brand: true, description: true },
            });
            // Prepend semantic hits, keep the combined list compact for token budget.
            products = [...semanticDetails, ...products].slice(0, 6);
          }
        }
      } catch (semanticErr) {
        console.error('[ChatAutoReply] Semantic search augmentation skipped:', semanticErr);
      }

      // If no keyword matches, fetch default popular products/articles
      if (products.length === 0) {
        products = await prisma.product.findMany({
          where: { shopId: shop.shopId, isActive: true },
          select: { id: true, title: true, price: true, discount: true, brand: true, description: true },
          orderBy: { createdAt: 'desc' },
          take: 3
        });
      }
      if (articles.length === 0) {
        articles = await prisma.blogPost.findMany({
          where: { shopId: shop.shopId, status: 'published' },
          select: { id: true, title: true, slug: true, summary: true },
          orderBy: { createdAt: 'desc' },
          take: 2
        });
      }

      // Load shop settings (address, phone, FAQs)
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: shop.shopId },
        select: {
          shopName: true,
          address: true,
          contactPhone: true,
          faqsConfig: true,
        }
      });

      const systemPrompt = `You are an intelligent, helpful, and polite customer support assistant for an online shop named "${shopSettings?.shopName || 'فروشگاه ما'}".
Your goal is to answer the customer's question accurately, concisely, and politely in Persian (Farsi).

You have access to the following shop details:
- Shop Name: ${shopSettings?.shopName || 'فروشگاه ما'}
- Address: ${shopSettings?.address || 'ثبت نشده'}
- Phone: ${shopSettings?.contactPhone || 'ثبت نشده'}
- FAQs: ${shopSettings?.faqsConfig || '[]'}

Here is a list of relevant products currently available in our store:
${JSON.stringify(products)}

Here is a list of relevant blog articles currently available in our store:
${JSON.stringify(articles)}

Instructions:
1. Answer the user's question directly and politely in Persian. Keep it concise (max 3-4 sentences) to save tokens and read nicely on mobile devices.
2. Use markdown formatting to make the text highly readable and professional. You MUST bold important parts (like product names, prices, discounts, telephone numbers, or key steps) using double asterisks (e.g., **نام محصول** or **قیمت**).
3. If the user is looking for a product or article, or if a product/article from the list is highly relevant to their question, suggest it.
4. You MUST return your response strictly as a JSON object with the following fields:
   - "reply": The text response to the user (formatted with markdown bolds).
   - "suggestedProducts": An array of product IDs (from the provided list) that are highly relevant to the user's query. Max 2 products.
   - "suggestedArticles": An array of blog post IDs (from the provided list) that are highly relevant to the user's query. Max 2 articles.

Format your response strictly as a JSON object. Do not include any markdown formatting outside the JSON block.`;

      const result = await callAiGateway<{
        reply: string;
        suggestedProducts: string[];
        suggestedArticles: string[];
      }>({
        shopId: shop.shopId,
        endpoint: 'chat-message',
        slot: 'chat',
        featureKey: 'aiChatEnabled',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        mode: 'json',
        temperature: 0.5,
        maxTokens: 1000,
        requiredFields: ['reply'],
        fallbackValue: {
          reply: 'متاسفانه در حال حاضر قادر به پاسخگویی نیستم. پیام شما برای مدیریت ارسال شد.',
          suggestedProducts: [],
          suggestedArticles: []
        }
      });

      let parsedAi = {
        reply: 'متاسفانه در حال حاضر قادر به پاسخگویی نیستم. پیام شما برای مدیریت ارسال شد.',
        suggestedProducts: [] as string[],
        suggestedArticles: [] as string[]
      };

      if (result.success && result.data) {
        parsedAi = result.data;
      } else if (result.error) {
        console.error('[ChatAutoReply] callAiGateway failed:', result.error);
        if (result.error.includes('پکیج') || result.error.includes('محدودیت') || result.error.includes('سهمیه') || result.error.includes('غیرفعال')) {
          parsedAi.reply = result.error;
        }
      }

      // Save AI Text Reply
      const aiMessage = await prisma.chatMessage.create({
        data: {
          shopId: shop.shopId,
          sessionId,
          sender: 'ai',
          message: parsedAi.reply,
          messageType: 'text',
        }
      });

      // If AI suggested products, fetch full details and save as product message
      if (parsedAi.suggestedProducts && parsedAi.suggestedProducts.length > 0) {
        const suggestedProductsDetails = await prisma.product.findMany({
          where: {
            id: { in: parsedAi.suggestedProducts },
            shopId: shop.shopId,
            isActive: true,
          },
          select: {
            id: true,
            title: true,
            price: true,
            discount: true,
            imageUrl: true,
            brand: true,
          }
        });

        if (suggestedProductsDetails.length > 0) {
          await prisma.chatMessage.create({
            data: {
              shopId: shop.shopId,
              sessionId,
              sender: 'ai',
              message: 'محصولات پیشنهادی:',
              messageType: 'product',
              metadata: JSON.stringify(suggestedProductsDetails),
            }
          });
        }
      }

      // If AI suggested articles, fetch full details and save as article message
      if (parsedAi.suggestedArticles && parsedAi.suggestedArticles.length > 0) {
        const suggestedArticlesDetails = await prisma.blogPost.findMany({
          where: {
            id: { in: parsedAi.suggestedArticles },
            shopId: shop.shopId,
            status: 'published',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            featuredImage: true,
          }
        });

        if (suggestedArticlesDetails.length > 0) {
          await prisma.chatMessage.create({
            data: {
              shopId: shop.shopId,
              sessionId,
              sender: 'ai',
              message: 'مقالات پیشنهادی:',
              messageType: 'article',
              metadata: JSON.stringify(suggestedArticlesDetails),
            }
          });
        }
      }
    } catch (aiError) {
      console.error('[ERROR] [ChatAutoReply]: Error running AI auto-reply:', aiError);
    }

    return NextResponse.json({ message: savedMessage });
  } catch (error) {
    console.error('[ERROR] [ChatMessage]: Error sending message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
