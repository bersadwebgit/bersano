import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { modelSupportsVision } from '@/lib/ai-vision';
import { getAiModel } from '@/lib/ai-model-resolver';

function parseInlineMarkdown(text: string): string {
  // Replace bold **text** with <strong>text</strong>
  let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>');
  // Support single *text* or _text_ for italics
  parsed = parsed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  parsed = parsed.replace(/_(.*?)_/g, '<em class="italic">$1</em>');
  return parsed;
}

function renderTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  let html = '<table class="w-full border-collapse border border-gray-200 dark:border-gray-800 my-4 text-sm">\n';
  
  // First row is header
  const headers = rows[0];
  html += '  <thead>\n    <tr class="bg-gray-50 dark:bg-gray-800">\n';
  headers.forEach(h => {
    html += `      <th class="border border-gray-200 dark:border-gray-800 px-4 py-2 text-right font-bold text-gray-900 dark:text-white">${h}</th>\n`;
  });
  html += '    </tr>\n  </thead>\n  <tbody>\n';

  // Remaining rows are body
  for (let i = 1; i < rows.length; i++) {
    html += '    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">\n';
    rows[i].forEach(c => {
      html += `      <td class="border border-gray-200 dark:border-gray-800 px-4 py-2 text-gray-700 dark:text-gray-300">${c}</td>\n`;
    });
    html += '    </tr>\n';
  }

  html += '  </tbody>\n</table>\n';
  return html;
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const closePending = () => {
    let closed = '';
    if (inUl) {
      closed += '</ul>\n';
      inUl = false;
    }
    if (inOl) {
      closed += '</ol>\n';
      inOl = false;
    }
    if (inTable) {
      closed += renderTable(tableRows);
      tableRows = [];
      inTable = false;
    }
    return closed;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      html += closePending();
      continue;
    }

    // Headers (h2 to h6)
    const headerMatch = line.match(/^(#{2,6})\s+(.*)$/);
    if (headerMatch) {
      html += closePending();
      const level = headerMatch[1].length;
      const text = parseInlineMarkdown(headerMatch[2]);
      // Add standard classes for beautiful typography
      let headingClass = 'font-bold text-gray-800 dark:text-white mt-6 mb-3 block';
      if (level === 2) headingClass += ' text-lg sm:text-xl border-b border-gray-100 dark:border-gray-800 pb-1';
      else if (level === 3) headingClass += ' text-base sm:text-lg';
      else headingClass += ' text-sm sm:text-base';
      
      html += `<h${level} class="${headingClass}">${text}</h${level}>\n`;
      continue;
    }

    // Unordered Lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl || inTable) {
        html += closePending();
      }
      if (!inUl) {
        html += '<ul class="list-disc list-inside space-y-1.5 my-3 text-gray-700 dark:text-gray-300 pr-4">\n';
        inUl = true;
      }
      const itemText = line.replace(/^[-*]\s*/, '');
      html += `  <li>${parseInlineMarkdown(itemText)}</li>\n`;
      continue;
    }

    // Ordered Lists (supporting English and Persian numbers)
    const olMatch = line.match(/^(\d+|[۰-۹]+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl || inTable) {
        html += closePending();
      }
      if (!inOl) {
        html += '<ol class="list-decimal list-inside space-y-1.5 my-3 text-gray-700 dark:text-gray-300 pr-4">\n';
        inOl = true;
      }
      const itemText = olMatch[2];
      html += `  <li>${parseInlineMarkdown(itemText)}</li>\n`;
      continue;
    }

    // Tables
    if (line.startsWith('|')) {
      if (inUl || inOl) {
        html += closePending();
      }
      if (line.includes('---')) {
        inTable = true;
        continue;
      }
      inTable = true;
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cells);
      continue;
    }

    // Default: Paragraph
    html += closePending();
    html += `<p class="text-gray-700 dark:text-gray-300 leading-relaxed my-3">${parseInlineMarkdown(line)}</p>\n`;
  }

  html += closePending();

  // Clean up any double/multiple empty lines or empty paragraphs that might cause spacing issues
  return html
    .replace(/<p class="[^"]*"><\/p>/g, '') // Remove empty paragraphs
    .replace(/\n{2,}/g, '\n') // Remove excessive newlines
    .trim();
}

function cleanAndParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // If direct parse fails, try to extract json from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerError) {}
    }
    
    // Try to find the first '{' and last '}'
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

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { 
      productName, 
      brand, 
      productType, 
      categoryId, 
      keyHighlights, 
      targetAudience, 
      price, 
      stock, 
      imageUrl, 
      galleryUrls,
      wholesalePrice,
      moq,
      wholesaleUnit,
      wholesaleUnitSize
    } = body;

    if (!productName) {
      return NextResponse.json({ error: 'لطفاً نام محصول را وارد کنید.' }, { status: 400 });
    }

    // 1. Fetch the shop's active package and check limit
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
      include: { package: true },
    });

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const isPackageActive = shop.packageExpiresAt ? new Date(shop.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? shop.package : null;

    if (!activePackage) {
      return NextResponse.json({ error: 'برای استفاده از تولید جادویی محصول هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.' }, { status: 403 });
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = JSON.parse(activePackage.features);
    } catch (e) {
      console.error('Error parsing features:', e);
    }

    // We allow this if either AI article or AI SEO or AI FAQs is enabled as they all represent AI features
    if (!packageFeatures.aiArticleEnabled && !packageFeatures.aiSeoEnabled && !packageFeatures.aiFaqsEnabled) {
      return NextResponse.json({ error: 'قابلیت‌های هوش مصنوعی در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    // 2. Fetch the AI provider settings
    const aiEnabledSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_enabled' },
    });
    if (aiEnabledSetting && aiEnabledSetting.value === 'false') {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
    }

    let apiKey = '';
    let aiModel = '';
    let apiUrl = '';
    let apiHeaders: Record<string, string> = {};

    // Default openrouter
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' },
    });
    apiKey = openrouterApiKeySetting?.value || '';
    let openrouterModel = await getAiModel('complex', shopId);

    aiModel = openrouterModel;
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Bulk Generator',
    };

    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی تولید محصول در حال حاضر پیکربندی نشده است. لطفاً به پشتیبانی سیستم اطلاع دهید.' }, { status: 503 });
    }

    // 3. Resolve category name if categoryId is provided
    let categoryName = 'دسته‌بندی نشده';
    if (categoryId) {
      try {
        const category = await prisma.category.findFirst({
          where: { id: categoryId, shopId },
        });
        if (category) {
          categoryName = category.name;
        }
      } catch (err) {
        console.error('Error resolving category name:', err);
      }
    }

    // Check if model supports vision
    const supportsVision = modelSupportsVision(aiModel);

    let imageInfoText = '';
    if (supportsVision && (imageUrl || (galleryUrls && galleryUrls.length > 0))) {
      imageInfoText = `
- تصاویر محصول: تصاویر واقعی محصول (شامل تصویر اصلی و تصاویر گالری) به صورت فایل تصویر همراه با این درخواست برای شما ارسال شده است.
لطفاً تصاویر را با دقت آنالیز کرده و ظاهر، رنگ‌ها، جزئیات طراحی، کیفیت ساخت، پورت‌ها/دکمه‌ها (در صورت الکترونیکی بودن)، جنس بدنه و هر ویژگی بصری دیگر را استخراج کرده و از این اطلاعات بصری برای غنی‌سازی توضیحات کامل، مشخصات فنی و ویژگی‌های کلیدی محصول استفاده کنید.`;
    }

    // 4. Construct prompt
    let prompt = `تو یک طراح و متخصص حرفه‌ای تولید محتوای محصول و سئوکار مجرب هستی.
وظیفه تو این است که بر اساس پاسخ‌های کاربر به چند سوال درباره یک محصول، اطلاعات کامل، دقیق و غنی شده این محصول را به زبان فارسی تولید کنی.

اطلاعات دریافتی از کاربر:
- نام یا ایده محصول: "${productName}"
- برند محصول: "${brand || 'نامشخص'}"
- نوع محصول: "${productType === 'digital' ? 'دانلودی (فایل دیجیتال)' : 'فیزیکی'}"
- دسته‌بندی محصول: "${categoryName}"
- ویژگی‌ها، مشخصات اولیه یا کلمات کلیدی مهم: "${keyHighlights || 'نامشخص'}"
- مخاطبان هدف: "${targetAudience || 'عموم کاربران'}"
- موجودی کالا: "${stock || 'نامشخص'}"
- قیمت پیشنهادی کاربر: "${price || '0'}" تومان (اگر قیمت پیشنهادی خالی یا 0 یا نامشخص بود، خودت یک قیمت معقول و واقعی مناسب بازار ایران بر اساس ارزش و کلاس محصول پیشنهاد بده).${imageInfoText}
`;

    if (shop.wholesaleEnabled) {
      prompt += `
- قیمت عمده‌فروشی پیشنهادی کاربر: "${wholesalePrice || 'نامشخص'}" تومان
- حداقل تعداد سفارش عمده (MOQ) پیشنهادی کاربر: "${moq || 'نامشخص'}"
- واحد سفارش عمده پیشنهادی کاربر: "${wholesaleUnit || 'عدد'}"
- تعداد در هر واحد عمده پیشنهادی کاربر: "${wholesaleUnitSize || '1'}"
`;
    }

    prompt += `
قوانین تولید محتوا:
- تمام بخش‌ها باید کاملاً حرفه‌ای، ادبی و روان باشند.
- مشخصات فنی (specsList) باید شامل حداقل ۵ الی ۸ مشخصه واقعی باشد. مثلاً اگر محصول فیزیکی است مشخصاتی مانند ابعاد، وزن، جنس، گارانتی، کشور سازنده و مشخصات مربوط به آن صنف را بنویس. اگر دانلودی است مشخصاتی چون فرمت فایل، حجم فایل, زبان، تعداد صفحات/جلسات، نرم‌افزار پیش‌نیاز را بنویس.
- ویژگی‌های کلیدی (featuresList) باید شامل حداقل ۳ الی ۵ ویژگی برجسته محصول با توضیحات متقاعد کننده باشد.
- سوالات متداول (faqItems) شامل حداقل ۳ الی ۴ سوال کلیدی و بسیار مهم کاربران به همراه پاسخ‌های منطقی و قانع کننده باشد.
- عنوان سئو (seoTitle) بهینه و جذاب برای جذب کلیک باشد (بین ۵۰ تا ۶۰ کاراکتر). ترجیحاً شامل نام محصول و یک مزیت رقابتی مهم باشد.
- توضیحات سئو (seoDescription) بهینه و روان شامل کلمات کلیدی و یک دعوت به اقدام (CTA) کوتاه باشد (بین ۱۵۰ تا ۱۶۰ کاراکتر).
- توضیحات کامل محصول (fullDescription) باید یک مقاله سئو شده فوق‌العاده باکیفیت و جامع در قالب مارک‌داون باشد که ساختار درستی دارد. حتماً از هدرهای مارک‌داون (###) و کلمات بولد شده (**متن**) برای بهبود خوانایی استفاده کن. این مقاله نباید کوتاه باشد، حداقل ۲۰۰ تا ۴۰۰ کلمه باشد.
`;

    if (shop.wholesaleEnabled) {
      prompt += `
قوانین تولید اطلاعات عمده‌فروشی (Wholesale & B2B):
- "wholesalePrice": قیمت پایه عمده‌فروشی به تومان به عنوان رشته (مثلاً '75000'). این قیمت باید منطقی و پایین‌تر از قیمت خرده‌فروشی (معمولاً ۱۰٪ الی ۳۰٪ کمتر) باشد. اگر کاربر قیمت عمده‌فروشی پیشنهادی داده، از آن استفاده کن.
- "moq": حداقل مقدار سفارش به عنوان عدد (مثلاً ۱۰ یا ۲۴). اگر کاربر MOQ پیشنهادی داده، از آن استفاده کن.
- "wholesaleUnit": واحد سفارش عمده (مانند "عدد"، "کارتن"، "بسته"، "پالت"). اگر کاربر واحد پیشنهادی داده، از آن استفاده کن.
- "wholesaleUnitSize": تعداد کالا در هر واحد عمده به عنوان عدد (مثلاً اگر واحد کارتن است و هر کارتن ۱۲ عدد دارد، این مقدار ۱۲ می‌شود). اگر کاربر تعداد پیشنهادی داده، از آن استفاده کن.
- "weight": وزن تقریبی کالا بر حسب کیلوگرم به عنوان عدد (مثلاً 0.5 یا 1.2). برای کالاهای دانلودی 0 بگذار.
- "volume": حجم تقریبی کالا بر حسب دسی‌متر مکعب یا لیتر به عنوان عدد (مثلاً 1.5 یا 3). برای کالاهای دانلودی 0 بگذار.
- "wholesaleTiers": یک آرایه از تخفیف‌های پله‌ای بر اساس تعداد خرید. ساختار آن باید دقیقاً به صورت زیر باشد:
  [{ "minQty": number, "maxQty": number | null, "discountPercent": number }]
  مثال: خرید از ۱۰ تا ۵۰ عدد با ۵٪ تخفیف، از ۵۱ تا ۲۰۰ عدد با ۱۰٪ تخفیف و بیش از ۲۰۰ عدد با ۱۵٪ تخفیف:
  [
    { "minQty": 10, "maxQty": 50, "discountPercent": 5 },
    { "minQty": 51, "maxQty": 200, "discountPercent": 10 },
    { "minQty": 201, "maxQty": null, "discountPercent": 15 }
  ]
- "wholesaleExclusivePrices": یک آرایه از قیمت‌های اختصاصی برای گروه‌های خاص مشتریان (مانند "همکار" یا "مشتری عمده"). ساختار آن باید دقیقاً به صورت زیر باشد:
  [{ "target": string, "price": number }]
  مثال:
  [
    { "target": "همکار", "price": 75000 },
    { "target": "مشتری عمده", "price": 70000 }
  ]
`;
    }

    prompt += `
تو باید خروجی را دقیقاً به صورت یک شیء JSON تولید کنی. هیچ کاراکتر اضافی، توضیحات قبل یا بعد از JSON ارسال نکن. از قرار دادن تگ مارک‌داون \`\`\`json در ابتدا و انتهای پاسخ خودداری کن یا اگر می‌گذاری مطمئن شو که به درستی فرمت شده است.

قالب دقیق شیء JSON خروجی:
{
  "title": "عنوان استاندارد و بهینه‌سازی شده محصول به فارسی",
  "brand": "نام برند استخراج شده یا اصلاح شده محصول به فارسی",
  "price": "قیمت نهایی به تومان (فقط عدد بدون ممیز یا حروف به عنوان رشته)",
  "description": "توضیح کوتاه و جذاب محصول در حدود ۲ الی ۳ جمله",
  "fullDescription": "متن مقاله سئو شده کامل با فرمت استاندارد مارک‌داون شامل بخش‌های معرفی، بررسی تخصصی مزایا، کاربردها و چرا باید خرید؟",
  "specsList": [
    { "key": "مشخصه ۱", "value": "مقدار مشخصه ۱" },
    { "key": "مشخصه ۲", "value": "مقدار مشخصه ۲" }
  ],
  "featuresList": [
    { "key": "عنوان ویژگی ۱", "value": "توضیح کوتاه ویژگی ۱" },
    { "key": "عنوان ویژگی ۲", "value": "توضیح کوتاه ویژگی ۲" }
  ],
  "faqItems": [
    { "question": "سوال متداول ۱", "answer": "پاسخ متداول ۱" },
    { "question": "سوال متداول ۲", "answer": "پاسخ متداول ۲" }
  ],
  "seoTitle": "عنوان سئو مناسب",
  "seoDescription": "توضیحات سئو مناسب"${shop.wholesaleEnabled ? `,
  "wholesalePrice": "قیمت عمده‌فروشی به تومان به عنوان رشته (مثلاً '75000')",
  "moq": 10,
  "wholesaleUnit": "واحد سفارش عمده (مثلاً 'عدد' یا 'کارتن')",
  "wholesaleUnitSize": 12,
  "weight": 0.5,
  "volume": 1.5,
  "wholesaleTiers": [
    { "minQty": 10, "maxQty": 50, "discountPercent": 5 },
    { "minQty": 51, "maxQty": null, "discountPercent": 10 }
  ],
  "wholesaleExclusivePrices": [
    { "target": "همکار", "price": 70000 }
  ]` : ''}
}`;

    // Construct messages
    let messages: any[] = [];
    if (supportsVision && (imageUrl || (galleryUrls && galleryUrls.length > 0))) {
      const contentArray: any[] = [
        {
          type: 'text',
          text: prompt
        }
      ];

      if (imageUrl) {
        let absoluteImageUrl = imageUrl;
        if (imageUrl.startsWith('/')) {
          const origin = request.headers.get('origin') || 'http://localhost:3000';
          absoluteImageUrl = `${origin}${imageUrl}`;
        }
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: absoluteImageUrl
          }
        });
      }

      if (galleryUrls && Array.isArray(galleryUrls)) {
        galleryUrls.forEach((gUrl: string) => {
          if (gUrl) {
            let absoluteGUrl = gUrl;
            if (gUrl.startsWith('/')) {
              const origin = request.headers.get('origin') || 'http://localhost:3000';
              absoluteGUrl = `${origin}${gUrl}`;
            }
            contentArray.push({
              type: 'image_url',
              image_url: {
                url: absoluteGUrl
              }
            });
          }
        });
      }

      messages = [
        {
          role: 'user',
          content: contentArray
        }
      ];
    } else {
      messages = [
        {
          role: 'user',
          content: prompt
        }
      ];
    }

    // 5. Request to OpenRouter with Retry Logic
    let attempts = 0;
    const maxAttempts = 3;
    let parsedData: any = null;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const openRouterResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            model: aiModel,
            response_format: { type: "json_object" },
            messages: messages,
            temperature: 0.3,
            max_tokens: 3000,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          throw new Error(`OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`);
        }

        const responseData = await openRouterResponse.json();
        const aiText = responseData.choices?.[0]?.message?.content;

        if (!aiText) {
          throw new Error('No content returned from AI model');
        }

        parsedData = cleanAndParseJson(aiText);
        if (!parsedData.title || !parsedData.description || !parsedData.fullDescription) {
          throw new Error('فیلدهای حیاتی (title, description, fullDescription) در پاسخ هوش مصنوعی یافت نشد.');
        }
        break; // Successfully generated and parsed!
      } catch (err: any) {
        console.error(`Attempt ${attempts} failed for AI Generate All:`, err);
        lastError = err;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!parsedData) {
      return NextResponse.json({ error: `تولید محتوا پس از چند بار تلاش ناموفق بود: ${lastError?.message || 'خطای ناشناخته'}` }, { status: 502 });
    }

    // Convert fullDescription Markdown to HTML
    if (parsedData.fullDescription) {
      parsedData.fullDescriptionHtml = markdownToHtml(parsedData.fullDescription);
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Error in AI Generate All API endpoint:', error);
    return NextResponse.json({ error: error.message || 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
