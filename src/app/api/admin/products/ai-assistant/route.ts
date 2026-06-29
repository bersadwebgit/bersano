import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import { getAiModel } from '@/lib/ai-model-resolver';
import { unlink } from 'fs/promises';
import { Invalidate } from '@/lib/invalidate';
import path from 'path';
import sharp from 'sharp';

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

function getRelevantProductsForAssistant(prompt: string, allProducts: any[]) {
  const normalized = prompt.toLowerCase();

  // If prompt is very short or is a general wildcard like "همه محصولات", "لیست", "کل محصولات", return everything but capped to 30 to avoid token blowup
  if (normalized.includes('همه محصولات') || normalized.includes('کل محصولات') || normalized.includes('تمام محصولات') || allProducts.length <= 15) {
    return allProducts.slice(0, 30);
  }

  const filtered = new Set<any>();

  // 1. Check for physical/digital
  const isPhysicalReq = normalized.includes('فیزیکی') || normalized.includes('physical');
  const isDigitalReq = normalized.includes('دیجیتال') || normalized.includes('digital');
  
  // 2. Check for inactive/active
  const isInactiveReq = normalized.includes('غیرفعال') || normalized.includes('غیر فعال');
  const isActiveReq = normalized.includes('فعال') && !isInactiveReq;

  // 3. Check for zero stock
  const isZeroStockReq = normalized.includes('موجودی صفر') || normalized.includes('ناموجود') || normalized.includes('بدون موجودی');

  // 4. Check for special/discounted
  const isSpecialReq = normalized.includes('شگفت انگیز') || normalized.includes('شگفت‌انگیز') || normalized.includes('تخفیف') || normalized.includes('ویژه');

  // 5. Check for new products
  const isNewReq = normalized.includes('جدید') || normalized.includes('آخرین');

  // 6. Check for untitled products
  const isUntitledReq = normalized.includes('بدون اسم') || normalized.includes('بدون نام') || normalized.includes('بدون عنوان') || normalized.includes('untitled');

  // Extract search terms (words) from the prompt
  // Remove common Persian and English stop words
  const stopWords = new Set([
    'را', 'به', 'در', 'از', 'با', 'رو', 'تا', 'بر', 'برای', 'روی', 'که', 'و', 'یک', 'این', 'آن',
    'کن', 'کنید', 'بده', 'بزن', 'شو', 'شود', 'باشه', 'باشد', 'کردن', 'همه', 'تمام', 'لیست',
    'محصول', 'محصولات', 'کالا', 'کالاها', 'قیمت', 'موجودی', 'تومان', 'ریال', 'درصد', 'تخفیف',
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'by'
  ]);

  const words = normalized
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !stopWords.has(w));

  for (const prod of allProducts) {
    let matched = false;

    if (isPhysicalReq && prod.type === 'physical') matched = true;
    if (isDigitalReq && prod.type === 'digital') matched = true;
    if (isInactiveReq && prod.isActive === false) matched = true;
    if (isActiveReq && prod.isActive === true) matched = true;
    if (isZeroStockReq && prod.stock === 0) matched = true;
    if (isSpecialReq && prod.isSpecial === true) matched = true;
    if (isUntitledReq) {
      const titleLower = (prod.title || '').toLowerCase();
      if (titleLower === '' || titleLower.includes('بدون عنوان') || titleLower.includes('بدون نام') || titleLower.includes('untitled')) {
        matched = true;
      }
    }

    // Check match with words in title, ID or category
    if (!matched && words.length > 0) {
      const title = prod.title.toLowerCase();
      const catName = (prod.category?.name || '').toLowerCase();
      const id = prod.id.toLowerCase();
      
      for (const word of words) {
        if (title.includes(word) || catName.includes(word) || id.includes(word)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      filtered.add(prod);
    }
  }

  // If we filtered some, return them (up to 30)
  if (filtered.size > 0) {
    return Array.from(filtered).slice(0, 30);
  }

  // If nothing matched, but it's asking for new products, return 15 newest
  if (isNewReq) {
    return allProducts.slice(0, 15);
  }

  // Fallback: return the first 25 products to keep context sane
  return allProducts.slice(0, 25);
}

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده پیشرفته برای مدیریت هوشمند محصولات در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که لیست محصولات موجود در فروشگاه را به همراه دستور (پرامپت) کاربر و اطلاعات مربوط به محصولات انتخابی (تیک‌خورده) دریافت کنی، سناریوی عملیات (تک‌محصولی یا دسته‌ای/Bulk) را تشخیص دهی و تغییرات درخواستی کاربر را (شامل ویرایش فیلدها و یا پردازش تصویر محصول) تحلیل و استخراج کنی.

═══════════════════════════════════
قوانین تشخیص محصولات هدف (بسیار مهم):
═══════════════════════════════════
تو باید آرایه‌ای از شناسه‌های محصولات هدف را تحت کلید "targetProductIds" در خروجی قرار دهی.

۱. اگر کاربر محصولات خاصی را تیک زده بود (hasSelectedProducts: true):
   تو فقط محصولات تیک‌خورده را در ورودی می‌بینی. باید شناسه‌های تمام این محصولات را در آرایه "targetProductIds" قرار دهی و "isBulk" را true بگذاری.

۲. اگر کاربر محصولی را تیک نزده بود ولی دستور دسته‌ای/جمعی داد:
   مثال‌ها: "همه محصولات فیزیکی"، "همه محصولات دیجیتال"، "محصولات دسته لپ‌تاپ"، "محصولات غیرفعال"، "محصولات با موجودی صفر"، "محصولات جدید" و غیره.
   در این حالت، تو باید در لیست محصولات ارسالی بگردی، تمام محصولاتی که با این فیلترها مطابقت دارند را پیدا کنی و شناسه‌های آن‌ها را در آرایه "targetProductIds" قرار دهی. فیلد "isBulk" را حتماً true بگذار.
   - برای "محصولات فیزیکی": محصولاتی که type آن‌ها "physical" است.
   - برای "محصولات دیجیتال": محصولاتی که type آن‌ها "digital" است.
   - برای "محصولات دسته X": محصولاتی که category.name آن‌ها شامل X یا معادل آن است.
   - برای "محصولات غیرفعال": محصولاتی که isActive آن‌ها false است.
   - برای "محصولات با موجودی صفر": محصولاتی که stock آن‌ها 0 است.
   - برای "محصولات جدید": چند محصول اول لیست بر اساس تاریخ createdAt.

۳. اگر کاربر دستور تک‌محصولی داد (مثلاً "قیمت کفش نایک را..."):
   محصول هدف را پیدا کن، شناسه آن را در "targetProductIds" (به عنوان تک‌عضو) و همچنین در "productId" قرار بده و "isBulk" را false بگذار.

۴. اگر کاربر درخواست حذف یا پاک کردن محصول یا محصولاتی را داد (مثلاً "محصولات بدون اسم حذف کن" یا "کالای X را پاک کن"):
   تو باید محصولات هدف برای حذف را شناسایی کرده و شناسه‌های آن‌ها را در آرایه "targetProductIds" قرار دهی. فیلد "delete" را در ریشه خروجی JSON برابر با true قرار دهی. در این حالت نیازی به پر کردن فیلدهای fieldUpdates یا imageUpdates نیست.

═══════════════════════════════════
ساختار فیلدهای محاسباتی در حالت دسته‌ای (isBulk: true):
═══════════════════════════════════
- priceAction: یکی از مقادیر "multiply" (ضرب قیمت فعلی در یک عدد، مثلاً برای ۲۰٪ افزایش عدد 1.2)، "add" (جمع یا تفریق یک مقدار ثابت به تومان)، "set" (تنظیم قیمت مستقیم روی یک عدد) یا "none".
- priceValue: مقدار عددی مربوط به عملیات قیمت.
- stockAction: یکی از مقادیر "add" (اضافه یا کم کردن موجودی)، "set" (تنظیم مستقیم موجودی) یا "none".
- stockValue: مقدار عددی مربوط به عملیات موجودی.
- isActive: true یا false برای فعال/غیرفعال کردن همگی، یا null در صورت عدم تغییر.
- isSpecial: true یا false برای شگفت‌انگیز کردن همگی، یا null در صورت عدم تغییر.
- specialEndsAt: تاریخ انقضا به فرمت "YYYY-MM-DD" یا null.
- seoTitle: عنوان سئو محصول (رشته متنی) یا null در صورت عدم تغییر. می‌توانید از متغیرهای پویا مانند {title}، {brand}، {color}، {price} و {shopName} استفاده کنید.
- seoDescription: توضیحات سئو محصول (رشته متنی) یا null در صورت عدم تغییر. می‌توانید از متغیرهای پویا مانند {title}، {brand}، {color}، {price} و {shopName} استفاده کنید.

=== فیلدهای فروش عمده B2B (همکاری) ===
- wholesalePriceAction: یکی از مقادیر "multiply" (ضرب قیمت عمده فعلی در یک عدد)، "add" (جمع یا تفریق یک مقدار ثابت به تومان به قیمت عمده)، "set" (تنظیم قیمت عمده مستقیم روی یک عدد به تومان) یا "none".
- wholesalePriceValue: مقدار عددی مربوط به عملیات قیمت عمده.
- moqAction: یکی از مقادیر "add" (اضافه یا کم کردن MOQ)، "set" (تنظیم مستقیم MOQ) یا "none".
- moqValue: مقدار عددی مربوط به عملیات MOQ.
- isWholesaleOnly: true اگر فقط عمده باشد، false اگر ترکیبی، یا null در صورت عدم تغییر.
- wholesaleUnit: واحد سفارش عمده (مانند "عدد"، "کارتن"، "پالت") یا null در صورت عدم تغییر.
- wholesaleUnitSize: تعداد کالا در هر واحد عمده (مثلاً ۲۴ برای کارتن) یا null در صورت عدم تغییر.

در حالت تک‌محصولی (isBulk: false)، کاربر می‌تواند فیلدهای زیر را مستقیماً ویرایش کند:
- wholesalePrice: قیمت پایه عمده‌فروشی به تومان (باید کمتر از price باشد).
- moq: حداقل تعداد سفارش (عدد صحیح مثبت).
- wholesaleUnit: واحد سفارش عمده (عدد / کارتن / پالت).
- wholesaleUnitSize: تعداد کالا در هر واحد عمده.
- isWholesaleOnly: true یا false.
- wholesaleTiers: تخفیف پله‌ای به صورت آرایه‌ای از اشیاء: [{"minQty": number, "maxQty": number | null, "discountPercent": number}]
- wholesaleExclusivePrices: قیمت اختصاصی همکاران به صورت آرایه‌ای از اشیاء: [{"target": string, "price": number}]

═══════════════════════════════════
پردازش تصویر محصول (imageUpdates):
═══════════════════════════════════
اگر کاربر خواست تصویر محصول(ها) را ویرایش کند (مثلاً حذف پس‌زمینه، تغییر رنگ بک‌گراند، افزودن واتر‌مارک):
- حذف پس‌زمینه (removeBg): اگر کاربر گفت "زمینه حذف بشه" یا "بک‌گراند حذف بشه" یا "بدون بک‌گراند"، مقدار removeBg را true کن.
- رنگ پس‌زمینه (bgColor): اگر کاربر رنگ خاصی برای زمینه خواست، کد هگز مناسب آن را قرار بده.
  * بسیار مهم: اگر کاربر گفت "زمینه سبز" یا "بک‌گراند سبز"، یک رنگ سبز ملایم، پاستلی و بسیار حرفه‌ای برای محصول انتخاب کن (مانند "#d4edda" یا "#e8f5e9" یا "#e2f0d9") تا ظاهر محصول خراب نشود. هرگز از سبز فسفری تند استفاده نکن.
- واتر‌مارک (watermarkType): مقادیر مجاز "none" (بدون واتر‌مارک)، "text" (متنی)، "logo" (لوگوی فروشگاه).
  * اگر کاربر گفت "+ واترمارک" یا "واترمارک اضافه بشه"، نوع را "text" قرار بده.
  * متن واتر‌مارک (watermarkText): اگر کاربر متن خاصی نگفت، مقدار آن را خالی بگذار تا سیستم به صورت خودکار نام فروشگاه را به عنوان واتر‌مارک قرار دهد.
  * شفافیت واتر‌مارک (watermarkOpacity): عددی بین 0.1 تا 0.5. پیش‌فرض 0.25 است.
  * موقعیت واتر‌مارک (watermarkPosition): "center" (وسط)، "bottom-left"، "top-right"، "top-left". پیش‌فرض "center" است.
- جایگزینی تصویر اصلی (replaceOriginal): همیشه مقدار true قرار بده.

خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل، بعد یا در توضیحات مارک‌داون) بازنگردانی:

