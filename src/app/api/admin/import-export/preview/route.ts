import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getColorHexFromName } from '@/lib/colors';
import { callAiGateway } from '@/lib/ai-gateway';

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

function parseNumber(val: any, defaultValue: any = 0): any {
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

function toSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Sanitization & Tenant-Safety Helpers
function sanitizeProduct(item: any): any {
  if (!item || typeof item !== 'object') return null;

  const title = String(item.title || item.name || '').trim();
  if (!title) return null;

  let price = parseNumber(item.price, 0);
  if (price < 0) price = 0;

  let discount = parseNumber(item.discount, 0);
  if (discount < 0) discount = 0;

  let stock = item.type === 'digital' ? 999999 : parseNumber(item.stock, 10);
  if (stock < 0) stock = 0;

  let variants: any[] = [];
  if (item.variants && Array.isArray(item.variants)) {
    variants = item.variants.map((v: any) => {
      const vName = String(v.name || '').trim();
      if (!vName) return null;
      let vPrice = parseNumber(v.price, price);
      if (vPrice < 0) vPrice = price;
      let vStock = parseNumber(v.stock, 10);
      if (vStock < 0) vStock = 0;
      return {
        id: v.id || undefined,
        name: vName,
        price: vPrice,
        stock: vStock,
        colorCode: v.colorCode || getColorHexFromName(vName) || null,
        imageUrl: v.imageUrl || null,
        isDefault: v.isDefault !== undefined ? !!v.isDefault : false
      };
    }).filter(Boolean);
  }

  return {
    id: item.id || undefined,
    title,
    type: item.type === 'digital' ? 'digital' : 'physical',
    categoryId: item.categoryId || null,
    categoryName: item.categoryName ? String(item.categoryName).trim() : null,
    price,
    discount,
    discountMinQty: parseNumber(item.discountMinQty, 0),
    imageUrl: item.imageUrl || null,
    stock,
    description: item.description || null,
    fullDescription: item.fullDescription || null,
    brand: item.brand || null,
    isActive: item.isActive !== undefined ? parseBoolean(item.isActive) : true,
    isSpecial: parseBoolean(item.isSpecial),
    specialEndsAt: item.specialEndsAt || null,
    faqs: typeof item.faqs === 'string' ? item.faqs : JSON.stringify(item.faqs || []),
    features: typeof item.features === 'string' ? item.features : JSON.stringify(item.features || []),
    specs: typeof item.specs === 'string' ? item.specs : JSON.stringify(item.specs || []),
    galleryUrls: typeof item.galleryUrls === 'string' ? item.galleryUrls : JSON.stringify(item.galleryUrls || []),
    fileUrl: item.fileUrl || null,
    downloadLimit: item.downloadLimit !== undefined && item.downloadLimit !== null ? parseNumber(item.downloadLimit, null) : null,
    downloadExpiryDays: item.downloadExpiryDays !== undefined && item.downloadExpiryDays !== null ? parseNumber(item.downloadExpiryDays, null) : null,
    downloadIpRestriction: parseBoolean(item.downloadIpRestriction),
    fileFormat: item.fileFormat || null,
    fileSize: item.fileSize || null,
    previewUrl: item.previewUrl || null,
    techSpecs: item.techSpecs || null,
    downloadFiles: typeof item.downloadFiles === 'string' ? item.downloadFiles : JSON.stringify(item.downloadFiles || []),
    wholesalePrice: item.wholesalePrice !== undefined && item.wholesalePrice !== null ? parseNumber(item.wholesalePrice, null) : null,
    wholesaleTiers: typeof item.wholesaleTiers === 'string' ? item.wholesaleTiers : JSON.stringify(item.wholesaleTiers || []),
    wholesaleExclusivePrices: typeof item.wholesaleExclusivePrices === 'string' ? item.wholesaleExclusivePrices : JSON.stringify(item.wholesaleExclusivePrices || []),
    moq: parseNumber(item.moq, 1),
    wholesaleUnit: item.wholesaleUnit || 'عدد',
    wholesaleUnitSize: parseNumber(item.wholesaleUnitSize, 1),
    weight: parseNumber(item.weight, 0),
    volume: parseNumber(item.volume, 0),
    isWholesaleOnly: parseBoolean(item.isWholesaleOnly),
    isDemo: parseBoolean(item.isDemo),
    isSampleData: parseBoolean(item.isSampleData),
    generatedByAi: parseBoolean(item.generatedByAi),
    seedJobId: item.seedJobId || null,
    variants
  };
}

function sanitizeCategory(item: any): any {
  if (!item || typeof item !== 'object') return null;

  const name = String(item.name || item.title || '').trim();
  if (!name) return null;

  const slug = String(item.slug || toSlug(name)).trim();

  return {
    id: item.id || undefined,
    name,
    slug,
    description: item.description || null,
    imageUrl: item.imageUrl || null,
    icon: item.icon || null,
    parentId: item.parentId || null,
    isActive: item.isActive !== undefined ? parseBoolean(item.isActive) : true,
    isDemo: parseBoolean(item.isDemo),
    isSampleData: parseBoolean(item.isSampleData),
    generatedByAi: parseBoolean(item.generatedByAi),
    seedJobId: item.seedJobId || null
  };
}

function sanitizeSettings(item: any): any {
  if (!item || typeof item !== 'object') return null;
  
  const {
    id,
    shopId,
    subdomain,
    customDomain,
    isApproved,
    isActive,
    packageId,
    packageExpiresAt,
    bgRemovalCount,
    setupWizardCompleted,
    createdAt,
    updatedAt,
    aiMemory,
    ...safeSettings
  } = item;

  return safeSettings;
}

function sanitizeBrand(item: any): any {
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name || '').trim();
  if (!name) return null;
  return {
    name,
    logoUrl: item.logoUrl || null
  };
}

