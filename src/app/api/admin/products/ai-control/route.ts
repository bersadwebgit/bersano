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
import { searchProducts, formatProductsForContext } from '@/lib/product-search';

interface AiProductControlResponse {
  success: boolean;
  explanation?: string;
  formData?: Record<string, unknown>;
  featuresList?: unknown[];
  specsList?: unknown[];
  galleryUrls?: unknown[];
  variants?: unknown[];
  faqItems?: unknown[];
  warnings?: string[];
}

async function searchPexelsImage(query: string, apiKey?: string): Promise<string | null> {
  if (apiKey) {
    try {
      const cleanQuery = query.replace(/[_-]/g, ' ');
      const encodedQuery = encodeURIComponent(cleanQuery);
      const url = `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const photos = data.photos || [];
        if (photos.length > 0) {
          const index = Math.min(Math.floor(Math.random() * photos.length), photos.length - 1);
          const photo = photos[index];
          return photo.src?.portrait || photo.src?.large || photo.src?.original || null;
        }
      }
    } catch (error) {
      console.error('Error searching Pexels API:', error);
    }
  }
  return null;
}

async function searchWikimediaImage(query: string): Promise<string | null> {
  try {
    const cleanQuery = query.replace(/[_-]/g, ' ');
    const encodedQuery = encodeURIComponent(cleanQuery);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&srnamespace=6&format=json&srlimit=3`;
    const response = await fetch(searchUrl);
    if (!response.ok) return null;
    const searchData = await response.json();
    const results = searchData.query?.search || [];
    
    if (results.length > 0) {
      const item = results[Math.floor(Math.random() * results.length)];
      const title = item.title;
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
      const infoRes = await fetch(infoUrl);
      if (!infoRes.ok) return null;
      const infoData = await infoRes.json();
      const pages = infoData.query?.pages || {};
      const pageId = Object.keys(pages)[0];
      const imageInfo = pages[pageId]?.imageinfo || [];
      if (imageInfo.length > 0) {
        return imageInfo[0].url;
      }
    }
  } catch (err) {
    console.error('Wikimedia search error:', err);
  }
  return null;
}

async function searchUnsplashImage(query: string): Promise<string | null> {
  return searchWikimediaImage(query);
}

function pruneInputState(prompt: string, state: any) {
  const normalizedPrompt = prompt.toLowerCase();
  const before = JSON.stringify(state).length;

  // Clone state so we don't modify the original state that will be merged later
  const prunedState: any = {
    formData: { ...state.formData },
  };

  // Keywords based on requirements
  const pricingKeywords = ['قیمت', 'مبلغ', 'بها', 'تومان', 'تمن', 'ریال', 'هزینه', 'تخفیف', 'موجودی', 'انبار', 'price', 'discount', 'stock', 'special', 'گرون', 'ارزون', 'آف'];
  const contentKeywords = ['توضیح', 'شرح', 'متن', 'معرفی', 'دیسکریپشن', 'محتوا', 'سئو', 'ویژگی', 'فیلد', 'مشخصه', 'مشخصات', 'فنی', 'جدول', 'دیتا', 'desc', 'text', 'info', 'content', 'about', 'write', 'seo', 'feature', 'attr', 'spec', 'tech'];
  const variantKeywords = ['تنوع', 'رنگ', 'سایز', 'مدل', 'گارانتی', 'ابعاد', 'variant', 'color', 'size', 'option'];

  const isPricing = pricingKeywords.some(keyword => normalizedPrompt.includes(keyword));
  const isContent = contentKeywords.some(keyword => normalizedPrompt.includes(keyword));
  const isVariant = variantKeywords.some(keyword => normalizedPrompt.includes(keyword));

  const keepAll = !isPricing && !isContent && !isVariant;

  if (keepAll || isPricing || isVariant) {
    prunedState.formData.price = state.formData.price;
    prunedState.formData.discount = state.formData.discount;
    prunedState.formData.discountPercent = state.formData.discountPercent;
    prunedState.formData.stock = state.formData.stock;
    prunedState.formData.isSpecial = state.formData.isSpecial;
    prunedState.formData.specialEndsAt = state.formData.specialEndsAt;
  } else {
    delete prunedState.formData.price;
    delete prunedState.formData.discount;
    delete prunedState.formData.discountPercent;
    delete prunedState.formData.stock;
    delete prunedState.formData.isSpecial;
    delete prunedState.formData.specialEndsAt;
  }

  if (keepAll || isContent || isVariant) {
    prunedState.formData.description = state.formData.description;
    prunedState.formData.fullDescription = state.formData.fullDescription;
    prunedState.featuresList = state.featuresList || [];
    prunedState.specsList = state.specsList || [];
  }

  if (keepAll || isVariant) {
    prunedState.variants = state.variants || [];
  }

  // Keep other basic fields
  prunedState.formData.title = state.formData.title;
  prunedState.formData.id = state.formData.id;
  prunedState.faqItems = state.faqItems || [];
  prunedState.galleryUrls = state.galleryUrls || [];

  const after = JSON.stringify(prunedState).length;
  console.log(`[AI] Context reduced: ${before} → ${after} chars`);

  return prunedState;
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای مدیریت و کنترل فیلدهای محصول در پنل مدیریت فروشگاهساز هستی.
وظیفه تو این است که وضعیت فعلی محصول (شامل مشخصات اصلی، ویژگی‌ها، مشخصات فنی، تنوع‌ها و سوالات متداول) را به همراه دستور (پرامپت) کاربر دریافت کنی و تغییرات درخواستی کاربر را با اعمال منطق‌های دقیق ریاضی، تاریخی و محتوایی روی داده‌ها پیاده‌سازی کنی و داده‌های جدید و آپدیت شده را برگردانی.

اطلاعات زمانی مبنا:
__TODAY_DATE__
- اگر کاربر به زمان‌هایی مثل "تا ۳ شنبه ۲۰ تیر" اشاره کرد، باید تاریخ شمسی را دقیقاً به میلادی تبدیل کنی:
  * مثلاً "۲۰ تیر ۱۴۰۵" برابر می‌شود با "2026-07-14" (سه شنبه ۲۰ تیر ۱۴۰۵ مصادف با ۱۴ جولای ۲۰۲۶ است).
  * حتماً محاسبات تاریخ را برای انقضای تخفیف ویژه (specialEndsAt) انجام بده و خروجی را با فرمت "YYYY-MM-DD" یا ISO "YYYY-MM-DDTHH:mm:ss.sssZ" تنظیم کن.

═══════════════════════════════════
قوانین محاسباتی و منطقی:
═══════════════════════════════════
1. افزایش/کاهش قیمت:
   - اگر کاربر گفت "قیمت را ۲۰ درصد ببر بالا" یا "۲۰ درصد گرون‌تر کن":
     قیمت فعلی (formData.price) را خوانده و ۱.۲ برابر کن.
   - اگر گفت "قیمت را ۵۰۰۰۰ تومان کم کن":
     مقدار ۵۰۰۰۰ را از قیمت فعلی کم کن.
   - همیشه قیمت نهایی را به عنوان رشته یا عدد معتبر ذخیره کن و در صورت تخفیف‌دار بودن، درصد تخفیف را مجدداً بر اساس قیمت جدید محاسبه یا آپدیت کن.

2. تخفیف (Discount):
   - "discount" مبلغ تخفیف به تومان است (مثلاً اگر قیمت ۱۰۰,۰۰۰ تومان است و تخفیف ۲۰٪ است، مبلغ تخفیف ۲۰,۰۰۰ تومان می‌شود).
   - "discountPercent" درصد تخفیف است (مثلاً "20").
   - اگر کاربر گفت "۲۰ درصد برو تو تخفیف تا ۲۰ تیر":
     * formData.isSpecial را true کن.
     * تاریخ انقضا (formData.specialEndsAt) را به تاریخ میلادی ۲۰ تیر ۱۴۰۵ (که می‌شود 2026-07-14) تنظیم کن.
     * مبلغ تخفیف را محاسبه کن (قیمت ضربدر ۲۰ تقسیم بر ۱۰۰) و در formData.discount بگذار.
     * درصد تخفیف را در formData.discountPercent برابر "20" قرار بده.

3. موجودی (Stock):
   - اگر گفت "موجودی اضافه کن ۱۰۰۰ تا" یا "۱۰۰۰ تا به موجودی اضافه کن":
     موجودی فعلی (formData.stock) را بخوان (اگر خالی بود، صفر در نظر بگیر)، ۱۰۰۰ به آن اضافه کن و ذخیره کن.
   - اگر گفت "موجودی را صفر کن" یا "ناموجود کن":
     موجودی را "0" قرار بده و isActive را در صورت درخواست غیرفعال کن (در غیر این صورت فقط موجودی 0 شود).

4. سوالات متداول (FAQ Items):
   - لیست faqItems آرایه‌ای از اشیا با ساختار { question, answer } است.
   - اگر گفت "سوال متداول ۲ و ۳ را پاک کن":
     عناصر با ایندکس ۱ و ۲ (آیتم دوم و سوم در لیست ۱-ایندکس) را از آرایه faqItems حذف کن.
   - اگر گفت "سوال متداول اول را تغییر بده به ...":
     آیتم اول (ایندکس 0) را ویرایش کن.
   - اگر گفت "سوال متداول اضافه کن: س: ... ج: ...":
     یک سوال جدید به انتهای آرایه faqItems اضافه کن.

5. تنوع‌ها (Variants) - موتور پردازشگر فوق‌العاده هوشمند و همه‌منظوره (Universal Variant Parser - فوق‌العاده حیاتی):
   تو باید مجهز به یک موتور استخراج تنوع بسیار منعطف و هوشمند باشی که هر نوع فرمت ورودی از سمت کاربر (شامل: لیست‌های کپی-پیست شده از اکسل، متن‌های متوالی، جملات عامیانه، بندهای گلوله‌ای (bullet points)، جداول متنی، فرمت‌های کلید-مقدار، خطوط جداگانه و خط‌به‌خط، جملات تفصیلی و انگلیسی یا عددی مخلوط) را با دقت ۱۰۰٪ آنالیز کرده و به آرایه ساختاریافته variants تبدیل کند.
   
   - ساختار هر تنوع در آرایه variants:
     { id?, name, colorCode, imageUrl, price, stock, isDefault }

   - تشخیص و استخراج تنوع‌ها از هر نوع فرمت ورودی (Any Input Format Detection):
     فرقی نمی‌کند کاربر تنوع‌ها را چطور فرستاده باشد:
     * فرمت خط‌به‌خط یا کپی‌شده (مانند نمونه‌های کپی شده از اکسل یا نوت):
       "مشکی مات (0% تغییر قیمت)
        سفید مینیمال (0% تخفیف)
        نقره‌ای متالیک (+5% قیمت)
        قرمز گیمینگ (+10% قیمت)
        سبز نئونی (+7% قیمت)"
     * فرمت متنی روان و عامیانه:
       "رنگ‌های مشکی مات بدون تغییر قیمت، سفید مینیمال بدون تخفیف، نقره‌ای متالیک با ۵ درصد افزایش و قرمز گیمینگ با ۱۰ درصد گرونتر و سبز نئونی با ۷ درصد گرونتر اضافه کن"
     * فرمت‌های خط تیره، اسلش، یا ویرگول:
       "مشکی مات / قیمت ثابت | نقره‌ای متالیک / ۵٪ افزایش" یا "سایز L، سایز XL، سایز XXL"
     * فرمت‌های با قیمت مطلق:
       "رنگ صورتی قیمت ۱۵۰۰۰۰۰ تومان و رنگ آبی قیمت ۱۶۰۰۰۰۰ تومان با موجودی ۲۰ عدد"
     در تمامی این فرمت‌ها، تو باید با دقت کل متن را اسکن کنی، بخش‌های توصیف‌کننده تنوع (رنگ، سایز، مدل، ظرفیت، گارانتی) را بیابی، کدهای رنگ یا موجودی یا قیمت اختصاصی هر یک را استخراج کنی.

   - ترکیب خودکار چندسطحی (Multi-level Combinations):
     اگر کاربر چند ویژگی مختلف را همزمان خواست (مثلاً "رنگ‌های قرمز و آبی با سایزهای L و XL" یا "حافظه ۲۵۶ و ۵۱۲ با رنگ‌های مشکی و سفید")، تو باید به صورت خودکار تمام ترکیب‌های ممکن را بسازی و نام آن‌ها را با علامت خط تیره و فاصله " - " جدا کنی.
     * مثال: "رنگ‌های قرمز و آبی با سایزهای L و XL" تبدیل می‌شود به ۴ تنوع:
       1. "L - قرمز"
       2. "XL - قرمز"
       3. "L - آبی"
       4. "XL - آبی"
     این کار فرآیند تعریف تنوع‌های چندسطحی را برای کاربر بی‌نهایت ساده می‌کند!

   - ارث‌بری هوشمند قیمت و موجودی (Smart Inheritance):
     * هر تنوع جدیدی که ایجاد می‌کنی، اگر کاربر قیمت یا موجودی خاصی برایش مشخص نکرده بود، باید به طور خودکار قیمت اصلی محصول (formData.price) و موجودی اصلی محصول (formData.stock) را به عنوان مقادیر پیش‌فرض به آن اختصاص دهی.
     * اگر کاربر گفت "رنگ قرمز ۱۰ هزار تومن گرون‌تر باشه"، قیمت آن را برابر قیمت اصلی محصول بعلاوه ۱۰۰۰۰ قرار بده.

   - تشخیص هوشمند و پیشرفته کدهای رنگ هگز پریمیوم و مدرن:
     * برای رنگ‌های خاص و مدرن تفکیک قائل شو و نزدیک‌ترین کد هگز را برایشان ست کن:
       * مشکی مات (Matte Black): "#1f1f1f" یا "#222222"
       * سفید مینیمال (Minimal White): "#fafafa" یا "#ffffff"
       * نقره‌ای متالیک (Metallic Silver): "#b0b7bd" یا "#c0c0c0"
       * قرمز گیمینگ (Gaming Red): "#e60000" یا "#dc2626"
       * سبز نئونی (Neon Green): "#39ff14" یا "#22c55e"
       * خاکستری کربنی/ذغالی (Carbon Gray): "#374151"
       * طلایی لوکس/متالیک (Gold): "#d4af37" یا "#ffd700"
       * سرمه‌ای کلاسیک (Navy Blue): "#1e3a8a"
       * رز گلد / صورتی ملایم (Rose Gold): "#b76e79"
       * برای سایر رنگ‌های استاندارد فارسی کد دقیق هگز هماهنگ تولید کن. اگر تنوع شامل رنگ نبود، مقدار colorCode را null بگذار.
       * در تنوع‌های ترکیبی (مانند "L - قرمز")، رنگ را استخراج کرده و کد هگز آن را ست کن.

6. ویژگی‌ها و مشخصات فنی (featuresList & specsList):
   - این لیست‌ها شامل آرایه‌ای از { key, value } هستند.
   - اگر کاربر خواست ویژگی یا مشخصه‌ای اضافه, حذف یا ویرایش شود، این کار را دقیقاً روی آرایه‌های مربوطه انجام بده.
   - همگام‌سازی خودکار تنوع‌ها با ویژگی‌ها (Auto-Sync Variants to featuresList - فوق‌العاده حیاتی):
     * هر زمان که تنوع‌های جدیدی (مانند رنگ‌بندی، سایزها، حافظه یا هر آپشن دیگری) ایجاد، ویرایش یا مجدداً تنظیم می‌شوند، تو باید به طور اتوماتیک مقادیر نام تمیز تنوع‌ها را استخراج کرده و آن‌ها را به عنوان یک ویژگی جدید یا به‌روزرسانی شده در 'featuresList' قرار دهی!
     * به عنوان مثال، اگر رنگ‌بندی‌های مختلف (مانند مشکی مات، سفید مینیمال، نقره‌ای متالیک، قرمز گیمینگ، سبز نئونی) برای محصول تعریف شده است، حتماً بررسی کن و ویژگی با کلید 'رنگ‌بندی' یا 'رنگ' را در 'featuresList' ایجاد یا آپدیت کن و مقدار آن را برابر با لیست کاملاً مرتب از رنگ‌های موجود که با کامای فارسی از هم جدا شده‌اند بگذار (مثال: { "key": "رنگ‌بندی", "value": "مشکی مات، سفید مینیمال، نقره‌ای متالیک, قرمز گیمینگ, سبز نئونی" }).
     * همین قاعده را برای ویژگی‌های دیگری مانند سایز (کلید 'سایزهای موجود' یا 'ابعاد' با مقدار "L، XL، M") یا ظرفیت حافظه (کلید 'حافظه داخلی' با مقدار "۱۲۸ گیگابایت، ۲۵۶ گیگابایت") اجرا کن. این کار تضمین می‌کند مشخصات برجسته محصول همیشه با تنوع‌های فعال آن همگام و کامل باشد.

7. تنظیمات عمده‌فروشی و B2B (Wholesale & B2B Settings):
   - فیلدهای زیر را در formData طبق درخواست کاربر مدیریت کن:
     * "wholesalePrice": قیمت پایه عمده‌فروشی به تومان.
     * "moq": حداقل مقدار سفارش (Minimum Order Quantity). مثلاً "حداقل خرید ۵۰ تا باشه" -> "moq": 50
     * "wholesaleUnit": واحد سفارش عمده (مانند "عدد"، "کارتن"، "پالت").
     * "wholesaleUnitSize": تعداد کالا در هر واحد عمده (مثلاً "کارتن‌های ۲۴ تایی" -> "wholesaleUnitSize": 24 و "wholesaleUnit": "کارتن").
     * "weight": وزن کالا بر حسب کیلوگرم (مثلاً "وزن محصول نیم کیلوگرم باشه" -> "weight": 0.5)
     * "volume": حجم کالا بر حسب دسی‌متر مکعب یا لیتر (مثلاً "حجم محصول ۲ لیتر باشه" -> "volume": 2)
  - تخفیف پله‌ای (wholesaleTiers):
    * این فیلد یک آرایه از اشیاء به صورت رشته JSON (Stringified) است: [{ "minQty": number, "maxQty": number | null, "discountPercent": number }]
    * اگر کاربر تخفیف پله‌ای بر اساس حجم خرید خواست، آرایه را بساز و به صورت رشته JSON معتبر در formData.wholesaleTiers قرار بده.
    * مثال: "۱۰۰ تا ۵۰۰ عدد ۱۵ درصد تخفیف، بالای ۵۰۰ عدد ۲۵ درصد تخفیف" -> 
      '[{"minQty":100,"maxQty":500,"discountPercent":15},{"minQty":501,"maxQty":null,"discountPercent":25}]'
  - قیمت اختصاصی مشتری یا گروه (wholesaleExclusivePrices):
    * این فیلد یک آرایه از اشیاء به صورت رشته JSON (Stringified) است: [{ "target": string, "price": number }]
    * اگر کاربر قیمت اختصاصی خواست، آرایه را بساز و به صورت رشته JSON معتبر در formData.wholesaleExclusivePrices قرار بده.
    * مثال: "قیمت برای گروه همکار ۳۵ هزار تومن باشه" ->
      '[{"target":"همکار","price":35000}]'

8. محصولات برند و معروف (Famous & Branded Products - CRITICAL):
   - اگر محصول درخواستی متعلق به یک برند معروف جهانی یا ایرانی (مانند اپل/آیفون، سامسونگ، شیائومی، سونی، ال‌جی، ایسوس، تسکو و غیره) است، حتی اگر کاربر توضیحات کوتاهی داده باشد، تو موظف هستی تمام فیلدهای اطلاعاتی را با تکیه بر دانش عمیق خود از آن محصول به طور کامل، واقعی و دقیق پر کنی:
     * فیلد "brand" (برند): نام دقیق برند را به فارسی یا انگلیسی بنویس (مثلاً "اپل" یا "Apple").
     * فیلد "categoryId" (دسته‌بندی): بر اساس لیست دسته‌بندی‌های موجود که در انتهای کانتکست برایت فرستاده می‌شود، مناسب‌ترین دسته‌بندی را انتخاب کرده و شناسه (id) دقیق آن را در "categoryId" قرار بده (مثلاً برای آیفون، شناسه دسته‌بندی گوشی موبایل را قرار بده).
     * فیلد "description" (توضیحات کوتاه): یک پاراگراف کوتاه، جذاب و حرفه‌ای درباره محصول بنویس.
     * فیلد "fullDescription" (توضیحات کامل / مقاله سئو): یک مقاله سئوی بسیار جامع، شکیل و خواندنی به صورت HTML بنویس که شامل هدینگ‌های h3 تمیز، پاراگراف‌های تراز شده (text-justify)، لیست‌های مرتب/نامرتب از ویژگی‌ها و جدول مقایسه‌ای یا مشخصات باشد (لحن توضیحات محصول باید به گونه‌ای صمیمانه و روان باشد که انگار خود صاحب برند و فروشگاه متن را به صورت دستی و با عشق نوشته است؛ همچنین نام برند را هر از گاهی به صورت کاملاً طبیعی، استاندارد و بر اساس اصول سئو در بین متن قرار بده بدون اینکه برای مخاطب آزاردهنده باشد).
     * فیلد "seoTitle" و "seoDescription": عنوان و توضیحات سئوی استاندارد و بهینه تولید کن.
     * آرایه "faqItems" (سوالات متداول): حداقل ۳ تا ۵ سوال و پاسخ متداول و بسیار کاربردی خریداران درباره این محصول را به صورت اشیاء { question, answer } تولید کن.
     * آرایه‌های "featuresList" (ویژگی‌ها) و "specsList" (مشخصات فنی): مشخصات فنی واقعی و دقیق محصول (مانند پردازنده، رم، دوربین، صفحه نمایش، باتری، ابعاد و غیره) را به صورت اشیاء { key, value } بنویس.
     * فیلد "imageUrl" (تصویر اصلی) و آرایه "galleryUrls" (گالری تصاویر): اگر کاربر تصویری پیوست نکرده است، یک عبارت جستجوی انگلیسی بسیار دقیق، توصیفی و مرتبط با محصول (مانند "iphone-17-pro-orange" یا "apple-iphone-17-pro") را در "imageUrl" و عناصر "galleryUrls" بنویس تا سیستم به صورت خودکار تصویر واقعی آن را از اینترنت دریافت کند. هرگز آدرس عکس فرضی یا نامرتبط تولید نکن.

9. قوانین نام‌گذاری و برندینگ هوشمند (Smart Branding & Naming Rules - بسیار مهم):
   - هرگز و تحت هیچ شرایطی نام فروشگاه یا برند خود فروشگاه (مثلاً "فروشگاه موبایل قاسمی" یا "در فروشگاه ...") را به انتهای عنوان اصلی محصول (formData.title) اضافه نکن. عنوان اصلی محصول باید کاملاً تمیز، حرفه‌ای، دقیق و فقط شامل نام واقعی خود کالا باشد (مثلاً "گوشی موبایل سامسونگ گلکسی S25 اولترا" یا "موتور سیکلت زونتس").
   - اضافه کردن نام فروشگاه به عنوان اصلی محصول یک اشتباه بزرگ است و تجربه کاربری و سئو را خراب می‌کند. نام فروشگاه فقط در صورت لزوم و به صورت کاملاً پویا توسط فرانت‌اند در صفحات نمایش داده می‌شود و نیازی نیست تو آن را در فیلد title ذخیره کنی.
   - نام برند تولیدکننده کالا (مانند "سامسونگ" یا "Samsung") را به صورت طبیعی در عنوان بیاور، اما نام فروشگاه عرضه‌کننده را هرگز به عنوان محصول اضافه نکن.

10. انتساب دسته‌بندی هوشمند و دقیق (Smart & Accurate Category Assignment - فوق‌العاده حیاتی):
   - برای هر محصولی که ایجاد یا ویرایش می‌کنی، تو موظف هستی عنوان، برند و ماهیت آن محصول را با دقت ۱۰۰٪ تحلیل کنی و با لیست دسته‌بندی‌های موجود در انتهای کانتکست مطابقت دهی.
   - مناسب‌ترین و مرتبط‌ترین دسته‌بندی را انتخاب کرده و شناسه (id) دقیق آن را در فیلد "categoryId" قرار بده.
   - **قانون عدم تداخل موضوعی (بسیار حیاتی):** هرگز و تحت هیچ شرایطی نباید یک محصول را به دسته‌بندی غیرمرتبط یا کاملاً بی‌ربط اختصاص دهی! به عنوان مثال:
     * اگر کالا "کفش ورزشی نایک"، "تیشرت"، "شلوار" یا هر نوع پوشاک دیگری است، انتساب آن به دسته‌بندی "موبایل و تبلت" یا "لوازم دیجیتال" یک خطای مهلک است. تو باید بگردی و شناسه دسته‌بندی مرتبط مانند "کفش"، "پوشاک"، "پوشیدنی"، "ورزشی" یا دسته‌بندی‌های عمومی‌تر مربوطه را پیدا کرده و قرار دهی.
     * اگر کالا "گوشی سامسونگ"، "آیفون" یا "تبلت شیائومی" است، باید به دسته‌بندی "موبایل و تبلت" یا "کالای دیجیتال" اختصاص یابد.
   - همیشه معنا و مفهوم دسته‌بندی‌ها را بررسی کن (مثلاً تفاوت بین پوشاک و الکترونیک). اگر هیچ دسته‌بندی حتی با ارتباط معنایی کم وجود نداشت، فیلد "categoryId" را برابر با null قرار بده، اما هرگز آن را به یک دسته‌بندی کاملاً بی‌ربط نظیر "موبایل و تبلت" انتساب نده.

- قوانین و محدودیت‌های اعتبارسنجی (بسیار مهم):
  ۱. قیمت محصول (price) نمی‌تواند منفی باشد.
  ۲. موجودی محصول (stock) نمی‌تواند منفی باشد.
  ۳. درصد تخفیف محصول (discountPercent) باید بین ۰ تا ۱۰۰ باشد.

═══════════════════════════════════
═══════════════════════════════════
قوانین تشخیص هشدارها و تداخل‌های منطقی (Warnings):
═══════════════════════════════════
تو باید با هوشمندی کامل، تداخل‌های تنظیماتی، ناسازگاری‌های منطقی، خطاهای سئو یا مواردی که ممکن است ریسک مالی یا اشتباه مدیریتی داشته باشند را شناسایی کنی و آن‌ها را به صورت هشدارهای کاملاً واضح، دلسوزانه و راهنما به زبان فارسی در آرایه "warnings" قرار دهی.
مثال‌هایی از تداخل‌های منطقی در محصولات:
۱. قیمت تخفیف‌خورده (discountPrice یا specialPrice) بزرگتر یا مساوی قیمت اصلی (price) باشد.
۲. قیمت محصول برابر با ۰ یا عددی بسیار ناچیز (مثلاً زیر ۱۰۰۰ تومان) تنظیم شده باشد (که ممکن است اشتباه تایپی باشد و محصول را رایگان کند).
۳. موجودی محصول (stock) برابر ۰ تنظیم شده باشد که باعث ناموجود شدن محصول در سایت می‌شود.
۴. تاریخ انقضای تخفیف ویژه (specialEndsAt) در گذشته باشد.
۵. عنوان محصول خیلی کوتاه باشد (کمتر از ۵ کاراکتر) یا توضیحات محصول خالی باشد (هشدار سئو).
۶. قیمت یا موجودی تنوع‌ها (variants) با قیمت یا موجودی اصلی محصول تفاوت فاحش داشته باشد (مثلاً قیمت اصلی ۱ میلیون تومان ولی قیمت تنوع ۱۰۰ تومان باشد).
۷. قیمت پایه عمده‌فروشی (wholesalePrice) بزرگتر از قیمت تک‌فروشی (price) باشد یا قیمت تک‌فروشی خالی یا صفر باشد.
۸. قیمت پایه عمده‌فروشی (wholesalePrice) بزرگتر از قیمت هر یک از تنوع‌ها (variants) باشد.
۹. حداقل مقدار سفارش عمده (moq) یا تعداد در واحد عمده (wholesaleUnitSize) کمتر از ۱ باشد.

تو باید این هشدارها را به عنوان یک مشاور دلسوز و متخصص سئو و مدیریت فروشگاه بنویسی تا مدیر فروشگاه از اشتباهات احتمالی مصون بماند.

═══════════════════════════════════
قوانین حیاتی خروجی (بسیار مهم برای سرعت پردازش):
═══════════════════════════════════
- برای دستیابی به سرعت پاسخ‌دهی آنی (زیر ۱ ثانیه) و بهینه‌سازی شدید توکن‌ها، تو فقط و فقط باید فیلدها و کلیدهایی از "formData" را بازگردانی که در این درخواست تغییر کرده یا مقدار جدید گرفته‌اند. از تکرار فیلدهای بدون تغییر، به خصوص فیلدهای متنی بسیار طولانی نظیر description و fullDescription یا فیلدهای تصویری نظیر imageUrl خودداری کن. این فیلدها در پشت صحنه با مقادیر قبلی ادغام خواهند شد.
- همچنین برای آرایه‌ها (featuresList، specsList، galleryUrls، variants، faqItems)، تنها در صورتی آن‌ها را در خروجی JSON قرار بده که طبق دستور کاربر تغییری (حذف، اضافه یا ویرایش) روی آن‌ها اعمال شده باشد. اگر آرایه‌ای بدون تغییر باقی مانده است، اصلاً آن را در شیء خروجی قرار نده (کلید مربوطه را ارسال نکن). در صورت اعمال تغییر، کل آرایه تغییریافته را برگردان.
- در فیلد "explanation" به زبان فارسی، خیلی محترمانه، شیوا و دقیق توضیح بده که چه تغییراتی روی کدام بخش‌ها اعمال شده است (مثلاً: "قیمت محصول با موفقیت ۲۰٪ افزایش یافت و از ۱۰۰,۰۰۰ تومان به ۱۲۰,۰۰۰ تومان تغییر کرد. موجودی نیز ۱,۰۰۰ عدد افزایش یافت.").
- خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل، بعد یا در توضیحات مارک‌داون) بازنگردانی:

{
  "success": true,
  "explanation": "توضیحات فارسی از تغییرات اعمال شده...",
  "warnings": [
    "هشدار ۱: ...",
    "هشدار ۲: ..."
  ], // در صورت وجود تداخل یا هشدار منطقی، موارد را اینجا بنویس. اگر هشداری نیست، این آرایه را خالی بگذار یا ارسال نکن.
  "formData": {
    // فقط کلیدهای تغییریافته را اینجا قرار بده. مثلاً:
    // "price": "120000"
  },
  // این آرایه‌ها را فقط در صورت تغییر در خروجی قرار بده؛ در غیر این صورت کلید آن‌ها را کاملاً حذف کن:
  "featuresList": [
    { "key": "...", "value": "..." }
  ],
  "specsList": [
    { "key": "...", "value": "..." }
  ],
  "galleryUrls": [
    "..."
  ],
  "variants": [
    { "id": "...", "name": "...", "colorCode": "...", "imageUrl": "...", "price": "...", "stock": "..." }
  ],
  "faqItems": [
    { "question": "...", "answer": "..." }
  ]
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
    const { prompt, formData, featuresList, specsList, galleryUrls, variants, faqItems } = body;

    const basicValidation = validateAiRequest(prompt ?? '');
    if (!basicValidation.valid) {
      return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
    }

    // 1. Fetch active package, AI settings, and categories in parallel to reduce DB latency
    const [shop, settings, categories] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        include: { package: true },
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      }),
      prisma.category.findMany({
        where: { shopId },
        select: { id: true, name: true, slug: true }
      })
    ]);

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = settingsMap.get('openrouter_control_model') || settingsMap.get('openrouter_model') || 'google/gemini-2.5-flash';

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled: settingsMap.get('ai_enabled') !== 'false',
      hasApiKey: !!apiKey,
    });
    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    const isComplex = prompt.length > 200 || /تحلیل|مقایسه|پیشنهاد|گزارش/.test(prompt);
    const aiModel = await getAiModel(isComplex ? 'complex' : 'simple', shopId);
    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder',
    };

    // Fetch RAG context if it's a product query
    const isProductQuery = /محصول|کالا|موجودی|قیمت/.test(prompt);
    let productContext = '';
    if (isProductQuery) {
      try {
        const relevant = await searchProducts({
          shopId,
          query: prompt,
          maxResults: 8,
          isWholesaler: false,
          includeWholesaleData: shop?.wholesaleEnabled,
          adminMode: true,
        });
        productContext = formatProductsForContext(relevant, false);
      } catch (error) {
        console.error('[ai-control] RAG search failed:', error);
      }
    }

    const wholesaleSchemaFa = shop?.wholesaleEnabled ? `
=== فیلدهای فروش عمده B2B ===
wholesalePrice = قیمت پایه همکار (باید کمتر از price باشد)
wholesaleTiers = تخفیف پله‌ای: [{minQty, maxQty, discountPercent}]
wholesaleExclusivePrices = قیمت اختصاصی: [{target, price}] (target = userId یا email یا groupName)
moq = حداقل تعداد سفارش (عدد صحیح مثبت)
wholesaleUnit = واحد سفارش (عدد / کارتن / پالت)
wholesaleUnitSize = تعداد در هر واحد (مثلاً ۲۴ برای کارتن)
isWholesaleOnly = true اگر فقط عمده باشد، false اگر ترکیبی
قانون: wholesalePrice هرگز از price بیشتر نشود
` : '';

    const baseSystemPrompt = `${SYSTEM_PROMPT}
${wholesaleSchemaFa}
${productContext ? `\n=== محصولات مرتبط ===\n${productContext}` : ''}`;

    // 2. Prepare Prompt to OpenRouter (Pruned to save maximum input tokens!)
    const inputState = {
      formData,
      featuresList: featuresList || [],
      specsList: specsList || [],
      galleryUrls: galleryUrls || [],
      variants: variants || [],
      faqItems: faqItems || [],
    };

    const prunedInputState = pruneInputState(prompt, inputState);

    const categoriesContext = categories.length > 0
      ? `دسته‌بندی‌های موجود در فروشگاه (برای انتساب به محصول):\n${categories.map(c => `- نام: "${c.name}"، شناسه: "${c.id}"`).join('\n')}`
      : 'هیچ دسته‌بندی در فروشگاه تعریف نشده است.';

    const dynamicContext = `وضعیت فعلی محصول برای اعمال تغییرات:\n${JSON.stringify(prunedInputState, null, 2)}\n\n${categoriesContext}`;
    const userPrompt = `دستور کاربر: "${prompt}"`;

    let parsedResult: AiProductControlResponse | null = null;
    let parseWarnings: string[] = [];
    let lastError: any = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let currentModel = aiModel;
        let currentTemperature = 0.7;
        let currentMaxTokens = 3000; // Increased from 1500 to prevent truncation

        if (attempt === 2) {
          currentTemperature = 0.0;
          currentMaxTokens = 4000;
        } else if (attempt === 3) {
          currentModel = await getAiModel('fallback', shopId);
          currentTemperature = 0.0;
          currentMaxTokens = 4000;
        }

        const { gregorianDate, jalaliDate, time } = getIranDateTime();
        const currentSystemPrompt = baseSystemPrompt.replace(
          "__TODAY_DATE__",
          `- امروز: ${gregorianDate} (${jalaliDate}) - ساعت فعلی ایران: ${time}`
        );

        console.log(`[AI-PRODUCT] Generation attempt ${attempt}/${maxAttempts} using model: ${currentModel}`);

        const openRouterResponse = await openRouterFetch(apiUrl, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            model: currentModel,
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
            temperature: currentTemperature,
            max_tokens: currentMaxTokens,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          let errorMessage = `OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson?.error?.message) {
              errorMessage = errorJson.error.message;
            }
          } catch (e) {}
          throw new Error(errorMessage);
        }

        const responseData = await openRouterResponse.json();

        if (responseData.error) {
          const errMsg = typeof responseData.error === 'string' 
            ? responseData.error 
            : (responseData.error.message || JSON.stringify(responseData.error));
          throw new Error(`OpenRouter Error: ${errMsg}`);
        }

        let aiText = responseData.choices?.[0]?.message?.content;

        if (!aiText) {
          throw new Error('No content returned from AI model');
        }

        const { data, warnings } = parseAiJson<AiProductControlResponse>(
          aiText,
          ['success'],
          { success: false, explanation: 'پاسخ AI ناقص بود.', formData: {} }
        );

        if (data && (data.success === true || (data.success === false && data.explanation))) {
          parsedResult = data;
          parseWarnings = warnings;
          
          if (attempt > 1) {
            console.log(`[AI-PRODUCT] Successfully recovered product generation on attempt ${attempt}!`);
          }
          break; // Exit retry loop on success
        } else {
          throw new Error(data?.explanation || 'پاسخ دریافتی نامعتبر بود.');
        }
      } catch (err: any) {
        console.error(`[AI-PRODUCT] Attempt ${attempt} failed:`, err.message || err);
        lastError = err;

        if (attempt < maxAttempts) {
          const delay = attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!parsedResult) {
      let friendlyMessage = `کنترل هوشمند پس از چند بار تلاش ناموفق بود: ${lastError?.message || 'خطای ناشناخته'}`;
      if (lastError?.message?.includes('rate-limited') || lastError?.message?.includes('429')) {
        friendlyMessage = 'سرعت درخواست‌های شما بیش از حد مجاز است یا مدل انتخابی موقتاً با ترافیک بالا مواجه شده است. لطفاً چند لحظه دیگر دوباره تلاش کنید.';
      } else if (lastError?.message?.includes('API key')) {
        friendlyMessage = 'کلید API هوش مصنوعی نامعتبر یا منقضی شده است. لطفاً تنظیمات سیستم را بررسی کنید.';
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 502 });
    }

    // 4. Merge the original data to make sure we return a complete response back to the frontend, 
    // but the AI only had to generate a tiny fraction of it (the changes)!
    if (parsedResult.success) {
      if (!parsedResult.formData) {
        parsedResult.formData = {};
      }

      // Resolve image queries if they are keywords
      const pexelsApiKeySetting = await prisma.systemSetting.findUnique({
        where: { key: 'pexels_api_key' },
      });
      const pexelsApiKey = pexelsApiKeySetting?.value || '';

      const isUrlOrFilePath = (url: string) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return (
          lower.startsWith('http://') || 
          lower.startsWith('https://') || 
          lower.startsWith('/') || 
          lower.startsWith('\\') ||
          lower.endsWith('.jpg') || 
          lower.endsWith('.jpeg') || 
          lower.endsWith('.png') || 
          lower.endsWith('.webp') || 
          lower.endsWith('.gif') || 
          lower.endsWith('.svg')
        );
      };

      // Fetch shop settings to get the theme color for branding influence
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId },
      });

      if (parsedResult.formData.imageUrl && typeof parsedResult.formData.imageUrl === 'string' && !isUrlOrFilePath(parsedResult.formData.imageUrl)) {
        const query = parsedResult.formData.imageUrl;
        const searchedUrl = await searchPexelsImage(query, pexelsApiKey);
        if (searchedUrl) {
          parsedResult.formData.imageUrl = searchedUrl;
        } else {
          // If no image is found via Pexels, generate a minimal SVG placeholder
          const { generateMinimalImage } = require('@/lib/minimal-image');
          parsedResult.formData.imageUrl = generateMinimalImage(parsedResult.formData.title || 'محصول جدید', 'product', undefined, shopSettings?.themeColor || undefined);
        }
      } else if (!parsedResult.formData.imageUrl && parsedResult.formData.title) {
        // Generate minimal placeholder if imageUrl is completely missing
        const { generateMinimalImage } = require('@/lib/minimal-image');
        parsedResult.formData.imageUrl = generateMinimalImage(parsedResult.formData.title, 'product', undefined, shopSettings?.themeColor || undefined);
      }

      if (parsedResult.galleryUrls && Array.isArray(parsedResult.galleryUrls)) {
        const resolvedUrls: string[] = [];
        for (let i = 0; i < parsedResult.galleryUrls.length; i++) {
          const url = parsedResult.galleryUrls[i];
          if (url && typeof url === 'string') {
            if (isUrlOrFilePath(url)) {
              resolvedUrls.push(url);
            } else {
              const searchedUrl = await searchPexelsImage(url, pexelsApiKey);
              if (searchedUrl) {
                resolvedUrls.push(searchedUrl);
              }
            }
          }
        }
        parsedResult.galleryUrls = resolvedUrls;
      }

      if (parsedResult.variants && Array.isArray(parsedResult.variants)) {
        for (let i = 0; i < parsedResult.variants.length; i++) {
          const v: any = parsedResult.variants[i];
          if (v && v.imageUrl && typeof v.imageUrl === 'string' && !isUrlOrFilePath(v.imageUrl)) {
            const searchedUrl = await searchPexelsImage(v.imageUrl, pexelsApiKey);
            if (searchedUrl) {
              v.imageUrl = searchedUrl;
            } else {
              v.imageUrl = null;
            }
          }
        }
      }

      parsedResult.formData = { ...formData, ...parsedResult.formData };
      
      if (parsedResult.featuresList === undefined) {
        parsedResult.featuresList = featuresList || [];
      }
      if (parsedResult.specsList === undefined) {
        parsedResult.specsList = specsList || [];
      }
      if (parsedResult.galleryUrls === undefined) {
        parsedResult.galleryUrls = galleryUrls || [];
      }
      if (parsedResult.variants === undefined) {
        parsedResult.variants = variants || [];
      }
      if (parsedResult.faqItems === undefined) {
        parsedResult.faqItems = faqItems || [];
      }
    }

    const outputIssues = validators.product(parsedResult as any);
    parsedResult.warnings = [...parseWarnings, ...outputIssues];
    
    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error('Error in AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
