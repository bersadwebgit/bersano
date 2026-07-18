import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAiModel } from '@/lib/ai-model-resolver';
import { callAiGateway } from '@/lib/ai-gateway';
import * as XLSX from 'xlsx';

const IMPORT_SYSTEM_PROMPT = `تو یک متخصص تحلیل و درون‌ریزی داده‌های فروشگاهی و هوش مصنوعی فوق‌پیشرفته هستی.
وظیفه تو این است که اطلاعات خام ورودی (که ممکن است به هر فرمتی مانند CSV، JSON، XML، متن ساده کپی شده از چت، جدول یا لیست کاتالوگ باشد) را تحلیل کنی، محصولات را استخراج کرده و آن‌ها را با ساختار پایگاه داده فروشگاه ما سازگار و بهینه کنی.

═══════════════════════════════════
قوانین استخراج و نگاشت فیلدها (بسیار مهم):
═══════════════════════════════════

۱. نام محصول (title): نام یا عنوان محصول (اجباری).
۲. برند (brand): نام برند محصول (در صورت وجود).
۳. توضیحات کوتاه (description): خلاصه یا توضیح کوتاه محصول.
۴. توضیحات کامل (fullDescription): توضیحات جامع، مشخصات کامل یا متن طولانی درباره محصول.
۵. قیمت (price): قیمت اصلی محصول.
   - بسیار مهم: قیمت‌ها باید به تومان (Toman) ذخیره شوند.
   - اگر قیمت به ریال است، آن را به تومان تبدیل کن (تقسیم بر ۱۰).
   - تمام کاماها، حروف اضافه مانند "تومان" یا "ریال" را حذف کرده و فقط عدد نهایی را قرار بده.
   - اگر قیمت مشخص نیست، مقدار پیش‌فرض را 0 قرار بده.
۶. تخفیف (discount): مقدار تخفیف محصول به تومان (نه درصد). اگر درصد تخفیف داده شده، آن را بر اساس قیمت اصلی محاسبه کن و مقدار عددی تخفیف به تومان را قرار بده.
۷. موجودی (stock): تعداد موجودی محصول. اگر ناموجود است 0، اگر نامحدود یا دیجیتال است مقدار مناسب (مثلاً 999999 برای دیجیتال) قرار بده.
۸. نوع محصول (type): مقدار "physical" (فیزیکی) یا "digital" (دیجیتال). پیش‌فرض "physical" است مگر اینکه محصول دانلودی، لایسنس یا فایل باشد.
۹. نام دسته‌بندی (categoryName): نام دسته‌بندی محصول (مانند "کفش ورزشی"، "موبایل"، "لپ‌تاپ"). اگر پیدا نشد، یک دسته‌بندی منطقی بر اساس نام محصول حدس بزن.
۱۰. ویژگی‌ها (features): آرایه‌ای از ویژگی‌های برجسته محصول (رشته متنی، مثلاً ["بدنه ضدآب"، "پشتیبانی از شارژ سریع"]).
۱۱. مشخصات فنی (specs): یک شیء کلید-مقدار (Object) از مشخصات فنی محصول (مثلاً {"حافظه": "128 گیگابایت", "رم": "8 گیگابایت"}).

۱۲. تنوع و ویژگی‌های متغیر (variants) — فوق‌العاده مهم:
    - اگر محصول دارای تنوع است (مثلاً رنگ‌های مختلف، سایزهای مختلف، ظرفیت‌های مختلف که هر کدام ممکن است قیمت یا موجودی متفاوتی داشته باشند)، باید آن‌ها را در آرایه variants قرار دهی.
    - هر عضو در آرایه variants باید شامل موارد زیر باشد:
      * name: نام تنوع (مثلاً "قرمز"، "سایز XL"، "حافظه 256 گیگابایت").
      * price: قیمت این تنوع به تومان (اگر قیمت متفاوتی ندارد، همان قیمت اصلی محصول را بگذار).
      * stock: موجودی این تنوع (مجموع موجودی تنوع‌ها باید با موجودی کل محصول همخوانی داشته باشد).
      * colorCode: اگر تنوع مربوط به رنگ است، کد هگز رنگ مناسب را قرار بده (مثلاً "#FF0000" برای قرمز). اگر رنگ نیست، این فیلد را خالی یا حذف کن.

═══════════════════════════════════
قوانین بهینه‌سازی و تمیزکاری داده‌ها:
═══════════════════════════════════
- غلط‌های املایی واضح در نام محصولات یا دسته‌بندی‌ها را اصلاح کن.
- متن توضیحات را مرتب و خوانا کن (در صورت نیاز از پاراگراف‌بندی یا بولت‌پوینت استفاده کن).
- اگر اطلاعات ناقص است، با دانش خودت آن را به شکل منطقی تکمیل کن ولی اطلاعات تخیلی و دروغین اضافه نکن.

خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل، بعد یا در توضیحات مارک‌داون) بازنگردانی:

{
  "success": true,
  "explanation": "توضیح کوتاه فارسی درباره فایل/متن تحلیل شده و تعداد محصولات استخراج شده...",
  "products": [
    {
      "title": "نام محصول",
      "brand": "برند محصول یا null",
      "description": "توضیحات کوتاه یا null",
      "fullDescription": "توضیحات کامل یا null",
      "price": 1250000,
      "discount": 50000,
      "stock": 20,
      "type": "physical",
      "categoryName": "دسته‌بندی محصول",
      "features": ["ویژگی ۱", "ویژگی ۲"],
      "specs": {
        "مشخصه ۱": "مقدار ۱",
        "مشخصه ۲": "مقدار ۲"
      },
      "variants": [
        {
          "name": "تنوع ۱ (مثلاً قرمز)",
          "price": 1250000,
          "stock": 10,
          "colorCode": "#FF0000"
        },
        {
          "name": "تنوع ۲ (مثلاً آبی)",
          "price": 1250000,
          "stock": 10,
          "colorCode": "#0000FF"
        }
      ]
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const text = formData.get('text') as string | null;

    let textContent = '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel using xlsx
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        textContent = JSON.stringify(jsonData, null, 2);
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.xml') || fileName.endsWith('.txt')) {
        textContent = buffer.toString('utf-8');
      } else {
        return NextResponse.json({ error: 'فرمت فایل پشتیبانی نمی‌شود. لطفا فایل Excel، CSV، JSON یا متنی آپلود کنید.' }, { status: 400 });
      }
    } else if (text) {
      textContent = text;
    } else {
      return NextResponse.json({ error: 'هیچ فایل یا متنی برای درون‌ریزی ارسال نشده است.' }, { status: 400 });
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: 'محتوای ارسالی خالی است.' }, { status: 400 });
    }

    // Call Canonical AI Client
    const result = await callAiGateway({
      shopId: payload.shopId,
      endpoint: 'ai-import',
      slot: 'simple',
      messages: [
        {
          role: 'system',
          content: IMPORT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `لطفاً اطلاعات زیر را تحلیل و به ساختار محصولات فروشگاه تبدیل کن:\n\n${textContent}`,
        }
      ],
      mode: 'json',
      temperature: 0.1,
      maxTokens: 3000,
      skipQuotaCheck: false,
      featureKey: 'aiAgentEnabled',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'خطا در ارتباط با هوش مصنوعی.' }, { status: 502 });
    }

    return NextResponse.json(result.data || {});

  } catch (error: any) {
    console.error('Error in AI Import:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