function sanitizeSlider(item: any): any {
  if (!item || typeof item !== 'object') return null;
  const imageUrl = String(item.imageUrl || '').trim();
  if (!imageUrl) return null;
  return {
    imageUrl,
    mobileImageUrl: item.mobileImageUrl || null,
    title: item.title || null,
    subtitle: item.subtitle || null,
    linkUrl: item.linkUrl || null,
    linkText: item.linkText || null,
    order: parseNumber(item.order, 0),
    isActive: item.isActive !== undefined ? parseBoolean(item.isActive) : true,
    displayLocation: item.displayLocation || 'both',
    isDemo: parseBoolean(item.isDemo)
  };
}

// Smart detection helper
function detectAndExtractJSON(parsed: any) {
  let rawProducts: any[] = [];
  let rawCategories: any[] = [];
  let rawSettings: any = null;
  let rawBrands: any[] = [];
  let rawSliders: any[] = [];

  if (Array.isArray(parsed)) {
    if (parsed.length > 0) {
      const first = parsed[0];
      if (first && typeof first === 'object') {
        if ('title' in first || 'price' in first) {
          rawProducts = parsed;
        } else if ('name' in first || 'slug' in first) {
          rawCategories = parsed;
        } else {
          rawProducts = parsed;
        }
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    const hasWrappedKeys = 'products' in parsed || 'categories' in parsed || 'settings' in parsed || 'brands' in parsed || 'sliders' in parsed;
    
    if (hasWrappedKeys) {
      if (Array.isArray(parsed.products)) rawProducts = parsed.products;
      if (Array.isArray(parsed.categories)) rawCategories = parsed.categories;
      if (parsed.settings) rawSettings = parsed.settings;
      if (Array.isArray(parsed.brands)) rawBrands = parsed.brands;
      if (Array.isArray(parsed.sliders)) rawSliders = parsed.sliders;
    } else {
      if ('title' in parsed || 'price' in parsed) {
        rawProducts = [parsed];
      } else if ('name' in parsed || 'slug' in parsed) {
        rawCategories = [parsed];
      } else if ('shopName' in parsed || 'currency' in parsed || 'themeColor' in parsed) {
        rawSettings = parsed;
      }
    }
  }
  return { rawProducts, rawCategories, rawSettings, rawBrands, rawSliders };
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
    const shopId = payload.shopId;

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
    let settings: any = null;
    const brands: any[] = [];
    const sliders: any[] = [];

    // --- AI METHOD PREVIEW ---
    if (method === 'ai') {
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

      const previewChunks = chunks.slice(0, 2);

      const results = await Promise.all(
        previewChunks.map(async (chunk, index) => {
          try {
            const result = await callAiGateway<{ products: any[]; categories: any[] }>({
              shopId,
              endpoint: 'import-export:preview:ai',
              slot: 'simple',
              messages: [
                { role: 'system', content: AI_IMPORT_SYSTEM_PROMPT },
                { role: 'user', content: `داده‌های زیر را آنالیز و استخراج کن:\n\n${chunk}` }
              ],
              mode: 'json',
              temperature: 0.2,
              maxTokens: 2500,
              requiredFields: [],
              fallbackValue: { products: [], categories: [] },
            });
            return { index, result };
          } catch (err: any) {
            console.error(`AI Preview Chunk ${index + 1} Error:`, err);
            return { index, error: err.message || String(err) };
          }
        })
      );

      for (const res of results) {
        if ('error' in res) {
          lastChunkError = res.error;
        } else if (res.result.success && res.result.data) {
          const parsed = res.result.data;
          if (parsed.products && Array.isArray(parsed.products)) {
            for (const prod of parsed.products) {
              const sanitized = sanitizeProduct(prod);
              if (sanitized) products.push(sanitized);
            }
          }
          if (parsed.categories && Array.isArray(parsed.categories)) {
            for (const cat of parsed.categories) {
              const sanitized = sanitizeCategory(cat);
              if (sanitized) categories.push(sanitized);
            }
          }
          successCount++;
        } else {
          lastChunkError = res.result.error || 'خطا در پردازش سگمنت هوش مصنوعی.';
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
            
            if (variantsStr) {
              if (variantsStr.startsWith('[') || variantsStr.startsWith('{')) {
                try {
                  variants = JSON.parse(variantsStr);
                } catch (e) {}
              } else {
                variants = [{
                  name: variantsStr,
                  price: parseNumber(getVal('price'), 0),
                  stock: parseNumber(getVal('stock'), 10)
                }];
              }
            }

            const rawProduct = {
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
            };

            const sanitized = sanitizeProduct(rawProduct);
            if (sanitized) products.push(sanitized);
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

            const rawCategory = {
              id: getVal('id') || undefined,
              name,
              slug: getVal('slug') || name,
              description: getVal('description') || null,
              imageUrl: getVal('imageUrl') || null,
              parentId: getVal('parentId') || null,
              isActive: colIndices['isActive'] !== undefined ? parseBoolean(getVal('isActive')) : true
            };

            const sanitized = sanitizeCategory(rawCategory);
            if (sanitized) categories.push(sanitized);
          }
        }
      } else {
        // Standard JSON Preview
        try {
          const parsed = JSON.parse(contentToProcess);
          
          // Use smart schema auto-detection
          const { rawProducts, rawCategories, rawSettings, rawBrands, rawSliders } = detectAndExtractJSON(parsed);

          if (type === 'products') {
            for (const prod of rawProducts) {
              const sanitized = sanitizeProduct(prod);
              if (sanitized) products.push(sanitized);
            }
          } else if (type === 'categories') {
            for (const cat of rawCategories) {
              const sanitized = sanitizeCategory(cat);
              if (sanitized) categories.push(sanitized);
            }
          } else if (type === 'settings') {
            const sanitized = sanitizeSettings(rawSettings);
            if (sanitized) {
              settings = sanitized;
            }
          } else if (type === 'full') {
            for (const prod of rawProducts) {
              const sanitized = sanitizeProduct(prod);
              if (sanitized) products.push(sanitized);
            }
            for (const cat of rawCategories) {
              const sanitized = sanitizeCategory(cat);
              if (sanitized) categories.push(sanitized);
            }
            const sanitizedSet = sanitizeSettings(rawSettings);
            if (sanitizedSet) {
              settings = sanitizedSet;
            }
            for (const brand of rawBrands) {
              const sanitized = sanitizeBrand(brand);
              if (sanitized) brands.push(sanitized);
            }
            for (const slider of rawSliders) {
              const sanitized = sanitizeSlider(slider);
              if (sanitized) sliders.push(sanitized);
            }
          }

          // Special return formatting for settings only preview if selected
          if (type === 'settings' && settings) {
            return NextResponse.json({
              success: true,
              isSettingsOnly: true,
              settings
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

    // Honest reporting: Fail if no valid entries were parsed/extracted
    if (products.length === 0 && categories.length === 0 && !settings && brands.length === 0 && sliders.length === 0) {
      return NextResponse.json({
        error: 'هیچ داده معتبری (محصول، دسته‌بندی یا تنظیمات) هماهنگ با فیلتر انتخاب شده در فایل یافت نشد. لطفاً ساختار فایل و نوع انتخاب شده را بررسی کنید.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      products,
      categories,
      settings,
      brands,
      sliders
    });

  } catch (error: any) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: 'خطا در آنالیز و پیش‌نمایش داده‌ها.' }, { status: 500 });
  }
}