{
  "success": true,
  "isBulk": true/false,
  "delete": true/false,
  "productId": "شناسه محصول در حالت تک‌محصولی (در حالت دسته‌ای خالی بگذار یا ارسال نکن)",
  "targetProductIds": ["id1", "id2", ...],
  "explanation": "توضیحات فارسی روان و محترمانه از تغییراتی که قرار است اعمال شود...",
  "fieldUpdates": {
    "priceAction": "multiply/add/set/none",
    "priceValue": 1.2,
    "stockAction": "add/set/none",
    "stockValue": 10,
    "isActive": true/false/null,
    "isSpecial": true/false/null,
    "specialEndsAt": "YYYY-MM-DD",
    "seoTitle": "عنوان سئو یا null",
    "seoDescription": "توضیحات سئو یا null",
    "wholesalePriceAction": "multiply/add/set/none",
    "wholesalePriceValue": 1.1,
    "moqAction": "add/set/none",
    "moqValue": 5,
    "isWholesaleOnly": true/false/null,
    "wholesaleUnit": "واحد سفارش عمده",
    "wholesaleUnitSize": 12,
    "wholesalePrice": 120000,
    "moq": 20,
    "wholesaleTiers": "JSON string of tiers (e.g. '[{\"minQty\":50,\"maxQty\":100,\"discountPercent\":10}]')",
    "wholesaleExclusivePrices": "JSON string of exclusive prices (e.g. '[{\"target\":\"VIP\",\"price\":110000}]')"
  },
  "imageUpdates": {
    "removeBg": true/false,
    "bgColor": "#hex_code",
    "watermarkType": "none/text/logo",
    "watermarkText": "متن واتر‌مارک",
    "watermarkOpacity": 0.25,
    "watermarkPosition": "center",
    "replaceOriginal": true
  }
}
`;

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { prompt, selectedProductIds, preview, execute, rawResult } = body;

    if (!prompt && !rawResult) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    const hasSelectedProducts = Array.isArray(selectedProductIds) && selectedProductIds.length > 0;

    // 1. Fetch products with optimized database-level filtering (if not manually selected)
    let products = [];
    if (hasSelectedProducts) {
      products = await prisma.product.findMany({
        where: { shopId, id: { in: selectedProductIds } },
        select: {
          id: true,
          title: true,
          price: true,
          stock: true,
          isActive: true,
          imageUrl: true,
          isSpecial: true,
          type: true,
          category: {
            select: {
              name: true,
            }
          },
          createdAt: true,
        },
      });
    } else {
      // Parse prompt to construct a smart database filter
      const stopWords = new Set([
        'را', 'به', 'در', 'از', 'با', 'رو', 'تا', 'بر', 'برای', 'روی', 'که', 'و', 'یک', 'این', 'آن',
        'کن', 'کنید', 'بده', 'بزن', 'شو', 'شود', 'باشه', 'باشد', 'کردن', 'همه', 'تمام', 'لیست',
        'محصول', 'محصولات', 'کالا', 'کالاها', 'قیمت', 'موجودی', 'تومان', 'ریال', 'درصد', 'تخفیف',
        'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'by'
      ]);

      const normalized = prompt ? prompt.toLowerCase() : '';
      const isPhysicalReq = normalized.includes('فیزیکی') || normalized.includes('physical');
      const isDigitalReq = normalized.includes('دیجیتال') || normalized.includes('digital');
      const isInactiveReq = normalized.includes('غیرفعال') || normalized.includes('غیر فعال');
      const isActiveReq = normalized.includes('فعال') && !isInactiveReq;
      const isZeroStockReq = normalized.includes('موجودی صفر') || normalized.includes('ناموجود') || normalized.includes('بدون موجودی');
      const isSpecialReq = normalized.includes('شگفت انگیز') || normalized.includes('شگفت‌انگیز') || normalized.includes('تخفیف') || normalized.includes('ویژه');
      const isUntitledReq = normalized.includes('بدون اسم') || normalized.includes('بدون نام') || normalized.includes('بدون عنوان') || normalized.includes('untitled');

      const words = normalized
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?]/g, ' ')
        .split(/\s+/)
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 1 && !stopWords.has(w));

      const isAllProductsReq = normalized.includes('همه') || normalized.includes('کل') || normalized.includes('تمام');
      const whereClause: any = { shopId };

      if (isPhysicalReq) whereClause.type = 'physical';
      if (isDigitalReq) whereClause.type = 'digital';
      if (isInactiveReq) whereClause.isActive = false;
      else if (isActiveReq) whereClause.isActive = true;
      if (isZeroStockReq) whereClause.stock = 0;
      if (isSpecialReq) whereClause.isSpecial = true;

      const whereClauseWithKeywords = { ...whereClause };
      if (isUntitledReq) {
        whereClauseWithKeywords.OR = [
          { title: '' },
          { title: { contains: 'بدون عنوان', mode: 'insensitive' } },
          { title: { contains: 'بدون نام', mode: 'insensitive' } },
          { title: { contains: 'untitled', mode: 'insensitive' } }
        ];
      } else if (words.length > 0) {
        whereClauseWithKeywords.OR = [
          ...words.map((word: string) => ({ title: { contains: word, mode: 'insensitive' } })),
          ...words.map((word: string) => ({ category: { name: { contains: word, mode: 'insensitive' } } }))
        ];
      }

      // Fetch at most 100 products to keep processing fast and light
      products = await prisma.product.findMany({
        where: whereClauseWithKeywords,
        select: {
          id: true,
          title: true,
          price: true,
          stock: true,
          isActive: true,
          imageUrl: true,
          isSpecial: true,
          type: true,
          category: {
            select: {
              name: true,
            }
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Fallback: If keyword search returned nothing, fetch the latest 50 products matching basic criteria
      if (products.length === 0 && whereClauseWithKeywords.OR) {
        products = await prisma.product.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            price: true,
            stock: true,
            isActive: true,
            imageUrl: true,
            isSpecial: true,
            type: true,
            category: {
              select: {
                name: true,
              }
            },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      }
    }

    if (products.length === 0) {
      return NextResponse.json({ error: 'هیچ محصولی یافت نشد.' }, { status: 400 });
    }

    let parsedResult: any = null;

    // If we are executing a pre-approved preview, we bypass OpenRouter!
    if (execute && rawResult) {
      parsedResult = rawResult;
    } else {
      // 2. Fetch all AI provider settings in a single parallel query
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
          }
        }
      });

      const settingsMap = new Map(settings.map(s => [s.key, s.value]));

      if (settingsMap.get('ai_enabled') === 'false') {
        return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر توسط مدیر سیستم غیرفعال شده است.' }, { status: 503 });
      }

      const apiKey = settingsMap.get('openrouter_api_key') || '';
      const openrouterModel = await getAiModel('simple', shopId);

      const aiModel = openrouterModel;
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder Product Assistant',
        'Connection': 'close',
      };

      if (!apiKey) {
        return NextResponse.json({ error: 'سرویس هوش مصنوعی دستیار هوشمند در حال حاضر پیکربندی نشده است. لطفاً به پشتیبانی سیستم اطلاع دهید.' }, { status: 503 });
      }

      // Get relevant products (filtered if not manually selected, and stripped of bulky fields to save tokens)
      const relevantRawProducts = hasSelectedProducts 
        ? products 
        : getRelevantProductsForAssistant(prompt, products);

      const lightProducts = relevantRawProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        type: p.type,
        category: p.category?.name || undefined,
        isSpecial: p.isSpecial,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : undefined,
      }));

      const userMessageContent = `
