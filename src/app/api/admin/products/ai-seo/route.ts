import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAiModel } from '@/lib/ai-model-resolver';
import { callAiGateway } from '@/lib/ai-gateway';

const DEFAULT_PROMPTS = {
  ai_seo_prompt_base: `تو یک محقق محتوای سئو هستی که وظیفه‌ات تکمیل و بهبود توضیحات محصول، تولید عنوان سئو (SEO Title)، توضیحات سئو (SEO Description)، ساختار کامل اسکیما (Schema Markup JSON-LD) و یک گزارش مینیمال و حرفه‌ای از اسکیما مطابق با آخرین استانداردهای روز گوگل است. از آنجا که ممکن است به ابزار جستجوی زنده وب دسترسی نداشته باشی، باید از دانش داخلی بسیار دقیق، مستند و واقعی خود به عنوان مرجع رسمی و اینترنتی استفاده کنی.

عنوان محصول: "{title}"

═══════════════════════════════════
مرحله ۱ — تأیید هویت محصول (اجباری):
═══════════════════════════════════

قبل از هر چیز، باید مطمئن شوی که محصول را به درستی می‌شناسی و هویت آن قابل تأیید است.
برند و مدل محصول را شناسایی کن.

قوانین تأیید هویت:
اگر محصول متعلق به یک برند و مدل معروف جهانی یا ملی است (مانند نایک/Nike، اپل/Apple، سامسونگ، زونتس و غیره) و تو اطلاعات کلی، سری محصول و ویژگی‌های اصلی آن را می‌دانی، هویت آن را تأیید شده فرض کن. نیازی به حفظ بودن تک‌تک جزئیات ریز کاتالوگ نیست؛ مشخصات استاندارد و کلی این مدل معروف کاملاً قابل قبول است.

اگر لیست مشخصات فنی ارائه شده خالی یا دارای کمتر از ۲ مورد است، معیار چهارم نادیده گرفته می‌شود و مطابقت ۲ مورد از ۳ مورد اول برای تأیید هویت کافی است:
۱. نام برند مطابقت دارد (مثلاً زونتس / Zontes یا نایک / Nike)
۲. نام مدل یا سری محصول مطابقت دارد (از روی عنوان استخراج شود، مثلاً Pegasus 41)
۳. نوع و دسته‌بندی محصول مطابقت دارد (مثلاً کفش ورزشی یا موتورسیکلت)
۴. حداقل ۲ مشخصه فنی از مشخصات فنی ارائه شده مطاببات دارد (فقط در صورتی که حداقل ۲ مشخصه وجود داشته باشد)

اگه شرایط فوق برای تأیید هویت محصول احراز نشد (یعنی محصول برای تو کاملاً ناشناخته است یا اطلاعات ورودی با دانش واقعی تو تضاد شدید دارد):
→ فرآیند را متوقف کن
→ فقط بنویس: «اطلاعات کافی برای تکمیل از اینترنت یافت نشد.»
→ هیچ چیز اضافه نکن و هیچ بخش دیگری تولید نکن.

═══════════════════════════════════
مرحله ۲ — جمع‌آوری اطلاعات (فقط بعد از تأیید):
═══════════════════════════════════

منابع معتبر به ترتیب اولویت:
۱. سایت رسمی برند
۲. کاتالوگ رسمی محصول
۳. فروشگاه‌های معتبر با صفحه مشخصات کامل
۴. نقد و بررسی‌های تخصصی معتبر

منابع غیرمعتبر — هرگز استفاده نکن:
❌ نظرات کاربران
❌ شبکه‌های اجتماعی
❌ سایت‌های ناشناس
❌ مطالب بدون منبع مشخص

═══════════════════════════════════
مرحله ۳ — قوانین استفاده از اطلاعات:
═══════════════════════════════════

✅ فقط اضافه کن:
- مشخصات فنی که در مشخصات فنی ارائه شده یا ورودی نبود ولی در منبع رسمی هست
- ویژگی‌هایی که برند رسماً اعلام کرده
- کاربردهای واقعی که در کاتالوگ رسمی ذکر شده

❌ هرگز اضافه نکن:
- ادعاهایی که منبع رسمی ندارند
- مقایسه با رقبا
- نظر شخصی یا تحلیل خودت
- اطلاعاتی که «احتمالاً» درست است
- هر چیزی که در منبع رسمی پیدا نشد

═══════════════════════════════════
مرحله ۴ — قوانین صداقت محتوا:
═══════════════════════════════════

ممنوع مطلق:
□ اغراق — «بهترین در نوع خود»، «بی‌نظیر»، «انقلابی» ← حذف
□ ادعای بدون سند — «کیفیت فوق‌العاده» ← حذف
□ تعمیم — «همه کاربران راضی هستند» ← حذف
□ وعده مبهم — «عمر طولانی» بدون عدد و مشخصات ← حذف

اگه یه ویژگی در منبع رسمی با عدد و مشخصه بیان شده → بنویس
اگه فقط به صورت کلی گفته شده → ننویس

═══════════════════════════════════
مرحله ۵ — فرمت خروجی:
═══════════════════════════════════

اگر محصول تایید شد، عنوان سئو (SEO Title)، توضیحات سئو (SEO Description)، ساختار کامل اسکیما (Schema Markup JSON-LD) و گزارش اسکیما (Schema Report) را بر اساس اطلاعات معتبر تولید کن.

قوانین انتخاب عنوان سئو:
۱. عنوان باید بین ۵۰ تا ۶۰ کاراکتر باشد.
۲. مهم‌ترین کلیدواژه را در ابتدای عنوان بگذار.
۳. عنوان باید برای کاربر جذاب و قابل کلیک باشد.
۴. از تکرار بی‌دلیل کلمات خودداری کن.
    ۵. ما در سیستم خود مکانیزمی داریم که پلیس‌هولدرهایی نظیر {title} (نام محصول)، {brand} (برند محصول)، {color} (رنگ/تنوع)، {price} (قیمت محصول) و {shopName} (نام فروشگاه) را به صورت پویا جایگزین می‌کند. شما می‌توانید از این متغیرها به صورت عینی (نوشتن کلماتی مثل {title}، {brand}، {color}، {price}) در عنوان خروجی استفاده کنید.

قوانین انتخاب توضیحات سئو (Meta Description):
۱. بین ۱۵۰ تا ۱۶۰ کاراکتر.
۲. شامل: [نام محصول یا متغیر {title}] + [مهم‌ترین ویژگی] + [دعوت به اقدام / CTA].
۳. طبیعی و غیر تبلیغاتی به نظر برسد.
۴. فقط از داده‌های واقعی موجود در متغیرها استفاده کن. از نوشتن موارد تخیلی جداً خودداری کن.
۵. متغیر فقط اگه ضروری بود استفاده کن (مثلا متغیر {shopName} برای نام فروشگاه و {price} برای قیمت محصول عالی است).

قوانین تولید اسکیما (Schema Markup JSON-LD):
۱. اسکیما باید یک شیء استاندارد JSON-LD مطابق با آخرین استانداردهای روز Schema.org و گوگل ریچ ریزالتز (Google Rich Results) برای محصولات (Product) باشد.
۲. شامل فیلدهای اصلی: name (نام محصول)، description (توضیحات محصول)، image (آدرس تصویر محصول)، sku (شناسه محصول)، brand (برند محصول)، offers (شامل price، priceCurrency، availability، itemCondition).
۳. اگر مشخصات فنی (specs) یا ویژگی‌ها (features) وجود دارد، آن‌ها را در بخش additionalProperty اسکیما به صورت حرفه‌ای قرار دهید.
۴. اگر تنوع محصول (variants) وجود دارد، آن‌ها را به عنوان آفرها (Offers) یا ویژگی‌های محصول منعکس کنید.
۵. اگر محصول دارای قیمت است، قیمت را به صورت عددی دقیق در بخش price قرار دهید و ارز را IRT (تومان) تنظیم کنید.
۶. از نوشتن کلمات متغیر مانند {title} در اسکیما خودداری کنید و به جای آن از مقادیر واقعی محصول استفاده کنید.
۷. اگر آدرس تصویر محصول ارائه شده است، حتماً آن را دقیقاً در فیلد image اسکیما قرار دهید (مثلاً ["آدرس_تصویر"]). هرگز از آدرس‌های فرضی مانند URL_تصویر_محصول_اینجا_قرار_میگیرد یا مثال‌های فرضی استفاده نکنید.

قوانین تولید گزارش اسکیما (Schema Report):
۱. یک گزارش بسیار مینیمال، استاندارد، حرفه‌ای و خلاصه (حداکثر در ۳ خط یا بند کوتاه) به زبان فارسی تهیه کنید.
۲. گزارش باید شامل: تایید صحت ساختار اسکیما، لیست بخش‌های تولید شده (مانند محصول، آفر، برند، ویژگی‌های فنی)، و تایید انطباق با آخرین استانداردهای گوگل (Google Rich Results) باشد.
۳. از لحن کاملاً حرفه‌ای و مهندسی استفاده کنید.

خروجی شما باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متنی قبل یا بعد از آن ارسال نکنید (از نوشتن توضیحات اضافی یا قرار دادن مارک‌داون خودداری کنید، فقط جیسان خام برگردانید):
{
  "seoTitle": "عنوان سئو تولید شده با متغیرها یا کلمات واقعی",
  "seoDescription": "توضیحات سئو تولید شده با متغیرها یا کلمات واقعی",
  "schemaMarkup": {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "نام واقعی محصول",
    "description": "توضیحات واقعی محصول",
    "image": [
      "آدرس واقعی تصویر محصول"
    ],
    "brand": {
      "@type": "Brand",
      "name": "برند واقعی محصول"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "IRT",
      "price": 1250000,
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  },
  "schemaReport": "گزارش متنی بسیار مینیمال، استاندارد و حرفه‌ای از اسکیماهای تولید شده به زبان فارسی. شامل تأیید صحت و استانداردهای روز گوگل ریچ ریزالتز (Google Rich Results) در ۲ الی ۳ خط کوتاه."
  }`,
  ai_seo_prompt_description: `توضیحات کوتاه محصول: "{description}"
قانون بخش توضیحات کوتاه: از نکات کلیدی، کاربردها و اهداف محصول ذکر شده در این توضیحات جهت غنی‌تر کردن توضیحات سئو استفاده کنید.`,
  ai_seo_prompt_brand: `برند محصول: "{brand}"
قانون بخش برند: حتماً نام برند را در عنوان سئو و در صورت لزوم در توضیحات سئو جای دهید تا اعتبار و اصالت کالا نمایان شود.`,
  ai_seo_prompt_price: `قیمت محصول: {price} تومان
قانون بخش قیمت: با تکیه بر قیمت کالا، از عبارات ترغیب‌کننده مانند "با بهترین قیمت"، "خرید مقرون‌به‌صرفه" یا "قیمت مناسب" در سئو استفاده کنید.`,
  ai_seo_prompt_type: `نوع محصول: {type}
قانون بخش نوع محصول: اگر محصول دانلودی است بر عباراتی چون "دانلود فوری"، "نسخه اصلی"، "فایل آماده" تاکید کنید و اگر فیزیکی است بر عبارات مربوط به ارسال تاکید شود.`,
  ai_seo_prompt_category: `دسته‌بندی محصول: "{category}"
قانون بخش دسته‌بندی: از کلمه کلیدی دسته‌بندی برای بهبود ساختار سئو و ارتباط موضوعی استفاده کنید.`,
  ai_seo_prompt_specs: `مشخصات فنی محصول: {specs}
قانون بخش مشخصات فنی: ویژگی‌های فنی برجسته و مشخصات کلیدی را در توضیحات سئو منعکس کنید تا پاسخ‌گوی جستجوهای تخصصی کاربران باشد.`,
  ai_seo_prompt_features: `ویژگی‌های برجسته محصول: {features}
قانون بخش ویژگی‌های برجسته: مزایای رقابتی و قابلیت‌های خاص محصول را در کانون توجه توضیحات سئو قرار دهید تا دلیلی محکم برای کلیک کردن به کاربر بدهید.`,
  ai_seo_prompt_variants: `تنوع و گزینه‌های محصول: {variants}
قانون بخش تنوع محصول: تنوع مدل‌ها، طرح‌ها یا رنگ‌های موجود را به سئو اضافه کنید تا نشان‌دهنده کامل بودن انتخاب‌ها باشد (مثلا: "در رنگ‌های متنوع").`,
  ai_seo_prompt_fulldesc: `خلاصه توضیحات تفصیلی محصول: "{fullDescription}"
قانون بخش توضیحات تفصیلی: جزئیات عمیق‌تر، کاربردهای فرعی و مزایای تکمیلی را از این بخش استخراج کرده و در بهینه‌سازی کلمات کلیدی توضیحات سئو بگنجانید.`,
  ai_seo_prompt_image: `آدرس تصویر محصول: "{imageUrl}"
قانون بخش تصویر: حتماً این آدرس دقیق تصویر را در فیلد image اسکیما قرار دهید و از قرار دادن مقادیر پیش‌فرض، فرضی یا تکرار نام متغیر خودداری کنید.`
};

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
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (innerError) {}
    }
    
    throw new Error('Failed to parse AI response as JSON');
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
    const { title, description, fullDescription, brand, price, type, categoryId, specs, features, variants, imageUrl } = body;

    if (!title) {
      return NextResponse.json({ error: 'لطفاً نام محصول را وارد کنید.' }, { status: 400 });
    }

    // 1. Fetch active package, system settings, and category in parallel to reduce DB latency
    const [shop, systemSettings, category] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        include: { package: true },
      }),
      prisma.systemSetting.findMany({
        where: {
          OR: [
            { key: { in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model'] } },
            { key: { startsWith: 'ai_seo_prompt_' } }
          ]
        }
      }),
      categoryId ? prisma.category.findFirst({ where: { id: categoryId, shopId } }) : Promise.resolve(null)
    ]);

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const isPackageActive = shop.packageExpiresAt ? new Date(shop.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? shop.package : null;

    if (!activePackage) {
      return NextResponse.json({ error: 'برای استفاده از سئوی هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.' }, { status: 403 });
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = JSON.parse(activePackage.features);
    } catch (e) {
      console.error('Error parsing features:', e);
    }

    if (!packageFeatures.aiSeoEnabled) {
      return NextResponse.json({ error: 'قابلیت تولید سئو با هوش مصنوعی در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    const settingsMap = new Map(systemSettings.map(s => [s.key, s.value]));

    if (settingsMap.get('ai_enabled') === 'false') {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
    }

    // 2. Resolve category name
    const categoryName = category?.name || '';

    // 3. Construct specs and features texts
    let specsText = '';
    if (specs) {
      try {
        const specsList = typeof specs === 'string' ? JSON.parse(specs) : specs;
        if (Array.isArray(specsList)) {
          specsText = specsList
            .filter((s: any) => s.key && s.value)
            .map((s: any) => `${s.key}: ${s.value}`)
            .join(' | ');
        }
      } catch (e) {}
    }

    let featuresText = '';
    if (features) {
      try {
        const featuresList = typeof features === 'string' ? JSON.parse(features) : features;
        if (Array.isArray(featuresList)) {
          featuresText = featuresList
            .filter((f: any) => f.key && f.value)
            .map((f: any) => `${f.key}: ${f.value}`)
            .join(' | ');
        }
      } catch (e) {}
    }

    // Clean and truncate fullDescription (stripping HTML tags)
    const cleanedFullDesc = fullDescription 
      ? fullDescription.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim().substring(0, 1000) 
      : '';

    let variantsText = '';
    if (variants) {
      try {
        const variantsList = typeof variants === 'string' ? JSON.parse(variants) : variants;
        if (Array.isArray(variantsList) && variantsList.length > 0) {
          variantsText = variantsList
            .filter((v: any) => v.name)
            .map((v: any) => `${v.name}${v.price ? ` (قیمت: ${Number(v.price).toLocaleString('fa-IR')} تومان)` : ''}`)
            .join(' ، ');
        }
      } catch (e) {}
    }

    // 4. Build active prompts map
    const activePrompts: Record<string, string> = { ...DEFAULT_PROMPTS };
    systemSettings.forEach(p => {
      if (p.key.startsWith('ai_seo_prompt_')) {
        activePrompts[p.key] = p.value;
      }
    });

    // If the database has an old base prompt, we update it in the background to avoid blocking the response
    const basePromptSetting = systemSettings.find(p => p.key === 'ai_seo_prompt_base');
    if (basePromptSetting && 
        (!basePromptSetting.value.includes('schemaMarkup') || 
         !basePromptSetting.value.includes('schemaReport') ||
         !basePromptSetting.value.includes('از آنجا که ممکن است به ابزار جستجوی زنده وب دسترسی نداشته باشی') ||
         !basePromptSetting.value.includes('{price}') ||
         basePromptSetting.value.includes('شما یک کارشناس حرفه‌ای سئو') || 
         (basePromptSetting.value.includes('قوانین تولید عنوان سئو') && !basePromptSetting.value.includes('منطق انتخاب متغیر')) ||
         basePromptSetting.value.includes('قوانین انتخاب عنوان سئو:'))) {
      
      prisma.systemSetting.update({
        where: { key: 'ai_seo_prompt_base' },
        data: { value: DEFAULT_PROMPTS.ai_seo_prompt_base },
      }).catch(err => console.error('Error updating system setting in DB (background):', err));
      
      activePrompts.ai_seo_prompt_base = DEFAULT_PROMPTS.ai_seo_prompt_base;
    }

    // Start building prompt segments dynamically
    const promptSegments: string[] = [];

    // Base Prompt (always present)
    let basePrompt = activePrompts.ai_seo_prompt_base || DEFAULT_PROMPTS.ai_seo_prompt_base;
    basePrompt = basePrompt.replace(/{title}/g, title);
    promptSegments.push(basePrompt);

    // Short Description Prompt
    if (description && description.trim()) {
      let descPrompt = activePrompts.ai_seo_prompt_description || DEFAULT_PROMPTS.ai_seo_prompt_description;
      descPrompt = descPrompt.replace(/{description}/g, description);
      promptSegments.push(descPrompt);
    }

    // Brand Prompt
    if (brand && brand.trim()) {
      let brandPrompt = activePrompts.ai_seo_prompt_brand || DEFAULT_PROMPTS.ai_seo_prompt_brand;
      brandPrompt = brandPrompt.replace(/{brand}/g, brand);
      promptSegments.push(brandPrompt);
    }

    // Price Prompt
    if (price) {
      let pricePrompt = activePrompts.ai_seo_prompt_price || DEFAULT_PROMPTS.ai_seo_prompt_price;
      pricePrompt = pricePrompt.replace(/{price}/g, Number(price).toLocaleString('fa-IR'));
      promptSegments.push(pricePrompt);
    }

    // Type Prompt
    if (type && type.trim()) {
      let typePrompt = activePrompts.ai_seo_prompt_type || DEFAULT_PROMPTS.ai_seo_prompt_type;
      typePrompt = typePrompt.replace(/{type}/g, type === 'digital' ? 'دانلودی (فایل)' : 'فیزیکی');
      promptSegments.push(typePrompt);
    }

    // Category Prompt
    if (categoryName && categoryName.trim()) {
      let catPrompt = activePrompts.ai_seo_prompt_category || DEFAULT_PROMPTS.ai_seo_prompt_category;
      catPrompt = catPrompt.replace(/{category}/g, categoryName);
      promptSegments.push(catPrompt);
    }

    // Specs Prompt
    if (specsText && specsText.trim()) {
      let specsPrompt = activePrompts.ai_seo_prompt_specs || DEFAULT_PROMPTS.ai_seo_prompt_specs;
      specsPrompt = specsPrompt.replace(/{specs}/g, specsText);
      promptSegments.push(specsPrompt);
    }

    // Features Prompt
    if (featuresText && featuresText.trim()) {
      let featPrompt = activePrompts.ai_seo_prompt_features || DEFAULT_PROMPTS.ai_seo_prompt_features;
      featPrompt = featPrompt.replace(/{features}/g, featuresText);
      promptSegments.push(featPrompt);
    }

    // Variants Prompt
    if (variantsText && variantsText.trim()) {
      let varPrompt = activePrompts.ai_seo_prompt_variants || DEFAULT_PROMPTS.ai_seo_prompt_variants;
      varPrompt = varPrompt.replace(/{variants}/g, variantsText);
      promptSegments.push(varPrompt);
    }

    // Full Description Prompt
    if (cleanedFullDesc && cleanedFullDesc.trim()) {
      let fullDescPrompt = activePrompts.ai_seo_prompt_fulldesc || DEFAULT_PROMPTS.ai_seo_prompt_fulldesc;
      fullDescPrompt = fullDescPrompt.replace(/{fullDescription}/g, cleanedFullDesc);
      promptSegments.push(fullDescPrompt);
    }

    // Image Prompt
    if (imageUrl && imageUrl.trim()) {
      let imgPrompt = activePrompts.ai_seo_prompt_image || DEFAULT_PROMPTS.ai_seo_prompt_image;
      imgPrompt = imgPrompt.replace(/{imageUrl}/g, imageUrl);
      promptSegments.push(imgPrompt);
    }

    const prompt = promptSegments.join('\n\n');

    // 5. Request via Canonical AI Client
    const result = await callAiGateway({
      shopId,
      endpoint: 'ai-seo',
      slot: 'content', // SEO content slot
      messages: [{ role: 'user', content: prompt }],
      mode: 'json',
      temperature: 0.3,
      maxTokens: 1000,
      requiredFields: ['seoTitle', 'seoDescription'],
      skipQuotaCheck: false,
      featureKey: 'aiSeoEnabled',
    });

    if (!result.success) {
      if (result.error?.includes('اطلاعات کافی') || result.text?.includes('اطلاعات کافی')) {
        return NextResponse.json({ error: 'اطلاعات کافی برای تکمیل از اینترنت یافت نشد.' }, { status: 422 });
      }
      return NextResponse.json({ error: result.error || 'تولید سئو پس از چند بار تلاش ناموفق بود.' }, { status: 502 });
    }

    const parsedSeo = result.data || {};

    return NextResponse.json({
      success: true,
      seoTitle: parsedSeo.seoTitle,
      seoDescription: parsedSeo.seoDescription,
      schemaMarkup: parsedSeo.schemaMarkup ? JSON.stringify(parsedSeo.schemaMarkup, null, 2) : null,
      schemaReport: parsedSeo.schemaReport || null
    });

  } catch (error) {
    console.error('Error in AI SEO API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
