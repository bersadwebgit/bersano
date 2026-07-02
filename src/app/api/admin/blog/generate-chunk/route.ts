import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { callAiGateway } from '@/lib/ai-gateway';

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    
    // Resolve mode or action to match both frontend patterns
    const action = body.action || body.mode;

    const {
      prompt,
      brandName,
      brandGuidelines,
      productIds = [],
      productId, // single product passed by frontend
      geoTarget,
      outline,
      chunkIndex = 0,
      sectionIndex, // frontend passes sectionIndex for chunk generation
      previousContent = '',
      lastParagraphs, // frontend passes lastParagraphs
      previousChunks = [], // frontend passes previousChunks
      styleFingerprint,
      fieldName,
      field, // frontend passes field for single field generation
      currentArticleData,
      currentData, // frontend passes currentData for single field generation
      brandPersonalization,
      linkRelatedProducts,
      preferredLength,
      fields = []
    } = body;

    // 1. Fetch Shop Info for branding fallback
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
    });
    const finalBrandName = brandName || shop?.shopName || 'فروشگاه ما';
    const finalBrandGuidelines = brandGuidelines || shop?.description || 'لحن صمیمی و حرفه‌ای';

    const shopDomain = shop?.customDomain || (shop?.subdomain ? `${shop.subdomain}.localhost:3000` : 'localhost:3000');
    const host = request.headers.get('host') || shopDomain;
    const shopUrl = `http://${host}`;

    // 2. Resolve Product Context (using id since product has no slug field in Prisma schema)
    let resolvedProductIds: string[] = [];
    if (productId && typeof productId === 'string') {
      resolvedProductIds.push(productId);
    }
    if (Array.isArray(productIds)) {
      productIds.forEach((id: string) => {
        if (id && !resolvedProductIds.includes(id)) {
          resolvedProductIds.push(id);
        }
      });
    }

    let productsData: any[] = [];
    if (resolvedProductIds.length > 0) {
      productsData = await prisma.product.findMany({
        where: {
          id: { in: resolvedProductIds },
          shopId
        },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          brand: true,
          features: true,
          specs: true,
          imageUrl: true,
        }
      });
    } else if (linkRelatedProducts !== false) {
      // Fallback: Fetch a few products from the shop to help with internal linking
      productsData = await prisma.product.findMany({
        where: {
          shopId,
          isActive: true
        },
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          brand: true,
          features: true,
          specs: true,
          imageUrl: true,
        }
      });
    }

    const productsContext = productsData.map((p, i) => `
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

    // 3. Handle Actions
    if (action === 'outline') {
      const systemPrompt = `تو یک نویسنده محتوای سئو، سردبیر مجله اینترنتی و استراتژیست محتوا هستی.
وظیفه تو این است که بر اساس موضوع درخواستی کاربر، اطلاعات برند و محصولات مرتبط، یک **پلن محتوای فوق‌العاده حرفه‌ای و جامع (Outline)** برای تولید مقاله وبلاگ طراحی کنی.

قوانین طراحی Outline و تعیین طول مقاله (Article Length Model):
مدیر سایت طول مقاله را به صورت صریح روی مدل **"${preferredLength || 'short'}"** تنظیم کرده است. تو باید حتماً و بدون استثنا از این مدل طول مقاله پیروی کنی و ساختار Outline را متناسب با آن طراحی کنی:

1. **کوتاه (short) - پیش‌فرض**: برای موضوعات خبری، معرفی ساده یک محصول خاص، نکات کلیدی و سریع، یا مقالات جمع‌وجور و خلاصه.
   - تعداد کل بخش‌ها (sections): ۳ الی ۴ بخش (شامل مقدمه کوتاه، ۱ الی ۲ بخش بدنه اصلی، و جمع‌بندی).
   - تعداد کل کلمات کل مقاله: حدود ۵۰۰ تا ۸۰۰ کلمه.
2. **متوسط (medium)**: برای راهنماهای خرید عمومی، مقایسه ۲ یا ۳ محصول، مقالات آموزشی با درجه سختی متوسط.
   - تعداد کل بخش‌ها (sections): ۵ الی ۶ بخش (شامل مقدمه جذاب، ۳ الی ۴ بخش بدنه، و جمع‌بندی/نتیجه‌گیری).
   - تعداد کل کلمات کل مقاله: حدود ۱۰۰۰ تا ۱۵۰۰ کلمه.
3. **بلند (long)**: برای راهنماهای جامع و کامل (Ultimate Guide)، مقالات آموزشی گام‌به‌گام و عمیق، مقایسه‌های گروهی محصولات.
   - تعداد کل بخش‌ها (sections): ۷ الی ۹ بخش (شامل مقدمه لید، ۵ الی ۷ بخش بدنه اصلی با جزئیات کامل، و جمع‌بندی و نتیجه‌گیری نهایی).
   - تعداد کل کلمات کل مقاله: حدود ۲۰۰۰ تا ۳۰۰۰ کلمه.

قوانین ساختاری و برندینگ:
- نام برند: "${finalBrandName}". دستورالعمل برند: "${finalBrandGuidelines}".
- آدرس وب‌سایت فروشگاه شما: "${shopUrl}" (دامنه: "${host}").
- مهم‌ترین قانون آدرس‌دهی و برندینگ: برند شما و آدرس وب‌سایت شما دقیقاً همین است. هرگز و تحت هیچ شرایطی آدرس‌های ساختگی، دامنه‌های خارجی یا متفرقه (مانند daewoo.com یا daewoooo.com یا هر آدرس دیگری غیر از "${shopUrl}") برای برند یا فروشگاه تولید نکن. اگر می‌خواهی به وب‌سایت برند یا فروشگاه اشاره کنی، فقط از آدرس نسبی "/" یا آدرس کامل "${shopUrl}" استفاده کن.
- اگر محصولات مرتبط ارائه شده‌اند، باید بخش‌هایی برای معرفی، مقایسه یا بررسی کاربرد این محصولات در مقاله در نظر گرفته شود تا لینک‌دهی داخلی به صورت طبیعی انجام شود.
- کلمات کلیدی کلیک‌خور را رعایت کن.

خروجی تو باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی دیگر بازنگردانی:
{
  "title": "عنوان پیشنهادی برای کل مقاله",
  "articleLengthModel": "یکی از مقادیر short یا medium یا long بر اساس تحلیل خودت",
  "lengthExplanation": "توضیح کوتاه و صریح فارسی از علت انتخاب این مدل طول مقاله بر اساس موضوع",
  "sections": [
    {
      "id": "section_1",
      "title": "عنوان بخش (مثلاً مقدمه یا هدر H3/H4)",
      "words": 200, // تعداد کلمات تقریبی این بخش متناسب با مدل طول مقاله انتخابی
      "status": "pending"
    }
  ]
}`;

      const userContent = `
موضوع مقاله / پرامپت کاربر: "${prompt}"
برند: "${finalBrandName}"
دستورالعمل برند: "${finalBrandGuidelines}"
هدف جغرافیایی (Geo SEO): "${geoTarget || 'سراسر ایران'}"

محصولات مرتبط برای استفاده در مقاله:
${productsContext || 'محصولی انتخاب نشده است.'}
`;

      const result = await callAiGateway<any>({
        shopId,
        endpoint: 'blog:generate-chunk:outline',
        slot: 'content',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        mode: 'json',
        temperature: 0.2,
        maxTokens: 2000,
        requiredFields: ['title'],
        fallbackValue: { title: '', sections: [] },
      });

      if (!result.success || !result.data) {
        return NextResponse.json({ error: result.error || 'تولید Outline ناموفق بود.' }, { status: 502 });
      }

      const parsed = result.data;

      return NextResponse.json({
        success: true,
        outline: {
          title: parsed.title,
          sections: parsed.sections || parsed.outline?.map((s: any) => ({
            id: s.id,
            title: s.title || s.heading,
            words: s.words || s.estimatedWords || 200,
            status: 'pending'
          })) || []
        },
        warnings: result.warnings || []
      });
    }

    if (action === 'generate_section' || action === 'chunk') {
      const activeOutline = outline || body.outline;
      const activeIndex = typeof sectionIndex === 'number' ? sectionIndex : chunkIndex;

      if (!activeOutline) {
        return NextResponse.json({ error: 'ارائه Outline برای تولید بخش‌به‌بخش الزامی است.' }, { status: 400 });
      }

      const sections = activeOutline.sections || activeOutline.outline || [];
      const currentSection = sections[activeIndex];
      if (!currentSection) {
        return NextResponse.json({ error: 'بخش مورد نظر در Outline یافت نشد.' }, { status: 400 });
      }

      const isLastSection = activeIndex === sections.length - 1;
      const finalHeading = currentSection.title || currentSection.heading;
      const finalWords = currentSection.words || currentSection.estimatedWords || 200;
      const finalLastParagraphs = lastParagraphs || previousContent;

      const systemPrompt = `تو یک نویسنده محتوای سئو و کپی‌رایتر حرفه‌ای هستی. وظیفه تو این است که **فقط و فقط یک بخش خاص** از یک مقاله بزرگ را بر اساس Outline ارائه شده بنویسی.

قوانین نگارش بخش (Chunk) و استایل‌دهی بصری فوق‌العاده شیک و مینیمال:
متن مقاله نباید ساده و خسته‌کننده باشد، اما در عین حال نباید با رنگ‌های زیاد شلوغ و زننده دیده شود. هدف ما یک طراحی کاملاً **مینیمال، تمیز و حرفه‌ای** است که خواننده خسته نشود:

1. **ترازبندی متن (Default Justify)**: تمام پاراگراف‌های متنی عادی (\`<p>\`) باید حتماً دارای کلاس ترازبندی جاستیفای باشند تا متن‌ها منظم و تراز شده نمایش داده شوند: \`<p class="text-justify leading-relaxed mb-4" style="text-align: justify;">\`
2. **پاراگراف لید (Lead Paragraph)**: اگر بخش فعلی مقدمه مقاله است (بخش اول)، اولین پاراگراف را با کلاس \`<p class="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 text-justify" style="text-align: justify;">\` بنویس تا شروع مقاله با فونت درشت‌تر و جذاب‌تر نمایش داده شود.
3. **برجسته‌سازی هوشمند و محدود (Smart Bolding)**: جملات کلیدی، آمارها و مفاهیم اصلی را با تگ \`<strong>\` برجسته کن تا خواننده با مرور چشمی سریع نکات مهم را دریابد. در استفاده از بولد زیاده‌روی نکن.
4. **باکس‌های نکته و نقل‌قول مینیمال (Minimal Callout Boxes)**: به جای باکس‌های رنگارنگ شلوغ، از باکس‌های بسیار تمیز و مینیمال با یک حاشیه خاکستری/سرمه‌ای ملایم و بدون رنگ پس‌زمینه جیغ استفاده کن:
   \`<blockquote class="border-r-4 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl my-6 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">💡 <strong>نکته:</strong> متن نکته کلیدی یا ترفند...</blockquote>\`
5. **تیترهای فرعی تمیز (H3, H4)**: برای مرتب‌سازی مطالب، از تیترهای فرعی با تگ‌های \`<h3>\` و \`<h4>\` استفاده کن. برای جذابیت بیشتر، به آن‌ها کلاس‌های رنگی ملایم بده، مثلاً \`<h3 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4 border-b pb-2">\` یا \`<h4 class="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-6 mb-3">\`.
6. **لیست‌های مرتب و نامرتب (Styled Lists)**: به جای لیست‌های ساده، از لیست‌های مرتب (\`<ol class="list-decimal list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">\`) و نامرتب (\`<ul class="list-disc list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">\`) استفاده کن.
7. **جداول مقایسه‌ای شکیل و ساده (Comparison Tables)**: اگر در این بخش مقایسه‌ای انجام می‌شود، یک جدول HTML بسیار تمیز و مینیمال بدون رنگ‌های شلوغ بساز:
   \`<div class="overflow-x-auto my-6"><table class="w-full text-right border-collapse"><thead class="bg-slate-50 dark:bg-slate-800/50"><tr><th class="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">ویژگی</th><th class="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">محصول</th></tr></thead><tbody><tr><td class="p-3 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300">قیمت</td><td class="p-3 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300">مناسب</td></tr></tbody></table></div>\`
8. **کال تو اکشن‌های استاندارد و مینیمال همراه با تصویر محصول (Call to Action - CTA)**:
   - در کل مقاله باید به تعداد بسیار محدود (مثلاً **فقط یک بار** در کل مقاله برای مقالات کوتاه/متوسط و **حداکثر دو بار** برای مقالات بلند) از یک باکس کال تو اکشن فوق‌العاده شیک، استاندارد و حرفه‌ای استفاده کنی.
   - ساختار باکس CTA باید دقیقاً به صورت زیر باشد (تگ‌ها، کلاس‌ها و ساختار فلکس را دقیقاً رعایت کن):
     \`<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">\`
       \`<!-- اگر محصول دارای آدرس عکس (imageUrl) بود، حتماً تگ img زیر را با آدرس عکس واقعی محصول قرار بده، در غیر این صورت تگ img را کاملاً حذف کن -->\`
       \`<img src="آدرس_عکس_محصول" alt="عنوان_محصول" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />\`
       \`<div class="flex-1">\`
         \`<h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب کال تو اکشن (مثلاً: نیاز به مشاوره تخصصی برای خرید دارید؟)</h4>\`
         \`<p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه و ترغیب‌کننده برای اقدام کاربر...</p>\`
         \`<a href="/product/ID" class="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all">مشاهده و خرید محصول</a>\`
       \`</div>\`
     \`</div>\`
   - دقت کن شناسه محصول (ID) و آدرس عکس محصول (imageUrl) را دقیقاً از بخش اطلاعات محصولات برداری. هرگز آدرس عکس ساختگی یا تصادفی تولید نکن.

قوانین نگارش محتوایی بخش:
1. **تمرکز مطلق بر بخش فعلی**: فقط محتوای مربوط به بخش "${finalHeading}" را بنویس. از نوشتن بخش‌های قبلی یا بعدی خودداری کن.
2. **لحن و برندینگ**: لحن نگارش باید کاملاً با برند هماهنگ باشد. نام برند: "${finalBrandName}". دستورالعمل برند: "${finalBrandGuidelines}". آدرس وب‌سایت فروشگاه شما: "${shopUrl}" (دامنه: "${host}"). برند شما و آدرس وب‌سایت شما دقیقاً همین است. هرگز و تحت هیچ شرایطی آدرس‌های ساختگی، دامنه‌های خارجی یا متفرقه (مانند daewoo.com یا daewoooo.com یا هر آدرس دیگری غیر از "${shopUrl}") برای برند یا فروشگاه تولید نکن. اگر می‌خواهی به وب‌سایت برند یا فروشگاه اشاره کنی، فقط از آدرس نسبی "/" یا آدرس کامل "${shopUrl}" استفاده کن.
3. **لینک‌دهی هوشمند به محصولات**: اگر محصولات مرتبطی وجود دارند، در جاهای مناسب محتوا به صورت کاملاً طبیعی با استفاده از تگ HTML لینک (<a href="/product/ID" class="text-blue-600 hover:underline font-bold">نام محصول</a>) به آن‌ها لینک بده. دقت کن شناسه محصول (ID) را دقیقاً از بخش محصولات برداری. هرگز لینک‌های الکی یا اشتباه نساز. فقط از لینک‌های موجود در بخش محصولات استفاده کن. ساختار لینک محصول باید دقیقاً به صورت "/product/ID" باشد (نه "/products/ID").
4. **یکدستی لحن (Style Fingerprint)**:
   - اگر این بخش اول نیست، باید از اثر انگشت سبک نگارش قبلی پیروی کنی: "${styleFingerprint || 'ندارد'}".
   - برای انتقال نرم و روان، از پل ارتباطی بخش قبلی (Context Bridge) استفاده کن: "${finalLastParagraphs || 'ندارد'}".
5. **اثر انگشت سبک (Style Fingerprint)**: اگر این بخش اول (index = 0) است، تو باید ویژگی‌های سبک نگارش خودت (طول جملات، نوع افعال، لحن) را در قالب ۲ الی ۳ جمله توصیف کنی و در فیلد "styleFingerprint" خروجی قرار دهی.
6. **پایان طبیعی**: اگر به محدودیت کلمه نزدیک شدی، محتوا را در انتهای یک پاراگراف به صورت کاملاً طبیعی تمام کن (جمله یا پاراگراف را نصفه رها نکن).
7. **فرمت محتوای تولید شده**: خروجی باید به صورت کدهای HTML تمیز و سئو شده باشد. از تگ h1 یا h2 استفاده نکن (چون هدرهای اصلی بیرونی هستند).
${isLastSection ? `8. **تولید متادیتا (فقط برای بخش آخر)**: چون این بخش آخر مقاله است، باید متادیتا (metadata) شامل عنوان مقاله، خلاصه مقاله، عنوان سئو، توضیحات متا سئو، برچسب‌ها (tags) و سوالات متداول (faqs) را نیز تولید کنی.` : ''}

خروجی تو باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی دیگر بازنگردانی:
{
  "sectionContent": "محتوای کامل تولید شده برای این بخش به صورت HTML تمیز و استایل‌دهی شده بر اساس قوانین فوق",
  "styleFingerprint": "توصیف سبک نگارش (فقط برای بخش اول تولید شود، برای بخش‌های بعدی همان مقدار ورودی بازگردانده شود)",
  "lastParagraphs": "دو پاراگراف آخر این بخش جهت استفاده به عنوان پل ارتباطی در بخش بعدی"${isLastSection ? `,
  "metadata": {
    "title": "عنوان جذاب و کلیک‌خور برای مقاله",
    "summary": "یک خلاصه جذاب و کوتاه (حدود ۲ یا ۳ جمله) از کل مقاله جهت آرشیو وبلاگ",
    "seoTitle": "عنوان سئو (بین ۵۰ تا ۶۰ کاراکتر)",
    "seoDescription": "توضیحات متای سئو (بین ۱۵۰ تا ۱۶۰ کاراکتر شامل کلمات کلیدی و دعوت به اقدام)",
    "tags": ["تگ۱", "تگ۲", "تگ۳"],
    "faqs": [
      { "question": "سوال اول؟", "answer": "پاسخ سوال اول." },
      { "question": "سوال دوم؟", "answer": "پاسخ سوال دوم." }
    ],
    "slug": "slug-english-lowercase-with-hyphens"
  }` : ''}
}`;

      // Slice to include only the last generated chunk for continuity, reducing token usage significantly!
      const lastChunksToInclude = previousChunks.slice(-1);
      const previousContentString = lastChunksToInclude.length > 0 
        ? lastChunksToInclude.join('\n\n') 
        : 'هنوز محتوایی نوشته نشده است.';

      const userContent = `
موضوع کل مقاله: "${prompt}"
هدف جغرافیایی (Geo SEO): "${geoTarget || 'سراسر ایران'}"

لیست کامل Outline مقاله:
${JSON.stringify(activeOutline, null, 2)}

بخش فعلی که باید بنویسی:
- شماره بخش: ${activeIndex + 1} از ${sections.length}
- عنوان بخش: "${finalHeading}"
- تعداد کلمات تقریبی مورد نیاز: ${finalWords} کلمه

محتوای نوشته شده در بخش قبلی (جهت حفظ پیوستگی):
${previousContentString}

محصولات مرتبط جهت لینک‌دهی داخلی:
${productsContext || 'محصولی انتخاب نشده است.'}
`;

      const result = await callAiGateway<any>({
        shopId,
        endpoint: 'blog:generate-chunk:section',
        slot: 'content',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        mode: 'json',
        temperature: 0.3,
        maxTokens: 3000,
        requiredFields: ['sectionContent'],
        fallbackValue: { sectionContent: '', styleFingerprint: '', lastParagraphs: '' },
      });

      if (!result.success || !result.data) {
        return NextResponse.json({ error: result.error || 'تولید بخش محتوا ناموفق بود.' }, { status: 502 });
      }

      const parsed = result.data;

      return NextResponse.json({
        success: true,
        sectionContent: parsed.sectionContent || parsed.content,
        styleFingerprint: parsed.styleFingerprint || styleFingerprint,
        lastParagraphs: parsed.lastParagraphs || parsed.nextSectionBridge || '',
        metadata: parsed.metadata || null
      });
    }

    if (action === 'generate_single_field' || action === 'field') {
      const activeField = field || fieldName;
      if (!activeField) {
        return NextResponse.json({ error: 'مشخص کردن نام فیلد الزامی است.' }, { status: 400 });
      }

      const activeArticleData = currentData || currentArticleData;
      const articleText = activeArticleData?.content || '';
      const articleTitle = activeArticleData?.title || prompt || '';

      const systemPrompt = `تو یک متخصص سئو و ویراستار وبلاگ هستی.
وظیفه تو این است که بر اساس عنوان و محتوای مقاله داده شده، فیلد خاص "${activeField}" را به صورت کاملاً بهینه، جذاب و استاندارد تولید کنی.

فیلدهای مورد نظر:
- "title": عنوان بسیار جذاب و کلیک‌خور برای مقاله بر اساس محتوای موجود.
- "summary": یک خلاصه جذاب و ترغیب‌کننده (حداکثر ۲ یا ۳ جمله) از مقاله برای نمایش در کارت‌های وبلاگ.
- "tags": یک آرایه JSON از برچسب‌های کلیدی و مرتبط با موضوع مقاله (حداکثر ۵ تگ). نمونه: ["تگ۱", "تگ۲"]
- "seoTitle": عنوان سئو بهینه و کلیک‌خور (بین ۵۰ تا ۶۰ کاراکتر).
- "seoDescription": توضیحات متای سئو بهینه (بین ۱۵۰ تا ۱۶۰ کاراکتر شامل کلمات کلیدی و دعوت به اقدام).
- "faqs": یک آرایه JSON شامل ۳ الی ۵ سوال متداول و پاسخ‌های کوتاه و صریح بر اساس متن مقاله. ساختار: [{"question": "...", "answer": "..."}]

خروجی تو باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی دیگر بازنگردانی:
{
  "value": ${activeField === 'tags' || activeField === 'faqs' ? 'آرایه جیسان متناسب با فیلد' : '"رشته متنی مقدار تولید شده برای فیلد"'}
}`;

      const userContent = `
عنوان مقاله: "${articleTitle}"
محتوای مقاله:
${articleText || 'هنوز محتوایی وارد نشده است.'}

فیلد درخواستی جهت تولید: "${activeField}"
`;

      const result = await callAiGateway<any>({
        shopId,
        endpoint: 'blog:generate-chunk:field',
        slot: 'content',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        mode: 'json',
        temperature: 0.2,
        maxTokens: 1500,
        requiredFields: ['value'],
        fallbackValue: { value: '' },
      });

      if (!result.success || !result.data) {
        return NextResponse.json({ error: result.error || 'تولید فیلد ناموفق بود.' }, { status: 502 });
      }

      const parsed = result.data;

      return NextResponse.json({
        success: true,
        value: parsed.value
      });
    }

    // Default mode / all-in-one fallback
    if (action === 'all-in-one') {
      const systemPrompt = `تو یک نویسنده محتوای سئو، کپی‌رایتر و متخصص سئو تکنیکال هستی.
وظیفه تو این است که یک مقاله وبلاگ فوق‌العاده جامع، جذاب، سئو شده و کاملاً آماده را به صورت یکجا تولید کنی.

قوانین تولید مقاله و استایل‌دهی بصری فوق‌العاده شیک و مینیمال:
متن مقاله نباید ساده و خسته‌کننده باشد، اما در عین حال نباید با رنگ‌های زیاد شلوغ و زننده دیده شود. هدف ما یک طراحی کاملاً **مینیمال، تمیز و حرفه‌ای** است که خواننده خسته نشود:

1. **ترازبندی متن (Default Justify)**: تمام پاراگراف‌های متنی عادی (\`<p>\`) باید حتماً دارای کلاس ترازبندی جاستیفای باشند تا متن‌ها منظم و تراز شده نمایش داده شوند: \`<p class="text-justify leading-relaxed mb-4" style="text-align: justify;">\`
2. **پاراگراف لید (Lead Paragraph)**: اولین پاراگراف مقدمه مقاله را با کلاس \`<p class="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 text-justify" style="text-align: justify;">\` بنویس تا شروع مقاله با فونت درشت‌تر و جذاب‌تر نمایش داده شود.
3. **برجسته‌سازی هوشمند و محدود (Smart Bolding)**: جملات کلیدی, آمارها و مفاهیم اصلی را با تگ \`<strong>\` برجسته کن تا خواننده با مرور چشمی سریع نکات مهم را دریابد. در استفاده از بولد زیاده‌روی نکن.
4. **باکس‌های نکته و نقل‌قول مینیمال (Minimal Callout Boxes)**: به جای باکس‌های رنگارنگ شلوغ، از باکس‌های بسیار تمیز و مینیمال با یک حاشیه خاکستری/سرمه‌ای ملایم و بدون رنگ پس‌زمینه جیغ استفاده کن:
   \`<blockquote class="border-r-4 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl my-6 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">💡 <strong>نکته:</strong> متن نکته کلیدی یا ترفند...</blockquote>\`
5. **تیترهای فرعی تمیز (H3, H4)**: برای مرتب‌سازی مطالب، از تیترهای فرعی با تگ‌های \`<h3>\` و \`<h4>\` استفاده کن. برای جذابیت بیشتر، به آن‌ها کلاس‌های رنگی ملایم بده، مثلاً \`<h3 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4 border-b pb-2">\` یا \`<h4 class="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-6 mb-3">\`.
6. **لیست‌های مرتب و نامرتب (Styled Lists)**: به جای لیست‌های ساده، از لیست‌های مرتب (\`<ol class="list-decimal list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">\`) و نامرتب (\`<ul class="list-disc list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">\`) استفاده کن.
7. **جداول مقایسه‌ای شکیل و ساده (Comparison Tables)**: اگر در مقاله مقایسه‌ای انجام می‌شود، یک جدول HTML بسیار تمیز و مینیمال بدون رنگ‌های شلوغ بساز:
   \`<div class="overflow-x-auto my-6"><table class="w-full text-right border-collapse"><thead class="bg-slate-50 dark:bg-slate-800/50"><tr><th class="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">ویژگی</th><th class="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">محصول</th></tr></thead><tbody><tr><td class="p-3 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300">قیمت</td><td class="p-3 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300">مناسب</td></tr></tbody></table></div>\`
8. **کال تو اکشن‌های استاندارد و مینیمال همراه با تصویر محصول (Call to Action - CTA)**:
   - در کل مقاله باید به تعداد بسیار محدود (مثلاً **فقط یک بار** در کل مقاله برای مقالات کوتاه/متوسط و **حداکثر دو بار** برای مقالات بلند) از یک باکس کال تو اکشن فوق‌العاده شیک، استاندارد و حرفه‌ای استفاده کنی.
   - ساختار باکس CTA باید دقیقاً به صورت زیر باشد (تگ‌ها، کلاس‌ها و ساختار فلکس را دقیقاً رعایت کن):
     \`<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">\`
       \`<!-- اگر محصول دارای آدرس عکس (imageUrl) بود، حتماً تگ img زیر را با آدرس عکس واقعی محصول قرار بده، در غیر این صورت تگ img را کاملاً حذف کن -->\`
       \`<img src="آدرس_عکس_محصول" alt="عنوان_محصول" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />\`
       \`<div class="flex-1">\`
         \`<h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب کال تو اکشن (مثلاً: نیاز به مشاوره تخصصی برای خرید دارید؟)</h4>\`
         \`<p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه و ترغیب‌کننده برای اقدام کاربر...</p>\`
         \`<a href="/product/ID" class="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all">مشاهده و خرید محصول</a>\`
       \`</div>\`
     \`</div>\`
   - دقت کن شناسه محصول (ID) و آدرس عکس محصول (imageUrl) را دقیقاً از بخش اطلاعات محصولات برداری. هرگز آدرس عکس ساختگی یا تصادفی تولید نکن.

قوانین محتوایی و سئو:
1. **ساختار و سئو**: مقاله باید دارای ساختار منظم (H3, H4)، پاراگراف‌های جذاب، کلمات کلیدی پررنگ شده با تگ strong و لیست‌های منظم باشد. از تگ H1 یا H2 در بدنه اصلی استفاده نکن.
2. **برندینگ**: نام برند: "${finalBrandName}". دستورالعمل برند: "${finalBrandGuidelines}". برندینگ باید در تمام طول مقاله حفظ شود. آدرس وب‌سایت فروشگاه شما: "${shopUrl}" (دامنه: "${host}"). برند شما و آدرس وب‌سایت شما دقیقاً همین است. هرگز و تحت هیچ شرایطی آدرس‌های ساختگی، دامنه‌های خارجی یا متفرقه (مانند daewoo.com یا daewoooo.com یا هر آدرس دیگری غیر از "${shopUrl}") برای برند یا فروشگاه تولید نکن. اگر می‌خواهی به وب‌سایت برند یا فروشگاه اشاره کنی، فقط از آدرس نسبی "/" یا آدرس کامل "${shopUrl}" استفاده کن.
3. **لینک‌دهی داخلی**: به محصولات مرتبط ارائه شده در جاهای مناسب متن به صورت طبیعی با تگ HTML لینک (<a href="/product/ID" class="text-blue-600 hover:underline font-bold">نام محصول</a>) لینک بده. ساختار لینک محصول باید دقیقاً به صورت "/product/ID" باشد (نه "/products/ID").
4. **Geo SEO**: کلمات کلیدی محلی و جغرافیایی را در صورت وجود هدف جغرافیایی به صورت طبیعی ادغام کن. هدف جغرافیایی: "${geoTarget || 'سراسر ایران'}".
5. **اسکیما و سوالات متداول (Schema & FAQs)**:
   - یک بخش سوالات متداول (شامل ۳ الی ۵ سوال و پاسخ دقیق) متناسب با مقاله تولید کن.
   - کد اسکیما FAQPage (به صورت JSON-LD استاندارد) را برای مقاله تولید کن تا در نتایج گوگل رتبه بهتری بگیرد.
   - نکته مهم: بخش FAQ (سوالات متداول) را هرگز داخل فیلد content یا بدنه محتوا قرار نده؛ آن را فقط در فیلد ساختاریافته faqs قرار بده (سیستم آن را جداگانه با FAQ Schema رندر می‌کند).
6. **فرمت خروجی**: خروجی باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی دیگر بازنگردانی:

{
  "title": "عنوان مقاله",
  "slug": "slug-english",
  "content": "محتوای کامل مقاله به صورت کدهای HTML تمیز، زیبا و استایل‌دهی شده بر اساس قوانین فوق",
  "summary": "خلاصه کوتاه مقاله برای بخش آرشیو وبلاگ",
  "seoTitle": "عنوان سئو (بین ۵۰ تا ۶۰ کاراکتر)",
  "seoDescription": "توضیحات متای سئو (بین ۱۵۰ تا ۱۶۰ کاراکتر)",
  "tags": ["تگ۱", "تگ۲", "تگ۳"],
  "faqs": [
    { "question": "سوال اول؟", "answer": "پاسخ سوال اول." }
  ],
  "schemaMarkup": "کد اسکیما JSON-LD کامل و معتبر برای این مقاله"
}`;

      const userContent = `
موضوع مقاله / پرامپت کاربر: "${prompt}"
برند: "${finalBrandName}"
دستورالعمل برند: "${finalBrandGuidelines}"
هدف جغرافیایی (Geo SEO): "${geoTarget || 'سراسر ایران'}"

محصولات مرتبط جهت لینک‌دهی و تولید محتوا:
${productsContext || 'محصولی انتخاب نشده است.'}
`;

      const result = await callAiGateway<any>({
        shopId,
        endpoint: 'blog:generate-chunk:all-in-one',
        slot: 'content',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        mode: 'json',
        temperature: 0.3,
        maxTokens: 3500,
        requiredFields: ['title', 'content'],
        fallbackValue: { title: '', content: '', summary: '', seoTitle: '', seoDescription: '', tags: [], faqs: [] },
      });

      if (!result.success || !result.data) {
        return NextResponse.json({ error: result.error || 'تولید یکجای مقاله ناموفق بود.' }, { status: 502 });
      }

      const parsed = result.data;

      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: 'حالت یا عملیات نامعتبر.' }, { status: 400 });

  } catch (error: any) {
    console.error('Error in generate-chunk API:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