دستور کاربر: "${prompt}"
وضعیت عملیات: ${hasSelectedProducts ? `عملیات دسته‌ای روی ${selectedProductIds.length} محصول انتخابی` : 'عملیات تک‌محصولی یا دسته‌ای کلی (نیاز به فیلتر و شناسایی محصولات هدف)'}

لیست محصولات موجود در این درخواست:
${JSON.stringify(lightProducts, null, 2)}
`;

      // 3. Request to AI service with Retry Logic
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: any = null;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const openRouterResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: apiHeaders,
            keepalive: false,
            body: JSON.stringify({
              model: aiModel,
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
              temperature: 0.1,
              max_tokens: 1500, // Optimized to prevent runaway generation
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

          const aiText = responseData.choices?.[0]?.message?.content;

          if (!aiText) {
            throw new Error('No content returned from AI model');
          }

          parsedResult = cleanAndParseJson(aiText);
          break; // Successfully completed and parsed!
        } catch (err: any) {
          console.error(`Attempt ${attempts} failed for AI Assistant:`, err);
          lastError = err;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!parsedResult) {
        let friendlyMessage = `دستیار هوشمند پس از چند بار تلاش ناموفق بود: ${lastError?.message || 'خطای ناشناخته'}`;
        if (lastError?.message?.includes('rate-limited') || lastError?.message?.includes('429')) {
          friendlyMessage = 'سرعت درخواست‌های شما بیش از حد مجاز است یا مدل انتخابی موقتاً با ترافیک بالا مواجه شده است. لطفاً چند لحظه دیگر دوباره تلاش کنید.';
        } else if (lastError?.message?.includes('API key')) {
          friendlyMessage = 'کلید API هوش مصنوعی نامعتبر یا منقضی شده است. لطفاً تنظیمات سیستم را بررسی کنید.';
        }
        return NextResponse.json({ error: friendlyMessage }, { status: 502 });
      }
    }

    if (!parsedResult || !parsedResult.success) {
      return NextResponse.json({
        success: false,
        explanation: parsedResult?.explanation || 'دستور نامفهوم بود یا خطایی رخ داد.',
      });
    }

    // 4. Determine target products to update
    let targetProducts: any[] = [];
    
    if (parsedResult.targetProductIds && Array.isArray(parsedResult.targetProductIds) && parsedResult.targetProductIds.length > 0) {
      // Primary source of truth: exact products identified by the AI!
      targetProducts = await prisma.product.findMany({
        where: { shopId, id: { in: parsedResult.targetProductIds } },
        select: {
          id: true,
          title: true,
          price: true,
          stock: true,
          isActive: true,
          imageUrl: true,
          isSpecial: true,
        },
      });
    } else if (parsedResult.isBulk) {
      if (hasSelectedProducts) {
        targetProducts = products;
      } else {
        // Fallback: If bulk but no selection, target ALL products in the shop!
        targetProducts = await prisma.product.findMany({
          where: { shopId },
          select: {
            id: true,
            title: true,
            price: true,
            stock: true,
            isActive: true,
            imageUrl: true,
            isSpecial: true,
          },
        });
      }
    } else if (parsedResult.productId) {
      const singleProd = await prisma.product.findFirst({
        where: { id: parsedResult.productId, shopId },
      });
      if (singleProd && singleProd.shopId === shopId) {
        targetProducts = [singleProd];
      }
    } else if (!hasSelectedProducts && products.length === 1) {
      targetProducts = products;
    }

    if (targetProducts.length === 0) {
      return NextResponse.json({
        success: false,
        explanation: 'محصول هدف برای اعمال تغییرات یافت نشد. لطفاً شناسه یا نام کالا را دقیق‌تر بنویسید یا محصولات را تیک بزنید.',
      });
    }

    const isBulkOp = parsedResult.isBulk;
    const fieldUpdates = parsedResult.fieldUpdates || {};
    const imageUpdates = parsedResult.imageUpdates;

    // PREVIEW MODE: Calculate and return proposed changes without saving to DB!
    if (preview) {
      const previewTargets = [];
      const isDeleteOp = !!parsedResult.delete;
      for (const prod of targetProducts) {
        let finalFields: any = {};

        if (!isDeleteOp) {
          if (isBulkOp) {
            if (fieldUpdates.priceAction === 'multiply' && fieldUpdates.priceValue !== undefined && fieldUpdates.priceValue !== null) {
              finalFields.price = Math.round(prod.price * Number(fieldUpdates.priceValue));
            } else if (fieldUpdates.priceAction === 'add' && fieldUpdates.priceValue !== undefined && fieldUpdates.priceValue !== null) {
              finalFields.price = Math.max(0, prod.price + Number(fieldUpdates.priceValue));
            } else if (fieldUpdates.priceAction === 'set' && fieldUpdates.priceValue !== undefined && fieldUpdates.priceValue !== null) {
              finalFields.price = Number(fieldUpdates.priceValue);
            }

            if (fieldUpdates.stockAction === 'add' && fieldUpdates.stockValue !== undefined && fieldUpdates.stockValue !== null) {
              finalFields.stock = Math.max(0, prod.stock + Number(fieldUpdates.stockValue));
            } else if (fieldUpdates.stockAction === 'set' && fieldUpdates.stockValue !== undefined && fieldUpdates.stockValue !== null) {
              finalFields.stock = Number(fieldUpdates.stockValue);
            }

            if (fieldUpdates.isActive !== undefined && fieldUpdates.isActive !== null) {
              finalFields.isActive = !!fieldUpdates.isActive;
            }
            if (fieldUpdates.isSpecial !== undefined && fieldUpdates.isSpecial !== null) {
              finalFields.isSpecial = !!fieldUpdates.isSpecial;
            }
            if (fieldUpdates.specialEndsAt !== undefined && fieldUpdates.specialEndsAt !== null) {
              finalFields.specialEndsAt = new Date(fieldUpdates.specialEndsAt);
            }
            if (fieldUpdates.seoTitle !== undefined && fieldUpdates.seoTitle !== null) {
              finalFields.seoTitle = String(fieldUpdates.seoTitle);
            }
            if (fieldUpdates.seoDescription !== undefined && fieldUpdates.seoDescription !== null) {
              finalFields.seoDescription = String(fieldUpdates.seoDescription);
            }

            // Bulk Wholesale
            if (fieldUpdates.wholesalePriceAction === 'multiply' && fieldUpdates.wholesalePriceValue !== undefined && fieldUpdates.wholesalePriceValue !== null) {
              finalFields.wholesalePrice = Math.round((prod.wholesalePrice || prod.price * 0.8) * Number(fieldUpdates.wholesalePriceValue));
            } else if (fieldUpdates.wholesalePriceAction === 'add' && fieldUpdates.wholesalePriceValue !== undefined && fieldUpdates.wholesalePriceValue !== null) {
              finalFields.wholesalePrice = Math.max(0, (prod.wholesalePrice || prod.price * 0.8) + Number(fieldUpdates.wholesalePriceValue));
            } else if (fieldUpdates.wholesalePriceAction === 'set' && fieldUpdates.wholesalePriceValue !== undefined && fieldUpdates.wholesalePriceValue !== null) {
              finalFields.wholesalePrice = Number(fieldUpdates.wholesalePriceValue);
            }

            if (fieldUpdates.moqAction === 'add' && fieldUpdates.moqValue !== undefined && fieldUpdates.moqValue !== null) {
              finalFields.moq = Math.max(1, (prod.moq || 1) + Number(fieldUpdates.moqValue));
            } else if (fieldUpdates.moqAction === 'set' && fieldUpdates.moqValue !== undefined && fieldUpdates.moqValue !== null) {
              finalFields.moq = Number(fieldUpdates.moqValue);
            }

            if (fieldUpdates.isWholesaleOnly !== undefined && fieldUpdates.isWholesaleOnly !== null) {
              finalFields.isWholesaleOnly = !!fieldUpdates.isWholesaleOnly;
            }
            if (fieldUpdates.wholesaleUnit !== undefined && fieldUpdates.wholesaleUnit !== null) {
              finalFields.wholesaleUnit = String(fieldUpdates.wholesaleUnit);
            }
            if (fieldUpdates.wholesaleUnitSize !== undefined && fieldUpdates.wholesaleUnitSize !== null) {
              finalFields.wholesaleUnitSize = Number(fieldUpdates.wholesaleUnitSize);
            }
          } else {
            if (fieldUpdates.price !== undefined) finalFields.price = Number(fieldUpdates.price);
            if (fieldUpdates.stock !== undefined) finalFields.stock = Number(fieldUpdates.stock);
            if (fieldUpdates.isActive !== undefined) finalFields.isActive = !!fieldUpdates.isActive;
            if (fieldUpdates.isSpecial !== undefined) finalFields.isSpecial = !!fieldUpdates.isSpecial;
            if (fieldUpdates.specialEndsAt !== undefined) finalFields.specialEndsAt = new Date(fieldUpdates.specialEndsAt);
            if (fieldUpdates.title !== undefined) finalFields.title = String(fieldUpdates.title);
            if (fieldUpdates.seoTitle !== undefined) finalFields.seoTitle = String(fieldUpdates.seoTitle);
            if (fieldUpdates.seoDescription !== undefined) finalFields.seoDescription = String(fieldUpdates.seoDescription);

            // Single Wholesale
            if (fieldUpdates.wholesalePrice !== undefined) finalFields.wholesalePrice = fieldUpdates.wholesalePrice === null ? null : Number(fieldUpdates.wholesalePrice);
            if (fieldUpdates.moq !== undefined) finalFields.moq = Number(fieldUpdates.moq);
            if (fieldUpdates.wholesaleUnit !== undefined) finalFields.wholesaleUnit = String(fieldUpdates.wholesaleUnit);
            if (fieldUpdates.wholesaleUnitSize !== undefined) finalFields.wholesaleUnitSize = Number(fieldUpdates.wholesaleUnitSize);
            if (fieldUpdates.isWholesaleOnly !== undefined) finalFields.isWholesaleOnly = !!fieldUpdates.isWholesaleOnly;
            if (fieldUpdates.wholesaleTiers !== undefined) {
              finalFields.wholesaleTiers = typeof fieldUpdates.wholesaleTiers === 'string' ? fieldUpdates.wholesaleTiers : JSON.stringify(fieldUpdates.wholesaleTiers);
            }
            if (fieldUpdates.wholesaleExclusivePrices !== undefined) {
              finalFields.wholesaleExclusivePrices = typeof fieldUpdates.wholesaleExclusivePrices === 'string' ? fieldUpdates.wholesaleExclusivePrices : JSON.stringify(fieldUpdates.wholesaleExclusivePrices);
            }
          }
        }

        previewTargets.push({
          id: prod.id,
          title: prod.title,
          imageUrl: prod.imageUrl,
          currentPrice: prod.price,
          proposedPrice: finalFields.price !== undefined ? finalFields.price : prod.price,
          currentStock: prod.stock,
          proposedStock: finalFields.stock !== undefined ? finalFields.stock : prod.stock,
          currentIsActive: prod.isActive,
          proposedIsActive: finalFields.isActive !== undefined ? finalFields.isActive : prod.isActive,
          proposedIsDeleted: isDeleteOp,
          imageUpdates: !isDeleteOp && imageUpdates && (imageUpdates.removeBg || imageUpdates.bgColor || imageUpdates.watermarkType !== 'none') ? imageUpdates : null,
          // Wholesale fields
          currentWholesalePrice: prod.wholesalePrice,
          proposedWholesalePrice: finalFields.wholesalePrice !== undefined ? finalFields.wholesalePrice : prod.wholesalePrice,
          currentMoq: prod.moq,
          proposedMoq: finalFields.moq !== undefined ? finalFields.moq : prod.moq,
          currentIsWholesaleOnly: prod.isWholesaleOnly,
          proposedIsWholesaleOnly: finalFields.isWholesaleOnly !== undefined ? finalFields.isWholesaleOnly : prod.isWholesaleOnly,
        });
      }

      return NextResponse.json({
        success: true,
        preview: true,
        isBulk: isBulkOp,
        explanation: parsedResult.explanation,
        targets: previewTargets,
        rawResult: parsedResult,
      });
    }

    // EXECUTION MODE: Actually apply changes to database and process images in parallel!
    if (parsedResult.delete) {
      const deleteResults = await Promise.all(targetProducts.map(async (prod) => {
        try {
          // Check if product has order items (Restrict constraint)
          const orderItemCount = await prisma.orderItem.count({
            where: { productId: prod.id, shopId }
          });

          if (orderItemCount > 0) {
            // Cannot delete product because it has order items. Deactivate it instead!
            await prisma.product.update({
              where: { id: prod.id },
              data: { isActive: false },
              allowCrossTenant: true
            } as any);
            await Invalidate.product(shopId, prod.id);
            return { id: prod.id, title: prod.title, status: 'deactivated' };
          }

          // Safe to delete
          await prisma.product.delete({
            where: { id: prod.id, shopId },
          });

          await Invalidate.product(shopId, prod.id);
          return { id: prod.id, title: prod.title, status: 'deleted' };
        } catch (err) {
          console.error(`Error deleting product ${prod.id}:`, err);
          return { id: prod.id, title: prod.title, status: 'failed' };
        }
      }));

      const deletedCount = deleteResults.filter(r => r.status === 'deleted').length;
      const deactivatedCount = deleteResults.filter(r => r.status === 'deactivated').length;
      const failedCount = deleteResults.filter(r => r.status === 'failed').length;

      let finalExplanation = `✅ عملیات حذف با موفقیت انجام شد.\n` +
        `- تعداد ${deletedCount} محصول به طور کامل حذف شدند.\n`;
      
      if (deactivatedCount > 0) {
        finalExplanation += `- تعداد ${deactivatedCount} محصول به دلیل وجود در سفارش‌های ثبت‌شده قبلی، غیرفعال شدند (قابل حذف نیستند).\n`;
      }
      if (failedCount > 0) {
        finalExplanation += `- حذف ${failedCount} محصول با خطا مواجه شد.\n`;
      }

      return NextResponse.json({
        success: true,
        explanation: finalExplanation,
      });
    }

    const removeBg = !!imageUpdates?.removeBg;

    // Fetch settings and shop settings in parallel
    const [poofApiKeySetting, shop] = await Promise.all([
      removeBg ? prisma.systemSetting.findUnique({ where: { key: 'poof_api_key' } }) : Promise.resolve(null),
      prisma.shopSettings.findUnique({
        where: { shopId },
        include: { package: true },
      })
    ]);

    const poofApiKey = poofApiKeySetting?.value || '';
    const shopName = shop?.shopName || 'فروشگاه ما';

    let bgRemovalAllowed = true;
    let bgRemovalLimitError = '';
    if (removeBg && shop) {
      const isPackageActive = shop.packageExpiresAt ? new Date(shop.packageExpiresAt) > new Date() : false;
      const activePackage = isPackageActive ? shop.package : null;
      let packageFeatures: any = {};
      if (activePackage) {
        try {
          packageFeatures = JSON.parse(activePackage.features);
        } catch (e) {}
      }

      if (!packageFeatures.bgRemovalEnabled) {
        bgRemovalAllowed = false;
        bgRemovalLimitError = 'قابلیت حذف پس‌زمینه در پکیج فعلی شما فعال نیست.';
      } else {
        const bgRemovalLimit = parseInt(packageFeatures.bgRemovalLimit) || 0;
        const bgRemovalCount = shop.bgRemovalCount || 0;
        if (bgRemovalLimit > 0 && bgRemovalCount + targetProducts.length > bgRemovalLimit) {
          bgRemovalAllowed = false;
          bgRemovalLimitError = `سهمیه حذف پس‌زمینه پکیج شما کافی نیست. سهمیه باقی‌مانده: ${bgRemovalLimit - bgRemovalCount} عدد.`;
        }
      }
    }

    // Process all products and their images in parallel for maximum speed!
    const processResults = await Promise.all(targetProducts.map(async (prod) => {
      try {
        let finalFields: any = {};

        if (isBulkOp) {
          if (fieldUpdates.priceAction === 'multiply' && fieldUpdates.priceValue !== undefined && fieldUpdates.priceValue !== null) {
            finalFields.price = Math.round(prod.price * Number(fieldUpdates.priceValue));
          } else if (fieldUpdates.priceAction === 'add' && fieldUpdates.priceValue !== undefined && fieldUpdates.priceValue !== null) {
            finalFields.price = Math.max(0, prod.price + Number(fieldUpdates.priceValue));
          } else if (fieldUpdates.priceAction === 'set' && fieldUpdates.priceValue !== undefined && fieldUpdates.priceValue !== null) {
            finalFields.price = Number(fieldUpdates.priceValue);
          }

          if (fieldUpdates.stockAction === 'add' && fieldUpdates.stockValue !== undefined && fieldUpdates.stockValue !== null) {
            finalFields.stock = Math.max(0, prod.stock + Number(fieldUpdates.stockValue));
          } else if (fieldUpdates.stockAction === 'set' && fieldUpdates.stockValue !== undefined && fieldUpdates.stockValue !== null) {
            finalFields.stock = Number(fieldUpdates.stockValue);
          }

          if (fieldUpdates.isActive !== undefined && fieldUpdates.isActive !== null) {
            finalFields.isActive = !!fieldUpdates.isActive;
          }
          if (fieldUpdates.isSpecial !== undefined && fieldUpdates.isSpecial !== null) {
            finalFields.isSpecial = !!fieldUpdates.isSpecial;
          }
          if (fieldUpdates.specialEndsAt !== undefined && fieldUpdates.specialEndsAt !== null) {
            finalFields.specialEndsAt = new Date(fieldUpdates.specialEndsAt);
          }
          if (fieldUpdates.seoTitle !== undefined && fieldUpdates.seoTitle !== null) {
            finalFields.seoTitle = String(fieldUpdates.seoTitle);
          }
          if (fieldUpdates.seoDescription !== undefined && fieldUpdates.seoDescription !== null) {
            finalFields.seoDescription = String(fieldUpdates.seoDescription);
          }

          // Bulk Wholesale
          if (fieldUpdates.wholesalePriceAction === 'multiply' && fieldUpdates.wholesalePriceValue !== undefined && fieldUpdates.wholesalePriceValue !== null) {
            finalFields.wholesalePrice = Math.round((prod.wholesalePrice || prod.price * 0.8) * Number(fieldUpdates.wholesalePriceValue));
          } else if (fieldUpdates.wholesalePriceAction === 'add' && fieldUpdates.wholesalePriceValue !== undefined && fieldUpdates.wholesalePriceValue !== null) {
            finalFields.wholesalePrice = Math.max(0, (prod.wholesalePrice || prod.price * 0.8) + Number(fieldUpdates.wholesalePriceValue));
          } else if (fieldUpdates.wholesalePriceAction === 'set' && fieldUpdates.wholesalePriceValue !== undefined && fieldUpdates.wholesalePriceValue !== null) {
            finalFields.wholesalePrice = Number(fieldUpdates.wholesalePriceValue);
          }

          if (fieldUpdates.moqAction === 'add' && fieldUpdates.moqValue !== undefined && fieldUpdates.moqValue !== null) {
            finalFields.moq = Math.max(1, (prod.moq || 1) + Number(fieldUpdates.moqValue));
          } else if (fieldUpdates.moqAction === 'set' && fieldUpdates.moqValue !== undefined && fieldUpdates.moqValue !== null) {
            finalFields.moq = Number(fieldUpdates.moqValue);
          }

          if (fieldUpdates.isWholesaleOnly !== undefined && fieldUpdates.isWholesaleOnly !== null) {
            finalFields.isWholesaleOnly = !!fieldUpdates.isWholesaleOnly;
          }
          if (fieldUpdates.wholesaleUnit !== undefined && fieldUpdates.wholesaleUnit !== null) {
            finalFields.wholesaleUnit = String(fieldUpdates.wholesaleUnit);
          }
          if (fieldUpdates.wholesaleUnitSize !== undefined && fieldUpdates.wholesaleUnitSize !== null) {
            finalFields.wholesaleUnitSize = Number(fieldUpdates.wholesaleUnitSize);
          }
        } else {
          if (fieldUpdates.price !== undefined) finalFields.price = Number(fieldUpdates.price);
          if (fieldUpdates.stock !== undefined) finalFields.stock = Number(fieldUpdates.stock);
          if (fieldUpdates.isActive !== undefined) finalFields.isActive = !!fieldUpdates.isActive;
          if (fieldUpdates.isSpecial !== undefined) finalFields.isSpecial = !!fieldUpdates.isSpecial;
          if (fieldUpdates.specialEndsAt !== undefined) finalFields.specialEndsAt = new Date(fieldUpdates.specialEndsAt);
          if (fieldUpdates.title !== undefined) finalFields.title = String(fieldUpdates.title);
          if (fieldUpdates.seoTitle !== undefined) finalFields.seoTitle = String(fieldUpdates.seoTitle);
          if (fieldUpdates.seoDescription !== undefined) finalFields.seoDescription = String(fieldUpdates.seoDescription);

          // Single Wholesale
          if (fieldUpdates.wholesalePrice !== undefined) finalFields.wholesalePrice = fieldUpdates.wholesalePrice === null ? null : Number(fieldUpdates.wholesalePrice);
          if (fieldUpdates.moq !== undefined) finalFields.moq = Number(fieldUpdates.moq);
          if (fieldUpdates.wholesaleUnit !== undefined) finalFields.wholesaleUnit = String(fieldUpdates.wholesaleUnit);
          if (fieldUpdates.wholesaleUnitSize !== undefined) finalFields.wholesaleUnitSize = Number(fieldUpdates.wholesaleUnitSize);
          if (fieldUpdates.isWholesaleOnly !== undefined) finalFields.isWholesaleOnly = !!fieldUpdates.isWholesaleOnly;
          if (fieldUpdates.wholesaleTiers !== undefined) {
            finalFields.wholesaleTiers = typeof fieldUpdates.wholesaleTiers === 'string' ? fieldUpdates.wholesaleTiers : JSON.stringify(fieldUpdates.wholesaleTiers);
          }
          if (fieldUpdates.wholesaleExclusivePrices !== undefined) {
            finalFields.wholesaleExclusivePrices = typeof fieldUpdates.wholesaleExclusivePrices === 'string' ? fieldUpdates.wholesaleExclusivePrices : JSON.stringify(fieldUpdates.wholesaleExclusivePrices);
          }
        }

        let updatedProd = prod;
        let isUpdated = false;
        if (Object.keys(finalFields).length > 0) {
          updatedProd = await prisma.product.update({
            where: { id: prod.id },
            data: finalFields,
            allowCrossTenant: true
          } as any);
          isUpdated = true;
        }

        let isImageProcessed = false;
        if (imageUpdates && prod.imageUrl && (removeBg || imageUpdates.bgColor || imageUpdates.watermarkType !== 'none')) {
          const filename = path.basename(prod.imageUrl);
          const localFilePath = path.join(process.cwd(), 'public', 'uploads', filename);

          try {
            await fs.access(localFilePath);
            let inputBuffer = await fs.readFile(localFilePath);

            let bgRemovedSuccessfully = false;
            if (removeBg && bgRemovalAllowed && poofApiKey) {
              const formData = new FormData();
              const fileBlob = new Blob([inputBuffer], { type: 'image/png' });
              formData.append('image_file', fileBlob, filename);
              formData.append('crop', 'true');

              const poofResponse = await fetch('https://api.poof.bg/v1/remove', {
                method: 'POST',
                headers: { 'x-api-key': poofApiKey },
                body: formData,
              });

              if (poofResponse.ok) {
                const poofArrayBuffer = await poofResponse.arrayBuffer();
                inputBuffer = Buffer.from(poofArrayBuffer);
                bgRemovedSuccessfully = true;

                await prisma.shopSettings.update({
                  where: { shopId },
                  data: { bgRemovalCount: { increment: 1 } },
                });
              }
            }

            let subjectSharp = sharp(inputBuffer);
            if (!bgRemovedSuccessfully) {
              try {
                subjectSharp = subjectSharp.trim();
              } catch (e) {
                subjectSharp = sharp(inputBuffer);
              }
            }

            const subjectBuffer = await subjectSharp.toBuffer();
            const subjectMeta = await sharp(subjectBuffer).metadata();
            const sWidth = subjectMeta.width || 1;
            const sHeight = subjectMeta.height || 1;

            const targetWidth = 1000;
            const targetHeight = 1000;

            const maxCanvasDim = Math.max(targetWidth, targetHeight);
            const subjectScale = 80;
            const targetSubjectDim = maxCanvasDim * (subjectScale / 100);
            const scaleFactor = targetSubjectDim / Math.max(sWidth, sHeight);

            const resizedSWidth = Math.round(sWidth * scaleFactor);
            const resizedSHeight = Math.round(sHeight * scaleFactor);

            const resizedSubjectBuffer = await sharp(subjectBuffer)
              .resize(resizedSWidth, resizedSHeight, { fit: 'fill' })
              .toBuffer();

            const hexBg = imageUpdates.bgColor && imageUpdates.bgColor.startsWith('#') ? imageUpdates.bgColor : '#ffffff';
            const canvasSharp = sharp({
              create: {
                width: targetWidth,
                height: targetHeight,
                channels: 3,
                background: hexBg,
              }
            });

            const composites = [];
            const leftPos = Math.round((targetWidth - resizedSWidth) / 2);
            const topPos = Math.round((targetHeight - resizedSHeight) / 2);
            composites.push({
              input: resizedSubjectBuffer,
              left: leftPos,
              top: topPos,
            });

            const watermarkType = imageUpdates.watermarkType || 'none';
            let watermarkText = imageUpdates.watermarkText || '';
            const watermarkOpacity = imageUpdates.watermarkOpacity || 0.25;
            const watermarkPosition = imageUpdates.watermarkPosition || 'center';

            if (watermarkType === 'text') {
              if (!watermarkText) watermarkText = shopName;
              const fontSize = Math.round(targetWidth * 0.035);
              let textSvg = '';
              if (watermarkPosition === 'center') {
                textSvg = `
                  <svg width="${targetWidth}" height="${targetHeight}">
                    <text x="50%" y="50%" fill="gray" fill-opacity="${watermarkOpacity}" font-family="sans-serif, Tahoma" font-size="${fontSize * 1.5}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30, ${targetWidth / 2}, ${targetHeight / 2})">${watermarkText}</text>
                  </svg>
                `;
              } else {
                let xVal = '85%';
                let yVal = '90%';
                let anchor = 'end';

                if (watermarkPosition === 'bottom-left') {
                  xVal = '15%';
                  yVal = '90%';
                  anchor = 'start';
                } else if (watermarkPosition === 'top-right') {
                  xVal = '85%';
                  yVal = '10%';
                  anchor = 'end';
                } else if (watermarkPosition === 'top-left') {
                  xVal = '15%';
                  yVal = '10%';
                  anchor = 'start';
                }

                textSvg = `
                  <svg width="${targetWidth}" height="${targetHeight}">
                    <text x="${xVal}" y="${yVal}" fill="gray" fill-opacity="${watermarkOpacity}" font-family="sans-serif, Tahoma" font-size="${fontSize}" font-weight="bold" text-anchor="${anchor}">${watermarkText}</text>
                  </svg>
                `;
              }

              composites.push({
                input: Buffer.from(textSvg),
                left: 0,
                top: 0,
              });
            }

            const finalBuffer = await canvasSharp
              .composite(composites)
              .webp({ quality: 85 })
              .toBuffer();

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const resultFilename = `${uniqueSuffix}-ai-processed.webp`;
            const resultFilePath = path.join(process.cwd(), 'public', 'uploads', resultFilename);

            await fs.writeFile(resultFilePath, finalBuffer);
            const newImageUrl = `/uploads/${resultFilename}`;

            if (imageUpdates.replaceOriginal && prod.imageUrl) {
              try {
                const oldFilename = prod.imageUrl.split('/').pop();
                if (oldFilename) {
                  const oldFilepath = path.join(process.cwd(), 'public', 'uploads', oldFilename);
                  await unlink(oldFilepath);
                }
              } catch (e) {}
            }

            await prisma.product.update({
              where: { id: prod.id },
              data: { imageUrl: newImageUrl },
              allowCrossTenant: true
            } as any);

            const originalNameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
            await prisma.media.create({
              data: {
                shopId,
                url: newImageUrl,
                type: 'image',
                name: `${originalNameWithoutExt}-هوشمند.webp`,
                alt: `${updatedProd.title} پردازش‌شده هوشمند`,
                size: finalBuffer.length,
                originalId: null,
                originalUrl: prod.imageUrl,
              },
            });

            isImageProcessed = true;
          } catch (err) {
            console.error(`Error processing image for product ${prod.id}:`, err);
          }
        }

        return { isUpdated, isImageProcessed };
      } catch (err) {
        console.error(`Error updating product ${prod.id}:`, err);
        return { isUpdated: false, isImageProcessed: false };
      }
    }));

    // Aggregate counts
    const updatedCount = processResults.filter(r => r.isUpdated).length;
    const imagesProcessedCount = processResults.filter(r => r.isImageProcessed).length;

    let finalExplanation = parsedResult.explanation;
    if (isBulkOp) {
      finalExplanation = `✅ عملیات دسته‌ای روی ${targetProducts.length} محصول با موفقیت اعمال شد.\n` +
        `- تعداد ${updatedCount} محصول بروزرسانی شدند.\n` +
        (imagesProcessedCount > 0 ? `- تعداد ${imagesProcessedCount} تصویر محصول پردازش و جایگزین شدند.\n` : '') +
        (!bgRemovalAllowed && removeBg ? `⚠️ هشدار حذف پس‌زمینه: ${bgRemovalLimitError}\n` : '') +
        `\nجزئیات تغییرات: ${parsedResult.explanation}`;
    } else {
      if (imagesProcessedCount > 0) {
        finalExplanation += ' (تصویر محصول نیز با موفقیت پردازش و جایگزین شد)';
      }
    }

    return NextResponse.json({
      success: true,
      explanation: finalExplanation,
    });

  } catch (error) {
    console.error('Error in AI Assistant API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
