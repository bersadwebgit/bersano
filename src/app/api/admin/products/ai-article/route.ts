import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { modelSupportsVision } from '@/lib/ai-vision';
import { getAiModel } from '@/lib/ai-model-resolver';
import { callAiGateway } from '@/lib/ai-gateway';

const DEFAULT_PROMPTS = {
  ai_seo_article_prompt: `تو یک محقق و نویسنده محتوای سئو هستی که وظیفه‌ات تکمیل، بهبود و بهینه‌سازی توضیحات محصول با استفاده از اطلاعات معتبر است.

ورودی محصول:
<product>
  <title>{title}</title>
  <brand>{brand}</brand>
  <type>{type}</type>
  <category>{category}</category>
  <dimensions>{dimensions}</dimensions>
  <weight>{weight}</weight>
  <material>{material}</material>
  <colors>{colors}</colors>
  <features>{features}</features>
  <specs>{specs}</specs>
  <extra_notes>{extra_notes}</extra_notes>
</product>

═══════════════════════════════════
مرحله ۱ — شناسایی و غنی‌سازی اطلاعات محصول (اجباری):
═══════════════════════════════════

برند و مدل محصول را از روی {brand} و {title} شناسایی کن.

قوانین شناسایی و غنی‌سازی:
۱. اگر محصول متعلق به یک برند و مدل معروف جهانی یا ملی است (مانند نایک/Nike، اپل/Apple، سامسونگ، زونتس/Zontes، شیائومی و غیره) و تو مشخصات فنی و ویژگی‌های دقیق آن را در دانش داخلی خود داری، از آن دانش برای غنی‌سازی و تکمیل مشخصات فنی و توضیحات محصول استفاده کن.
۲. اگر محصول برای تو ناشناخته است، یا یک برند محلی، دست‌ساز یا خاص است که اطلاعاتی از آن در دانش عمومی وجود ندارد، **به هیچ وجه فرآیند را متوقف نکن و هرگز خطای "یافت نشد" بازنگردان!** بلکه با تکیه بر اطلاعات ورودی ارائه شده در تگ‌های بالا (عنوان، دسته‌بندی، مشخصات، ویژگی‌ها و توضیحات کوتاه) بهترین، کامل‌ترین و زیباترین مقاله سئو شده و جدول مشخصات را تولید کن.

═══════════════════════════════════
مرحله ۲ — منابع و صداقت اطلاعات:
═══════════════════════════════════

- در تولید اطلاعات اضافی برای برندهای معروف، فقط از مشخصات رسمی و تایید شده استفاده کن.
- از ادعاهای اغراق‌آمیز تبلیغاتی مانند «بهترین در نوع خود»، «بی‌نظیر»، «انقلابی»، یا وعده‌های مبهم بدون عدد و رقم خودداری کن. متن باید کاملاً حرفه‌ای، علمی و صادقانه باشد.

═══════════════════════════════════
مرحله ۳ — فرمت خروجی:
═══════════════════════════════════

خروجی را دقیقاً با ساختار زیر تولید کن:

### عنوان:
[عنوان محصول و دسته‌بندی]

### توضیحات:
[یک مقاله سئو شده، منسجم، روان و بسیار منظم بنویس که مشخصات فنی داده شده و اطلاعات تکمیلی معتبر یافت شده را به صورت جملات توضیحی و کاربردی شرح دهد.
قوانین نگارش بخش توضیحات (مقاله سئو):
۱. برای بخش‌بندی و ساختاردهی منظم به مقاله، حتماً از زیرعنوان‌های جذاب با فرمت مارک‌داون (مانند #### یا #####) استفاده کن.
۲. کلمات کلیدی، نام محصول، برند و ویژگی‌های فنی مهم را با استفاده از ستاره دوبل (**کلمه**) حتماً ضخیم (bold) کن تا در سئو و خوانایی تاثیرگذار باشد.
۳. در صورت لزوم، نکات یا مراحل یا مزایا را به صورت لیست شماره‌گذاری شده (مثلاً ۱. ۲. ۳.) بنویس.
۴. مشخصات فنی را به صورت جملات روان بنویس.]

### ویژگی‌ها:
[ویژگی‌های برجسته و رسمی محصول]

### مشخصات فنی:
| مشخصه | مقدار |
|--------|-------|
[جدول مشخصات فنی کامل محصول شامل اطلاعات ورودی و اطلاعات تکمیلی معتبر]

### اطلاعات تکمیلی یافت شده:

منبع: [نام سایت رسمی برند یا "اطلاعات ورودی محصول"]
تاریخ بررسی: [تاریخ امروز]
سطح اطمینان: [بالا / متوسط]

#### مشخصات اضافه شده:
| مشخصه | مقدار | منبع |
|--------|-------|------|
[اگر محصول معروف بود و مشخصاتی اضافه کردی اینجا بنویس، در غیر این صورت بنویس: "توضیحات بر اساس اطلاعات ورودی بهینه‌سازی شد."]

#### ویژگی‌های اضافه شده:
[اگر ویژگی جدیدی از منبع رسمی اضافه کردی اینجا بنویس، در غیر این صورت بنویس: "ویژگی‌ها بر اساس اطلاعات ورودی بهینه‌سازی شد."]

#### موارد یافت نشده:
- [مواردی که در ورودی نبود و در منابع رسمی هم یافت نشد]`
};

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

