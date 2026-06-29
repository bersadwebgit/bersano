import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getColorHexFromName } from '@/lib/colors';

// Robust CSV Parser (RFC 4180 compliant)
function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  let cleanText = csvText;
  if (cleanText.startsWith('\uFEFF')) {
    cleanText = cleanText.substring(1);
  }

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue);
      currentValue = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentValue);
      result.push(row);
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (currentValue || row.length > 0) {
    row.push(currentValue);
    result.push(row);
  }

  return result.filter(r => r.length > 0 && r.some(cell => cell.trim() !== ''));
}

// Convert Persian/Arabic digits to English
function toEnglishDigits(str: string): string {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let clean = str;
  for (let i = 0; i < 10; i++) {
    clean = clean.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return clean;
}

function parseNumber(val: any, defaultValue: number = 0): number {
  if (val === undefined || val === null) return defaultValue;
  let str = String(val).trim();
  if (!str) return defaultValue;
  str = toEnglishDigits(str).replace(/,/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseBoolean(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes' || str === 'فعال' || str === 'بله';
}

// Helper to chunk text
function chunkText(text: string, maxCharLength: number = 4000): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > maxCharLength) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + line : line;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  return chunks;
}

// Helper to chunk array
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

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

// Flexible header mapping for standard CSV
const FLEXIBLE_HEADER_MAP: Record<string, string> = {
  // Title / Name
  'title': 'title',
  'name': 'title',
  'عنوان': 'title',
  'نام': 'title',
  'نام محصول': 'title',
  
  // Price
  'price': 'price',
  'price_toman': 'price',
  'price_rial': 'price',
  'قیمت': 'price',
  'قیمت به تومان': 'price',
  'قیمت (تومان)': 'price',
  'قیمت تومان': 'price',
  
  // Discount
  'discount': 'discount',
  'تخفیف': 'discount',
  'درصد تخفیف': 'discount',
  
  // Category
  'category': 'categoryName',
  'category_name': 'categoryName',
  'categoryid': 'categoryId',
  'category_id': 'categoryId',
  'دسته‌بندی': 'categoryName',
  'دسته بندی': 'categoryName',
  'دسته': 'categoryName',
  'شناسه دسته‌بندی': 'categoryId',
  
  // Image
  'image': 'imageUrl',
  'image_url': 'imageUrl',
  'imageurl': 'imageUrl',
  'تصویر': 'imageUrl',
  'آدرس تصویر': 'imageUrl',
  'عکس': 'imageUrl',
  
  // Stock
  'stock': 'stock',
  'inventory': 'stock',
  'موجودی': 'stock',
  'تعداد': 'stock',
  
  // Brand
  'brand': 'brand',
  'برند': 'brand',
  
  // Description
  'description': 'description',
  'desc': 'description',
  'توضیحات': 'description',
  'توضیحات کوتاه': 'description',
  
  // Full Description
  'fulldescription': 'fullDescription',
  'full_description': 'fullDescription',
  'توضیحات کامل': 'fullDescription',
  
  // Variants
  'variant': 'variants',
  'variants': 'variants',
  'تنوع': 'variants',
  'تنوع‌ها': 'variants',
  'رنگ': 'variants',
  'سایز': 'variants'
};

const AI_IMPORT_SYSTEM_PROMPT = `تو یک متخصص مهاجرت داده‌ها و معمار ارشد پایگاه داده هستی.
وظیفه تو این است که داده‌های ورودی را (که ممکن است ساختاریافته، نیمه‌ساختاریافته یا کاملاً نامرتب و متنی باشند) آنالیز کنی و اطلاعات محصولات و دسته‌بندی‌ها را استخراج و به ساختار استاندارد زیر تبدیل کنی.

قوانین استخراج:
۱. برای هر محصول، فیلدهای زیر را استخراج یا تولید کن:
   - title: عنوان دقیق محصول (رشته، الزامی)
   - brand: برند محصول (رشته، اختیاری)
   - description: توضیحات کوتاه محصول (رشته، اختیاری)
   - fullDescription: توضیحات کامل یا ویژگی‌های تفصیلی محصول (رشته، اختیاری)
   - price: قیمت محصول به صورت عدد انگلیسی بدون کاما (عدد، الزامی. اگر قیمت یافت نشد، مقدار 0 قرار بده)
   - discount: تخفیف محصول به صورت درصد یا مبلغ (عدد، اختیاری)
   - imageUrl: آدرس تصویر اصلی محصول (رشته، اختیاری)
   - galleryUrls: آرایه‌ای از آدرس‌های تصاویر گالری محصول (آرایه رشته، اختیاری)
   - stock: موجودی محصول (عدد، اختیاری، پیش‌فرض 10)
   - type: نوع محصول ("physical" یا "digital"، پیش‌فرض "physical")
   - categoryName: نام دسته‌بندی که این محصول باید در آن قرار گیرد (رشته، اختیاری. مثلاً "لپ‌تاپ"، "کفش ورزشی"). خودت بر اساس عنوان و توضیحات محصول، بهترین دسته‌بندی را تشخیص بده یا بساز.
   - specs: مشخصات فنی محصول به صورت آرایه‌ای از اشیاء با کلیدهای key و value (اختیاری)
   - features: ویژگی‌های کلیدی محصول به صورت آرایه‌ای از اشیاء با کلیدهای key و value (اختیاری)
   - variants: تنوع‌های محصول (مانند رنگ، سایز و غیره) به صورت آرایه‌ای از اشیاء با مشخصات: name (نام تنوع، الزامی)، price (قیمت تنوع، عدد)، stock (موجودی تنوع، عدد)، colorCode (کد هگز رنگ، اختیاری)، imageUrl (آدرس تصویر تنوع، اختیاری)

۲. دسته‌بندی‌ها:
   اگر در داده‌ها دسته‌بندی‌های مستقلی وجود دارد، آن‌ها را نیز استخراج کن. هر دسته‌بندی باید شامل فیلدهای زیر باشد:
   - name: نام دسته‌بندی (رشته، الزامی)
   - slug: اسلاگ یا نام انگلیسی برای آدرس (رشته، اختیاری)
   - description: توضیحات دسته‌بندی (رشته، اختیاری)
   - parentName: نام دسته‌بندی والد در صورت وجود (رشته، اختیاری)

خروجی شما باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متن اضافی قبل یا بعد از آن ارسال نکنید (از نوشتن توضیحات اضافی یا قرار دادن مارک‌داون خودداری کنید، فقط جیسان خام برگردانید):

{
  "products": [
    {
      "title": "...",
      "brand": "...",
      "description": "...",
      "fullDescription": "...",
      "price": 1250000,
      "discount": 0,
      "imageUrl": "...",
      "galleryUrls": ["...", "..."],
      "stock": 15,
      "type": "physical",
      "categoryName": "...",
      "specs": [{"key": "...", "value": "..."}],
      "features": [{"key": "...", "value": "..."}],
      "variants": [{"name": "...", "price": 1250000, "stock": 5, "colorCode": "..."}]
    }
  ],
  "categories": [
    {
      "name": "...",
      "slug": "...",
      "description": "...",
      "parentName": "..."
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawText = formData.get('rawText') as string || '';
    const method = formData.get('method') as string || 'standard'; // standard, ai
    const type = formData.get('type') as string || 'products'; // products, categories, settings, full
    const format = formData.get('format') as string || 'json'; // json, csv

    let contentToProcess = '';
    let filename = '';

    if (file) {
      contentToProcess = await file.text();
      filename = file.name;
    } else if (rawText) {
      contentToProcess = rawText;
    } else {
      return NextResponse.json({ error: 'لطفاً یک فایل آپلود کنید یا متن خام وارد کنید.' }, { status: 400 });
    }

    const products: any[] = [];
    const categories: any[] = [];

    // --- AI METHOD PREVIEW ---
    if (method === 'ai') {
      const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
        where: { key: 'openrouter_api_key' },
      });
      const openrouterModelSetting = await prisma.systemSetting.findUnique({
        where: { key: 'openrouter_model' },
      });

      const openrouterApiKey = openrouterApiKeySetting?.value;
      const openrouterModel = openrouterModelSetting?.value || 'google/gemini-2.5-flash';

      if (!openrouterApiKey) {
        return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر پیکربندی نشده است. لطفاً به پشتیبانی سیستم اطلاع دهید.' }, { status: 503 });
      }

      let chunks: string[] = [];
      const isStructured = filename.endsWith('.json') || filename.endsWith('.csv');

      if (isStructured) {
        try {
          if (contentToProcess.trim().startsWith('[')) {
            const parsedArray = JSON.parse(contentToProcess);
            const itemChunks = chunkArray(parsedArray, 8);
            chunks = itemChunks.map(chunk => JSON.stringify(chunk, null, 2));
          } else {
            chunks = chunkText(contentToProcess, 3500);
          }
        } catch (e) {
          chunks = chunkText(contentToProcess, 3500);
        }
      } else {
        chunks = chunkText(contentToProcess, 3500);
      }

      let successCount = 0;
      let lastChunkError = '';

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterApiKey}`,
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'SaaS Shop Builder AI Import Preview',
            },
            body: JSON.stringify({
              model: openrouterModel,
              messages: [
                { role: 'system', content: AI_IMPORT_SYSTEM_PROMPT },
                { role: 'user', content: `داده‌های زیر را آنالیز و استخراج کن:\n\n${chunk}` }
              ],
              temperature: 0.2,
              max_tokens: 2500, // Explicitly set max_tokens to prevent OpenRouter from defaulting to 65535 tokens and blocking low-credit accounts
              response_format: { type: "json_object" }
            }),
          });

          if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            throw new Error(`OpenRouter API error (status ${openRouterResponse.status}): ${errorText}`);
          }

          const responseData = await openRouterResponse.json();
          const aiText = responseData.choices?.[0]?.message?.content;
          if (aiText) {
            const parsed = cleanAndParseJson(aiText);
            if (parsed.products && Array.isArray(parsed.products)) {
              products.push(...parsed.products);
            }
            if (parsed.categories && Array.isArray(parsed.categories)) {
              categories.push(...parsed.categories);
            }
            successCount++;
          }
        } catch (err: any) {
          console.error(`AI Preview Chunk ${i + 1} Error:`, err);
          lastChunkError = err.message || String(err);
        }
      }

      if (successCount === 0) {
        return NextResponse.json({ 
          error: `خطا در ارتباط با هوش مصنوعی. هیچکدام از بخش‌ها پردازش نشدند. آخرین خطا: ${lastChunkError}` 
        }, { status: 502 });
      }
    } 
    // --- STANDARD METHOD PREVIEW ---
    else {
      if (format === 'csv') {
        const rows = parseCSV(contentToProcess);
        if (rows.length < 2) {
          return NextResponse.json({ error: 'فایل CSV خالی است یا هدر ندارد.' }, { status: 400 });
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const colIndices: Record<string, number> = {};
        
        headers.forEach((header, index) => {
          const mappedKey = FLEXIBLE_HEADER_MAP[header];
          if (mappedKey) {
            colIndices[mappedKey] = index;
          }
        });

        if (type === 'products') {
          if (colIndices['title'] === undefined) {
            return NextResponse.json({ error: 'ستون عنوان (مانند title, name, عنوان, نام) در فایل پیدا نشد.' }, { status: 400 });
          }

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const getVal = (key: string) => {
              const idx = colIndices[key];
              return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
            };

            const title = getVal('title');
            if (!title) continue;

            let variants: any[] = [];
            const variantsStr = getVal('variants');
            
            // If there's a specific "variant" column and it's not a JSON, we can treat it as a single variant name
            if (variantsStr) {
              if (variantsStr.startsWith('[') || variantsStr.startsWith('{')) {
                try {
                  variants = JSON.parse(variantsStr);
                } catch (e) {}
              } else {
                // Single variant name
                variants = [{
                  name: variantsStr,
                  price: parseNumber(getVal('price'), 0),
                  stock: parseNumber(getVal('stock'), 10)
                }];
              }
            }

            products.push({
              id: getVal('id') || undefined,
              title,
              type: getVal('type') || 'physical',
              categoryId: getVal('categoryId') || null,
              categoryName: getVal('categoryName') || null,
              price: parseNumber(getVal('price'), 0),
              discount: parseNumber(getVal('discount'), 0),
              imageUrl: getVal('imageUrl') || null,
              stock: parseNumber(getVal('stock'), 10),
              description: getVal('description') || null,
              fullDescription: getVal('fullDescription') || null,
              brand: getVal('brand') || null,
              isActive: colIndices['isActive'] !== undefined ? parseBoolean(getVal('isActive')) : true,
              isSpecial: parseBoolean(getVal('isSpecial')),
              specialEndsAt: getVal('specialEndsAt') ? getVal('specialEndsAt') : null,
              faqs: getVal('faqs') || '[]',
              features: getVal('features') || '[]',
              specs: getVal('specs') || '[]',
              galleryUrls: getVal('galleryUrls') || '[]',
              fileUrl: getVal('fileUrl') || null,
              downloadLimit: getVal('downloadLimit') ? parseNumber(getVal('downloadLimit'), 0) : null,
              downloadExpiryDays: getVal('downloadExpiryDays') ? parseNumber(getVal('downloadExpiryDays'), 0) : null,
              downloadIpRestriction: parseBoolean(getVal('downloadIpRestriction')),
              fileFormat: getVal('fileFormat') || null,
              fileSize: getVal('fileSize') || null,
              previewUrl: getVal('previewUrl') || null,
              techSpecs: getVal('techSpecs') || null,
              downloadFiles: getVal('downloadFiles') || '[]',
              variants
            });
          }
        } else if (type === 'categories') {
          if (colIndices['title'] === undefined) { // category name mapped to 'title'
            return NextResponse.json({ error: 'ستون نام دسته‌بندی (category, name, نام دسته‌بندی) در فایل پیدا نشد.' }, { status: 400 });
          }

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const getVal = (key: string) => {
              const idx = colIndices[key];
              return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
            };

            const name = getVal('title'); // mapped from category name
            if (!name) continue;

            categories.push({
              id: getVal('id') || undefined,
              name,
              slug: getVal('slug') || name,
              description: getVal('description') || null,
              imageUrl: getVal('imageUrl') || null,
              parentId: getVal('parentId') || null,
              isActive: colIndices['isActive'] !== undefined ? parseBoolean(getVal('isActive')) : true
            });
          }
        }
      } else {
        // Standard JSON Preview
        try {
          const parsed = JSON.parse(contentToProcess);
          if (type === 'products') {
            const list = Array.isArray(parsed) ? parsed : [parsed];
            products.push(...list);
          } else if (type === 'categories') {
            const list = Array.isArray(parsed) ? parsed : [parsed];
            categories.push(...list);
          } else if (type === 'full') {
            if (parsed.products) products.push(...parsed.products);
            if (parsed.categories) categories.push(...parsed.categories);
          } else if (type === 'settings') {
            return NextResponse.json({
              success: true,
              isSettingsOnly: true,
              settings: parsed
            });
          }
        } catch (e) {
          return NextResponse.json({ error: 'فرمت فایل JSON نامعتبر است.' }, { status: 400 });
        }
      }
    }

    // Automatically populate colorCode for variants if missing
    for (const prod of products) {
      if (prod.variants && Array.isArray(prod.variants)) {
        for (const v of prod.variants) {
          if (v && v.name && !v.colorCode) {
            const detectedHex = getColorHexFromName(v.name);
            if (detectedHex) {
              v.colorCode = detectedHex;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      products,
      categories
    });

  } catch (error: any) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: 'خطا در آنالیز و پیش‌نمایش داده‌ها.', details: error.message }, { status: 500 });
  }
}
