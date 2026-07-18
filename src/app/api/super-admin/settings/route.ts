import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { invalidateModelCache } from '@/lib/ai-model-resolver';
import { invalidateGatewayCache } from '@/lib/openrouter-fetch';
import { encrypt, decrypt } from '@/lib/crypto';
import { shouldUpdateSecret } from '@/lib/validate-secret';

function maskUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const maskedHost = host.length > 7 ? host.slice(0, 3) + '••••••••' + host.slice(-4) : '••••••••';
    return `${parsed.protocol}//${maskedHost}${parsed.pathname}`;
  } catch (e) {
    return 'https://••••••••/••••••••';
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

const DEFAULT_PROMPTS = {
  ai_seo_prompt_base: `تو یک محقق محتوای سئو هستی که وظیفه‌ات تکمیل و بهبود توضیحات محصول و تولید عنوان سئو (SEO Title) و توضیحات سئو (SEO Description) با استفاده از اطلاعات معتبر است. از آنجا که ممکن است به ابزار جستجوی زنده وب دسترسی نداشته باشی، باید از دانش داخلی بسیار دقیق، مستند و واقعی خود به عنوان مرجع رسمی و اینترنتی استفاده کنی.

عنوان محصول: "{title}"

═══════════════════════════════════
مرحله ۱ — تأیید هویت محصول (اجباری):
═══════════════════════════════════

قبل از هر چیز، باید مطمئن شوی که محصول را به درستی می‌شناسی و هویت آن قابل تأیید است.
برند و مدل محصول را شناسایی کن.

قوانین تأیید هویت:
اگر لیست مشخصات فنی ارائه شده خالی یا دارای کمتر از ۲ مورد است، معیار چهارم نادیده گرفته می‌شود و مطابقت ۲ مورد از ۳ مورد اول برای تأیید هویت کافی است:
۱. نام برند مطابقت دارد (مثلاً زونتس / Zontes)
۲. نام مدل یا سری محصول مطابقت دارد (از روی عنوان استخراج شود)
۳. نوع و دسته‌بندی محصول مطابقت دارد (مثلاً موتورسیکلت)
۴. حداقل ۲ مشخصه فنی از مشخصات فنی ارائه شده مطابقت دارد (فقط در صورتی که حداقل ۲ مشخصه وجود داشته باشد)

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

اگر محصول تایید شد، عنوان سئو (SEO Title) و توضیحات سئو (SEO Description) بهینه، جذاب و کلیک‌خور برای این محصول بر اساس اطلاعات معتبر تولید کن.

قوانین انتخاب عنوان سئو:
۱. عنوان باید بین ۵۰ تا ۶۰ کاراکتر باشد.
۲. مهم‌ترین کلیدواژه را در ابتدای عنوان بگذار.
۳. عنوان باید برای کاربر جذاب و قابل کلیک باشد.
۴. از تکرار بی‌دلیل کلمات خودداری کن.
۵. ما در سیستم خود مکانیزمی داریم که پلیس‌هولدرهایی نظیر {title} (نام محصول)، {brand} (برند محصول)، {color} (رنگ/تنوع) و {shopName} (نام فروشگاه) را به صورت پویا جایگزین می‌کند. شما می‌توانید از این متغیرها به صورت عینی (نوشتن کلماتی مثل {title}، {brand}، {color}) در عنوان خروجی استفاده کنید.

قوانین انتخاب توضیحات سئو (Meta Description):
۱. بین ۱۵۰ تا ۱۶۰ کاراکتر.
۲. شامل: [نام محصول یا متغیر {title}] + [مهم‌ترین ویژگی] + [دعوت به اقدام / CTA].
۳. طبیعی و غیر تبلیغاتی به نظر برسد.
۴. فقط از داده‌های واقعی موجود در متغیرها استفاده کن. از نوشتن موارد تخیلی جداً خودداری کن.
۵. متغیر فقط اگه ضروری بود استفاده کن (مثلا متغیر {shopName} برای نام فروشگاه عالی است).

خروجی شما باید دقیقاً یک شیء JSON با ساختار زیر باشد و هیچ متنی قبل یا بعد از آن ارسال نکنید (از نوشتن توضیحات اضافی یا قرار دادن مارک‌داون خودداری کنید، فقط جیسان خام برگردانید):
{
  "seoTitle": "عنوان سئو تولید شده با متغیرها یا کلمات واقعی",
  "seoDescription": "توضیحات سئو تولید شده با متغیرها یا کلمات واقعی"
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
قانون بخش تنوع محصول: تنوع مدل‌ها, طرح‌ها یا رنگ‌های موجود را به سئو اضافه کنید تا نشان‌دهنده کامل بودن انتخاب‌ها باشد (مثلا: "در رنگ‌های متنوع").`,
  ai_seo_prompt_fulldesc: `خلاصه توضیحات تفصیلی محصول: "{fullDescription}"
قانون بخش توضیحات تفصیلی: جزئیات عمیق‌تر، کاربردهای فرعی و مزایای تکمیلی را از این بخش استخراج کرده و در بهینه‌سازی کلمات کلیدی توضیحات سئو بگنجانید.`,
  ai_seo_article_prompt: `تو یک محقق محتوای سئو هستی که وظیفه‌ات تکمیل و بهبود توضیحات محصول با استفاده از اطلاعات معتبر است. از آنجا که ممکن است به ابزار جستجوی زنده وب دسترسی نداشته باشی، باید از دانش داخلی بسیار دقیق، مستند و واقعی خود به عنوان مرجع رسمی و اینترنتی استفاده کنی.

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
مرحله ۱ — تأیید هویت محصول (اجباری):
═══════════════════════════════════

قبل از هر چیز، باید مطمئن شوی که محصول را به درستی می‌شناسی و هویت آن قابل تأیید است.
برند و مدل محصول را از روی {brand} و {title} شناسایی کن.

قوانین تأیید هویت:
اگر لیست مشخصات فنی ({specs}) خالی یا دارای کمتر از ۲ مورد است، معیار چهارم نادیده گرفته می‌شود و مطابقت ۲ مورد از ۳ مورد اول برای تأیید هویت کافی است:
۱. نام برند مطابقت دارد (مثلاً زونتس / Zontes)
۲. نام مدل یا سری محصول مطابقت دارد (از روی عنوان استخراج شود)
۳. نوع و دسته‌بندی محصول مطابقت دارد (مثلاً موتورسیکلت)
۴. حداقل ۲ مشخصه فنی از {specs} مطابقت دارد (فقط در صورتی که حداقل ۲ مشخصه در {specs} وجود داشته باشد)

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
- مشخصات فنی که در {specs} یا ورودی نبود ولی در منبع رسمی هست
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

اگر محصول تایید شد، خروجی را دقیقاً با ساختار زیر تولید کن:

### عنوان:
[عنوان محصول و دسته‌بندی]

### توضیحات:
[یک مقاله سئو شده، منسجم، روان و بسیار منظم بنویس که مشخصات فنی داده شده و اطلاعات تکمیلی معتبر یافت شده را به صورت جملات توضیحی و کاربردی شرح دهد.
قوانین نگارش بخش توضیحات (مقاله سئو):
۱. برای بخش‌بندی و ساختاردهی منظم به مقاله، حتماً از زیرعنوان‌های جذاب با فرمت مارک‌داون (مانند #### یا #####) استفاده کن.
۲. کلمات کلیدی، نام محصول، برند و ویژگی‌های فنی مهم را با استفاده از ستاره دوبل (**کلمه**) حتماً ضخیم (bold) کن تا در سئو و خوانایی تاثیرگذار باشد.
۳. در صورت لزوم، نکات یا مراحل یا مزایا را به صورت لیست شماره‌گذاری شده (مثلاً ۱. ۲. ۳.) بنویس.
۴. مشخصات فنی را به صورت جملات روان بنویس.
۵. به هیچ وجه ویژگی یا مشخصه جدیدی که سند رسمی ندارد اضافه نکن.]

### ویژگی‌ها:
[ویژگی‌های برجسته و رسمی محصول]

### مشخصات فنی:
| مشخصه | مقدار |
|--------|-------|
[جدول مشخصات فنی کامل محصول]

### اطلاعات تکمیلی یافت شده:

منبع: [نام سایت + لینک]
تاریخ بررسی: [تاریخ امروز]
سطح اطمینان: [بالا / متوسط / پایین]

#### مشخصات اضافه شده:
| مشخصه | مقدار | منبع |
|--------|-------|------|
| ... | ... | ... |

#### ویژگی‌های اضافه شده:
- [ویژگی] ← منبع: [نام منبع]

#### موارد یافت نشده:
- [فیلدهایی که جستجو شد ولی پیدا نشد]

---

⚠️ هشدار صداقت:
اگه در هر مرحله‌ای مطمئن نبودی → ننویس.
اگه منبع رسمی پیدا نکردی → ننویس.
اگه محصول دقیقاً تأیید نشد → کل فرآیند را متوقف کن و فقط بنویس: «اطلاعات کافی برای تکمیل از اینترنت یافت نشد.»`,
  ai_seo_faq_prompt: `تو یک محقق محتوای سئو هستی که وظیفه‌ات تکمیل و بهبود توضیحات محصول و تولید سوالات متداول (FAQ) با استفاده از اطلاعات معتبر است. از آنجا که ممکن است به ابزار جستجوی زنده وب دسترسی نداشته باشی، باید از دانش داخلی بسیار دقیق، مستند و واقعی خود به عنوان مرجع رسمی و اینترنتی استفاده کنی.

ورودی محصول:
عنوان محصول: "{title}"
توضیحات کوتاه: "{description}"
برند: "{brand}"
قیمت: {price} تومان
نوع کالا: {type}
دسته‌بندی: "{category}"
مشخصات فنی: {specs}
ویژگی‌های برجسته کالا: {features}
تنوع و رنگ‌ها: {variants}
خلاصه توضیحات تفصیلی: "{fullDescription}"

═══════════════════════════════════
مرحله ۱ — تأیید هویت محصول (اجباری):
═══════════════════════════════════

قبل از هر چیز، باید مطمئن شوی که محصول را به درستی می‌شناسی و هویت آن قابل تأیید است.
برند و مدل محصول را از روی برند و عنوان محصول شناسایی کن.

قوانین تأیید هویت:
اگر لیست مشخصات فنی ({specs}) خالی یا دارای کمتر از ۲ مورد است، معیار چهارم نادیده گرفته می‌شود و مطابقت ۲ مورد از ۳ مورد اول برای تأیید هویت کافی است:
۱. نام برند مطابقت دارد (مثلاً زونتس / Zontes)
۲. نام مدل یا سری محصول مطابقت دارد (از روی عنوان استخراج شود)
۳. نوع و دسته‌بندی محصول مطابقت دارد (مثلاً موتورسیکلت)
۴. حداقل ۲ مشخصه فنی از {specs} مطابقت دارد (فقط در صورتی که حداقل ۲ مشخصه در {specs} وجود داشته باشد)

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
- مشخصات فنی که در {specs} یا ورودی نبود ولی در منبع رسمی هست
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

اگر محصول تایید شد، ۵ سوال متداول و کلیدی (FAQ) به همراه پاسخ‌های کوتاه، دقیق و ترغیب‌کننده برای این محصول تولید کن.
قوانین تولید پرسش و پاسخ (FAQ):
1. سوالات باید مواردی باشند که واقعاً در ذهن خریداران این محصول شکل می‌گیرد (مانند اصالت کالا، نحوه گارانتی، کاربرد اصلی، اقلام همراه، یا راه‌اندازی).
2. پاسخ‌ها صریح، مطمئن، محترمانه و کوتاه (حداکثر ۲ یا ۳ جمله) باشند.
3. در نگارش از کلمات کلیدی سئو شده مربوط به محصول استفاده کنید.
4. پاسخ‌ها باید کاملاً دقیق، واقعی و بر اساس مشخصات تایید شده محصول باشند. از پاسخ‌های الکی، اشتباه یا گمراه‌کننده خودداری کنید.

خروجی باید دقیقاً یک آرایه JSON شامل اشیاء با ساختار زیر باشد و هیچ متن اضافی قبل یا بعد از آن بازنگردانید (از بازگرداندن مارک‌داون خودداری کنید، فقط جی‌سان خام برگردانید):
[
  {
    "question": "سوال اول؟",
    "answer": "پاسخ سوال اول."
  },
  ...
]

---

⚠️ هشدار صداقت:
اگه در هر مرحله‌ای مطمئن نبودی → ننویس.
اگه منبع رسمی پیدا نکردی → ننویس.
اگه محصول دقیقاً تأیید نشد → کل فرآیند را متوقف کن و فقط بنویس: «اطلاعات کافی برای تکمیل از اینترنت یافت نشد.»`
};

export async function GET() {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const poofSetting = await prisma.systemSetting.findUnique({
      where: { key: 'poof_api_key' },
    });
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' },
    });
    const openrouterModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_model' },
    });
    const openrouterControlModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_control_model' },
    });
    const openrouterBlogModelSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_blog_model' },
    });
    const blogAiChunkSizeSetting = await prisma.systemSetting.findUnique({
      where: { key: 'blog_ai_chunk_size' },
    });
    const blogAiOverlapTokensSetting = await prisma.systemSetting.findUnique({
      where: { key: 'blog_ai_overlap_tokens' },
    });
    const blogAiMaxChunksSetting = await prisma.systemSetting.findUnique({
      where: { key: 'blog_ai_max_chunks' },
    });
    const blogAiAutoContinueSetting = await prisma.systemSetting.findUnique({
      where: { key: 'blog_ai_auto_continue' },
    });
    const aiEnabledSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_enabled' },
    });

    const aiGatewayEnabledSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_gateway_enabled' } });
    const aiGatewayLastStatusSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_gateway_last_status' } });
    const aiGatewayLastCheckedAtSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_gateway_last_checked_at' } });

    const aiModelRouterSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_router' } });
    const aiModelSimpleSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_simple' } });
    const aiModelComplexSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_complex' } });
    const aiModelContentSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_content' } });
    const aiModelChatSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_chat' } });
    const aiModelEmbeddingSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_embedding' } });
    const aiModelFallbackSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_fallback' } });
    const aiModelWholesaleSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_model_wholesale' } });
    const aiEmbeddingBaseUrlSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_embedding_base_url' } });
    const aiEmbeddingApiKeySetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_embedding_api_key' } });
    const saasFeaturesSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_features' } });
    const saasMetaTitleSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_meta_title' } });
    const saasMetaDescSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_meta_desc' } });
    const saasHeroTitleSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_hero_title' } });
    const saasHeroSubtitleSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_hero_subtitle' } });
    const saasPrimaryCtaSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_primary_cta' } });
    const saasSecondaryCtaSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_secondary_cta' } });
    const saasFaqsSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_faqs' } });
    const saasDemosSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_demos' } });
    const saasPricingSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_pricing' } });
    const saasComparisonsSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_comparisons' } });
    const saasPromptsSetting = await prisma.systemSetting.findUnique({ where: { key: 'saas_prompts' } });

    const platformBlogIdeaModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_idea_model' } });
    const platformBlogOutlineModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_outline_model' } });
    const platformBlogSectionModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_section_model' } });
    const platformBlogSeoModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_seo_model' } });
    const platformBlogGeoModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_geo_model' } });
    const platformBlogRewriteModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_rewrite_model' } });
    const platformBlogFaqModelSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_blog_faq_model' } });

    const globalMelipayamakUsernameSetting = await prisma.systemSetting.findUnique({
      where: { key: 'global_melipayamak_username' },
    });
    const globalMelipayamakPasswordSetting = await prisma.systemSetting.findUnique({
      where: { key: 'global_melipayamak_password' },
    });
    const globalMelipayamakPatternCodeSetting = await prisma.systemSetting.findUnique({
      where: { key: 'global_melipayamak_pattern_code' },
    });

    let globalSmsUsername = '';
    if (globalMelipayamakUsernameSetting?.value) {
      try {
        const decrypted = decrypt(globalMelipayamakUsernameSetting.value);
        if (decrypted) {
          globalSmsUsername = '********';
        }
      } catch (e) {
        console.error('Error decrypting global SMS username:', e);
      }
    }

    let globalSmsPassword = '';
    if (globalMelipayamakPasswordSetting?.value) {
      try {
        const decrypted = decrypt(globalMelipayamakPasswordSetting.value);
        if (decrypted) {
          globalSmsPassword = '********';
        }
      } catch (e) {
        console.error('Error decrypting global SMS password:', e);
      }
    }

    const globalSmsPatternCode = globalMelipayamakPatternCodeSetting?.value || '';

    const smsEncryptionKeyStatus = process.env.SMS_ENCRYPTION_KEY ? 'configured' : 'warning';
    const otpHashSecretStatus = process.env.OTP_HASH_SECRET ? 'configured' : 'warning';
    const totalSmsLogs = await (prisma as any).smsLog.count();

    const savedPrompts = await prisma.systemSetting.findMany({
      where: { key: { startsWith: 'ai_' } }
    });

    const centralBaleBotTokenSetting = await prisma.systemSetting.findUnique({
      where: { key: 'central_bale_bot_token' }
    });
    const centralBaleBotApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'central_bale_bot_api_key' }
    });

    const centralBaleBotToken = centralBaleBotTokenSetting?.value || '';
    const centralBaleBotApiKey = centralBaleBotApiKeySetting?.value || '';

    const centralTelegramBotTokenSetting = await prisma.systemSetting.findUnique({
      where: { key: 'central_telegram_bot_token' }
    });
    const centralTelegramBotApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'central_telegram_bot_api_key' }
    });

    const centralTelegramBotToken = centralTelegramBotTokenSetting?.value || '';
    const centralTelegramBotApiKey = centralTelegramBotApiKeySetting?.value || '';

    const prompts: Record<string, string> = { ...DEFAULT_PROMPTS };
    savedPrompts.forEach(p => {
      prompts[p.key] = p.value;
    });

    const apiKey = poofSetting?.value || '';
    const openrouterApiKey = openrouterApiKeySetting?.value || '';
    const openrouterModel = openrouterModelSetting?.value || 'google/gemini-2.5-flash';
    const openrouterControlModel = openrouterControlModelSetting?.value || '';
    const aiProvider = 'openrouter';
    const aiEnabled = aiEnabledSetting ? aiEnabledSetting.value === 'true' : true;

    const aiGatewayEnabled = aiGatewayEnabledSetting ? aiGatewayEnabledSetting.value === 'true' : false;
    const aiGatewayLastStatus = aiGatewayLastStatusSetting?.value || 'تنظیم نشده';
    const aiGatewayLastCheckedAt = aiGatewayLastCheckedAtSetting?.value || '';
    const aiGatewayUrl = process.env.AI_GATEWAY_URL || '';
    let accountInfo = null;

    if (apiKey) {
      try {
        // Reduced timeout to 2 seconds to prevent blocking the page load
        const poofRes = await fetch('https://api.poof.bg/v1/me', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
          },
          signal: AbortSignal.timeout(2000),
        });

        if (poofRes.ok) {
          const data = await poofRes.json();
          accountInfo = {
            plan: data.plan,
            maxCredits: data.maxCredits,
            usedCredits: data.usedCredits,
            remainingCredits: data.maxCredits - data.usedCredits,
          };
        } else {
          console.warn('Poof account API response not OK:', poofRes.status);
        }
      } catch (err) {
        console.error('Failed to fetch Poof account details (non-blocking):', err);
      }
    }

    const openrouterBlogModel = openrouterBlogModelSetting?.value || 'google/gemini-2.5-flash';
    const aiModelRouter = aiModelRouterSetting?.value || '';
    const aiModelSimple = aiModelSimpleSetting?.value || '';
    const aiModelComplex = aiModelComplexSetting?.value || '';
    const aiModelContent = aiModelContentSetting?.value || '';
    const aiModelChat = aiModelChatSetting?.value || '';
    const aiModelEmbedding = aiModelEmbeddingSetting?.value || '';
    const aiModelFallback = aiModelFallbackSetting?.value || '';
    const aiModelWholesale = aiModelWholesaleSetting?.value || '';
    const aiEmbeddingBaseUrl = aiEmbeddingBaseUrlSetting?.value || '';
    const aiEmbeddingApiKey = aiEmbeddingApiKeySetting?.value || '';
    const saasFeatures = saasFeaturesSetting?.value || '';
    const saasMetaTitle = saasMetaTitleSetting?.value || '';
    const saasMetaDesc = saasMetaDescSetting?.value || '';
    const saasHeroTitle = saasHeroTitleSetting?.value || '';
    const saasHeroSubtitle = saasHeroSubtitleSetting?.value || '';
    const saasPrimaryCta = saasPrimaryCtaSetting?.value || '';
    const saasSecondaryCta = saasSecondaryCtaSetting?.value || '';
    const saasFaqs = saasFaqsSetting?.value || '';
    const saasDemos = saasDemosSetting?.value || '';
    const saasPricing = saasPricingSetting?.value || '';
    const saasComparisons = saasComparisonsSetting?.value || '';
    const saasPrompts = saasPromptsSetting?.value || '';
    const blogAiChunkSize = blogAiChunkSizeSetting?.value || '800';
    const blogAiOverlapTokens = blogAiOverlapTokensSetting?.value || '200';
    const blogAiMaxChunks = blogAiMaxChunksSetting?.value || '5';
    const blogAiAutoContinue = blogAiAutoContinueSetting ? blogAiAutoContinueSetting.value === 'true' : true;

    const platformBlogIdeaModel = platformBlogIdeaModelSetting?.value || '';
    const platformBlogOutlineModel = platformBlogOutlineModelSetting?.value || '';
    const platformBlogSectionModel = platformBlogSectionModelSetting?.value || '';
    const platformBlogSeoModel = platformBlogSeoModelSetting?.value || '';
    const platformBlogGeoModel = platformBlogGeoModelSetting?.value || '';
    const platformBlogRewriteModel = platformBlogRewriteModelSetting?.value || '';
    const platformBlogFaqModel = platformBlogFaqModelSetting?.value || '';

    const hasPoofApiKey = !!poofSetting?.value;
    const hasOpenRouterApiKey = !!openrouterApiKeySetting?.value;
    const hasEmbeddingApiKey = !!aiEmbeddingApiKeySetting?.value;

    const maskedPoofApiKey = hasPoofApiKey ? '••••••••••••••••' : '';
    const maskedOpenRouterApiKey = hasOpenRouterApiKey ? '••••••••••••••••' : '';
    const maskedEmbeddingApiKey = hasEmbeddingApiKey ? '••••••••••••••••' : '';

    console.log('[DEBUG SETTINGS GET]', { aiProvider, aiEnabled });

    return NextResponse.json({ 
      apiKey: maskedPoofApiKey, 
      openrouterApiKey: maskedOpenRouterApiKey, 
      openrouterModel, 
      openrouterControlModel, 
      openrouterBlogModel,
      blogAiChunkSize,
      blogAiOverlapTokens,
      blogAiMaxChunks,
      blogAiAutoContinue,
      aiProvider,
      aiEnabled,
      aiGatewayEnabled,
      aiGatewayLastStatus,
      aiGatewayLastCheckedAt,
      aiGatewayUrl: maskUrl(aiGatewayUrl),
      prompts, 
      accountInfo,
      centralBaleBotToken,
      centralBaleBotApiKey,
      centralTelegramBotToken,
      centralTelegramBotApiKey,
      aiModelRouter,
      aiModelSimple,
      aiModelComplex,
      aiModelContent,
      aiModelChat,
      aiModelEmbedding,
      aiModelFallback,
      aiModelWholesale,
      aiEmbeddingBaseUrl,
      aiEmbeddingApiKey: maskedEmbeddingApiKey,
      hasPoofApiKey,
      hasOpenRouterApiKey,
      hasEmbeddingApiKey,
      platformBlogIdeaModel,
      platformBlogOutlineModel,
      platformBlogSectionModel,
      platformBlogSeoModel,
      platformBlogGeoModel,
      platformBlogRewriteModel,
      platformBlogFaqModel,
      globalSmsUsername,
      globalSmsPassword,
      globalSmsPatternCode,
      smsEncryptionKeyStatus,
      otpHashSecretStatus,
      totalSmsLogs,
      saasFeatures,
      saasMetaTitle,
      saasMetaDesc,
      saasHeroTitle,
      saasHeroSubtitle,
      saasPrimaryCta,
      saasSecondaryCta,
      saasFaqs,
      saasDemos,
      saasPricing,
      saasComparisons,
      saasPrompts
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      apiKey, 
      openrouterApiKey, 
      openrouterModel, 
      openrouterControlModel, 
      openrouterBlogModel,
      blogAiChunkSize,
      blogAiOverlapTokens,
      blogAiMaxChunks,
      blogAiAutoContinue,
      aiEnabled,
      aiGatewayEnabled,
      prompts,
      centralBaleBotToken,
      centralBaleBotApiKey,
      centralTelegramBotToken,
      centralTelegramBotApiKey,
      aiModelRouter,
      aiModelSimple,
      aiModelComplex,
      aiModelContent,
      aiModelChat,
      aiModelEmbedding,
      aiModelFallback,
      aiModelWholesale,
      aiEmbeddingBaseUrl,
      aiEmbeddingApiKey,
      platformBlogIdeaModel,
      platformBlogOutlineModel,
      platformBlogSectionModel,
      platformBlogSeoModel,
      platformBlogGeoModel,
      platformBlogRewriteModel,
      platformBlogFaqModel,
      globalSmsUsername,
      globalSmsPassword,
      globalSmsPatternCode,
      saasFeatures,
      clearSmsLogs,
      deleteOldSmsLogs,
      saasMetaTitle,
      saasMetaDesc,
      saasHeroTitle,
      saasHeroSubtitle,
      saasPrimaryCta,
      saasSecondaryCta,
      saasFaqs,
      saasDemos,
      saasPricing,
      saasComparisons,
      saasPrompts
    } = body;

    const aiProvider = 'openrouter';

    console.log('[DEBUG SETTINGS POST]', { aiProvider, aiEnabled });

    // Handle high-security platform SMS configuration upserts
    if (globalSmsUsername !== undefined && globalSmsUsername !== '********') {
      await prisma.systemSetting.upsert({
        where: { key: 'global_melipayamak_username' },
        update: { value: globalSmsUsername ? encrypt(globalSmsUsername) : '' },
        create: { key: 'global_melipayamak_username', value: globalSmsUsername ? encrypt(globalSmsUsername) : '' },
      });
    }

    if (globalSmsPassword !== undefined && globalSmsPassword !== '********') {
      await prisma.systemSetting.upsert({
        where: { key: 'global_melipayamak_password' },
        update: { value: globalSmsPassword ? encrypt(globalSmsPassword) : '' },
        create: { key: 'global_melipayamak_password', value: globalSmsPassword ? encrypt(globalSmsPassword) : '' },
      });
    }

    if (globalSmsPatternCode !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'global_melipayamak_pattern_code' },
        update: { value: String(globalSmsPatternCode) },
        create: { key: 'global_melipayamak_pattern_code', value: String(globalSmsPatternCode) },
      });
    }

    // Handle high-security SmsLog clean-ups
    if (clearSmsLogs === true) {
      await (prisma as any).smsLog.deleteMany({});
    } else if (deleteOldSmsLogs === true) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await (prisma as any).smsLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });
    }

    if (centralBaleBotToken !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'central_bale_bot_token' },
        update: { value: centralBaleBotToken },
        create: { key: 'central_bale_bot_token', value: centralBaleBotToken },
      });
    }

    if (centralBaleBotApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'central_bale_bot_api_key' },
        update: { value: centralBaleBotApiKey },
        create: { key: 'central_bale_bot_api_key', value: centralBaleBotApiKey },
      });
    }

    if (centralTelegramBotToken !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'central_telegram_bot_token' },
        update: { value: centralTelegramBotToken },
        create: { key: 'central_telegram_bot_token', value: centralTelegramBotToken },
      });
    }

    if (centralTelegramBotApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'central_telegram_bot_api_key' },
        update: { value: centralTelegramBotApiKey },
        create: { key: 'central_telegram_bot_api_key', value: centralTelegramBotApiKey },
      });
    }

    if (openrouterBlogModel !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'openrouter_blog_model' },
        update: { value: openrouterBlogModel },
        create: { key: 'openrouter_blog_model', value: openrouterBlogModel },
      });
    }

    if (blogAiChunkSize !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'blog_ai_chunk_size' },
        update: { value: String(blogAiChunkSize) },
        create: { key: 'blog_ai_chunk_size', value: String(blogAiChunkSize) },
      });
    }

    if (blogAiOverlapTokens !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'blog_ai_overlap_tokens' },
        update: { value: String(blogAiOverlapTokens) },
        create: { key: 'blog_ai_overlap_tokens', value: String(blogAiOverlapTokens) },
      });
    }

    if (blogAiMaxChunks !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'blog_ai_max_chunks' },
        update: { value: String(blogAiMaxChunks) },
        create: { key: 'blog_ai_max_chunks', value: String(blogAiMaxChunks) },
      });
    }

    if (blogAiAutoContinue !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'blog_ai_auto_continue' },
        update: { value: blogAiAutoContinue ? 'true' : 'false' },
        create: { key: 'blog_ai_auto_continue', value: blogAiAutoContinue ? 'true' : 'false' },
      });
    }

    if (shouldUpdateSecret(apiKey)) {
      await prisma.systemSetting.upsert({
        where: { key: 'poof_api_key' },
        update: { value: apiKey },
        create: { key: 'poof_api_key', value: apiKey },
      });
    }

    if (shouldUpdateSecret(openrouterApiKey)) {
      await prisma.systemSetting.upsert({
        where: { key: 'openrouter_api_key' },
        update: { value: openrouterApiKey },
        create: { key: 'openrouter_api_key', value: openrouterApiKey },
      });
    }

    if (openrouterModel !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'openrouter_model' },
        update: { value: openrouterModel },
        create: { key: 'openrouter_model', value: openrouterModel },
      });
    }

    if (openrouterControlModel !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'openrouter_control_model' },
        update: { value: openrouterControlModel },
        create: { key: 'openrouter_control_model', value: openrouterControlModel },
      });
    }

    if (aiProvider !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai_provider' },
        update: { value: aiProvider },
        create: { key: 'ai_provider', value: aiProvider },
      });
    }

    if (aiEnabled !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai_enabled' },
        update: { value: aiEnabled ? 'true' : 'false' },
        create: { key: 'ai_enabled', value: aiEnabled ? 'true' : 'false' },
      });
    }

    if (aiGatewayEnabled !== undefined) {
      if (typeof aiGatewayEnabled !== 'boolean') {
        return NextResponse.json({ error: 'مقدار فعال‌سازی واسط هوش مصنوعی نامعتبر است' }, { status: 400 });
      }
      await prisma.systemSetting.upsert({
        where: { key: 'ai_gateway_enabled' },
        update: { value: aiGatewayEnabled ? 'true' : 'false' },
        create: { key: 'ai_gateway_enabled', value: aiGatewayEnabled ? 'true' : 'false' },
      });
      invalidateGatewayCache();
    }

    if (prompts && typeof prompts === 'object') {
      for (const [key, val] of Object.entries(prompts)) {
        if (key.startsWith('ai_') && typeof val === 'string') {
          await prisma.systemSetting.upsert({
            where: { key },
            update: { value: val },
            create: { key, value: val },
          });
        }
      }
    }

    const newSettings = {
      ai_model_router: aiModelRouter,
      ai_model_simple: aiModelSimple,
      ai_model_complex: aiModelComplex,
      ai_model_content: aiModelContent,
      ai_model_chat: aiModelChat,
      ai_model_embedding: aiModelEmbedding,
      ai_model_fallback: aiModelFallback,
      ai_model_wholesale: aiModelWholesale,
      ai_embedding_base_url: aiEmbeddingBaseUrl,
      platform_blog_idea_model: platformBlogIdeaModel,
      platform_blog_outline_model: platformBlogOutlineModel,
      platform_blog_section_model: platformBlogSectionModel,
      platform_blog_seo_model: platformBlogSeoModel,
      platform_blog_geo_model: platformBlogGeoModel,
      platform_blog_rewrite_model: platformBlogRewriteModel,
      platform_blog_faq_model: platformBlogFaqModel,
    };

    for (const [key, value] of Object.entries(newSettings)) {
      if (value !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    if (shouldUpdateSecret(aiEmbeddingApiKey)) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai_embedding_api_key' },
        update: { value: aiEmbeddingApiKey },
        create: { key: 'ai_embedding_api_key', value: aiEmbeddingApiKey },
      });
    }

    if (saasFeatures !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'saas_features' },
        update: { value: String(saasFeatures) },
        create: { key: 'saas_features', value: String(saasFeatures) },
      });
    }

    const marketingSettings = {
      saas_meta_title: saasMetaTitle,
      saas_meta_desc: saasMetaDesc,
      saas_hero_title: saasHeroTitle,
      saas_hero_subtitle: saasHeroSubtitle,
      saas_primary_cta: saasPrimaryCta,
      saas_secondary_cta: saasSecondaryCta,
      saas_faqs: saasFaqs,
      saas_demos: saasDemos,
      saas_pricing: saasPricing,
      saas_comparisons: saasComparisons,
      saas_prompts: saasPrompts,
    };

    for (const [key, value] of Object.entries(marketingSettings)) {
      if (value !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    invalidateModelCache();
    invalidateGatewayCache();

    // Automatically trigger starting or restarting the Bale Bot Runner process on the server
    if (centralBaleBotToken && process.env.DISABLE_AUTO_BALE_BOT !== 'true') {
      console.log('[INFO] [BaleBotManager]: Automatically launching/restarting Bale Bot Runner process...');
      
      const pidFilePath = path.join(process.cwd(), 'scripts', 'bale-bot.pid');
      
      const spawnNewProcess = () => {
        const botProcess = spawn('npm', ['run', 'bale-bot'], {
          detached: true,
          stdio: 'ignore',
          shell: true
        });
        botProcess.unref();
        console.log('[INFO] [BaleBotManager]: Successfully spawned Bale Bot process.');
      };

      if (fs.existsSync(pidFilePath)) {
        try {
          const oldPid = fs.readFileSync(pidFilePath, 'utf8').trim();
          if (oldPid) {
            console.log(`[INFO] [BaleBotManager]: Found old PID ${oldPid}, killing...`);
            if (process.platform === 'win32') {
              exec(`taskkill /F /PID ${oldPid} 2>nul`, () => {
                setTimeout(spawnNewProcess, 1000);
              });
            } else {
              try {
                process.kill(Number(oldPid), 'SIGKILL');
              } catch (e) {}
              setTimeout(spawnNewProcess, 1000);
            }
          } else {
            spawnNewProcess();
          }
        } catch (err) {
          console.error('[WARN] Failed to read or kill old PID, spawning anyway:', err);
          spawnNewProcess();
        }
      } else {
        if (process.platform === 'win32') {
          exec('taskkill /F /FI "WINDOWTITLE eq npm run bale-bot*" /T 2>nul || taskkill /F /FI "COMMANDLINE eq *bale-bot.js*" /T 2>nul', () => {
            setTimeout(spawnNewProcess, 1000);
          });
        } else {
          exec('pkill -f bale-bot.js', () => {
            setTimeout(spawnNewProcess, 1000);
          });
        }
      }
    }

    // Automatically trigger starting or restarting the Telegram Bot Runner process on the server
    if (centralTelegramBotToken && process.env.DISABLE_AUTO_TELEGRAM_BOT !== 'true') {
      console.log('[INFO] [TelegramBotManager]: Automatically launching/restarting Telegram Bot Runner process...');
      
      const pidFilePath = path.join(process.cwd(), 'scripts', 'telegram-bot.pid');
      
      const spawnNewProcess = () => {
        const botProcess = spawn('npm', ['run', 'telegram-bot'], {
          detached: true,
          stdio: 'ignore',
          shell: true
        });
        botProcess.unref();
        console.log('[INFO] [TelegramBotManager]: Successfully spawned Telegram Bot process.');
      };

      if (fs.existsSync(pidFilePath)) {
        try {
          const oldPid = fs.readFileSync(pidFilePath, 'utf8').trim();
          if (oldPid) {
            console.log(`[INFO] [TelegramBotManager]: Found old PID ${oldPid}, killing...`);
            if (process.platform === 'win32') {
              exec(`taskkill /F /PID ${oldPid} 2>nul`, () => {
                setTimeout(spawnNewProcess, 1000);
              });
            } else {
              try {
                process.kill(Number(oldPid), 'SIGKILL');
              } catch (e) {}
              setTimeout(spawnNewProcess, 1000);
            }
          } else {
            spawnNewProcess();
          }
        } catch (err) {
          console.error('[WARN] Failed to read or kill old PID, spawning anyway:', err);
          spawnNewProcess();
        }
      } else {
        if (process.platform === 'win32') {
          exec('taskkill /F /FI "WINDOWTITLE eq npm run telegram-bot*" /T 2>nul || taskkill /F /FI "COMMANDLINE eq *telegram-bot.js*" /T 2>nul', () => {
            setTimeout(spawnNewProcess, 1000);
          });
        } else {
          exec('pkill -f telegram-bot.js', () => {
            setTimeout(spawnNewProcess, 1000);
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving system settings:', error);
    return NextResponse.json({ error: 'خطای سرور در ذخیره‌سازی تنظیمات' }, { status: 500 });
  }
}