function extractSpecValue(specsList: any[], keywords: string[]): string {
  for (const s of specsList) {
    if (!s.key || !s.value) continue;
    const key = s.key.trim().toLowerCase();
    if (keywords.some(kw => key.includes(kw))) {
      return s.value.trim();
    }
  }
  return '';
}

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { productId, title, description, brand, price, type, categoryId, specs, features, variants, imageUrl, galleryUrls } = body;

    if (!title) {
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
      return NextResponse.json({ error: 'برای استفاده از تولید مقاله سئو هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.' }, { status: 403 });
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = JSON.parse(activePackage.features);
    } catch (e) {
      console.error('Error parsing features:', e);
    }

    if (!packageFeatures.aiArticleEnabled) {
      return NextResponse.json({ error: 'قابلیت تولید مقاله با هوش مصنوعی در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    const openrouterArticlePromptSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_seo_article_prompt' },
    });
    const aiModel = await getAiModel('content', shopId);

    // 3. Resolve category name if categoryId is provided
    let categoryName = '';
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

    // 4. Construct specs, features and variants texts
    let specsList: any[] = [];
    if (specs) {
      try {
        specsList = typeof specs === 'string' ? JSON.parse(specs) : specs;
      } catch (e) {}
    }

    let specsText = '';
    if (Array.isArray(specsList)) {
      specsText = specsList
        .filter((s: any) => s.key && s.value)
        .map((s: any) => `${s.key}: ${s.value}`)
        .join(' | ');
    }

    // Extract dimensions, weight, material, colors
    const dimensions = extractSpecValue(specsList, ['ابعاد', 'سایز', 'اندازه', 'dimension', 'size']);
    const weight = extractSpecValue(specsList, ['وزن', 'weight']);
    const material = extractSpecValue(specsList, ['جنس', 'متریال', 'material']);
    let colorsVal = extractSpecValue(specsList, ['رنگ', 'color']);

    // Extract colors from variants if not found in specs
    if (!colorsVal && variants) {
      try {
        const variantsList = typeof variants === 'string' ? JSON.parse(variants) : variants;
        if (Array.isArray(variantsList) && variantsList.length > 0) {
          const variantColors = variantsList
            .filter((v: any) => v.name)
            .map((v: any) => v.name.trim());
          if (variantColors.length > 0) {
            colorsVal = variantColors.join(' ، ');
          }
        }
      } catch (e) {}
    }

    // Parse featuresList
    let featuresText = '';
    if (features) {
      try {
        const featuresList = typeof features === 'string' ? JSON.parse(features) : features;
        if (Array.isArray(featuresList)) {
          featuresText = featuresList
            .filter((f: any) => f.key && f.value)
            .map((f: any) => `${f.key}: ${f.value}`)
            .join('\n');
        }
      } catch (e) {}
    }

    const extraNotes = description || '';

    // If the setting exists but is an old default prompt, let's update it to the new default prompt
    if (openrouterArticlePromptSetting && 
        (!openrouterArticlePromptSetting.value.includes('تو یک محقق و نویسنده محتوای سئو هستی') ||
         openrouterArticlePromptSetting.value.includes('تو یک نویسنده توضیحات محصول هستی') ||
         openrouterArticlePromptSetting.value.includes('شما یک کپی‌رایتر حرفه‌ای') || 
         openrouterArticlePromptSetting.value.includes('اگه هر دو خالی بودن، این بخش رو ننویس'))) {
      try {
        await prisma.systemSetting.update({
          where: { key: 'ai_seo_article_prompt' },
          data: { value: DEFAULT_PROMPTS.ai_seo_article_prompt },
        });
        openrouterArticlePromptSetting.value = DEFAULT_PROMPTS.ai_seo_article_prompt;
      } catch (err) {
        console.error('Error updating system setting in DB:', err);
      }
    }

    // 5. Build prompt and substitute variables
    let articlePrompt = openrouterArticlePromptSetting?.value || DEFAULT_PROMPTS.ai_seo_article_prompt;
    articlePrompt = articlePrompt
      .replace(/{title}/g, title || '')
      .replace(/{brand}/g, brand || 'نامشخص')
      .replace(/{type}/g, type === 'digital' ? 'دانلودی (فایل)' : 'فیزیکی')
      .replace(/{category}/g, categoryName || '')
      .replace(/{dimensions}/g, dimensions || '')
      .replace(/{weight}/g, weight || '')
      .replace(/{material}/g, material || '')
      .replace(/{colors}/g, colorsVal || '')
      .replace(/{features}/g, featuresText || '')
      .replace(/{specs}/g, specsText || '')
      .replace(/{extra_notes}/g, extraNotes || '');

    // Check if model supports vision
    const supportsVision = modelSupportsVision(aiModel);

    let messages: any[] = [];
    if (supportsVision && (imageUrl || (galleryUrls && galleryUrls.length > 0))) {
      const contentArray: any[] = [
        {
          type: 'text',
          text: articlePrompt + `\n\nتوجه: تصاویر واقعی محصول نیز همراه با این درخواست ارسال شده است. لطفاً ظاهر محصول، رنگ‌ها، جزئیات طراحی، و هرگونه ویژگی بصری را از روی عکس‌ها آنالیز کرده و در تولید مقاله سئو شده و جدول مشخصات استفاده کن.`
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
          content: articlePrompt
        }
      ];
    }

    // 6. Request via Canonical AI Client
    const result = await callAiGateway({
      shopId,
      endpoint: 'ai-article',
      slot: 'content',
      messages: messages,
      mode: 'text',
      temperature: 0.2,
      maxTokens: 1500,
      skipQuotaCheck: false,
      featureKey: 'aiArticleEnabled',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'تولید مقاله پس از چند بار تلاش ناموفق بود.' }, { status: 502 });
    }

    let aiText = result.text;

    // Clean markdown code blocks if the AI accidentally wrapped the output inside them
    aiText = aiText.replace(/^```markdown\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    if (aiText.includes('اطلاعات کافی برای تکمیل از اینترنت یافت نشد.')) {
      return NextResponse.json({ error: 'اطلاعات کافی برای تکمیل از اینترنت یافت نشد.' }, { status: 422 });
    }

    // Convert Markdown to clean HTML
    const htmlOutput = markdownToHtml(aiText);

    return NextResponse.json({
      success: true,
      article: htmlOutput,
    });

  } catch (error) {
    console.error('Error in AI Article API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}