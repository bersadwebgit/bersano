// [AI-OPTIMIZED] — caching, selective context, retry added
// [HARDENED] — validation, error isolation, save safety
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { openRouterFetch, getIranDateTime } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { parseAiJson } from '@/lib/parse-ai-json';
import { validateAiRequest } from '@/lib/validate-ai-request';
import { getAiModel } from '@/lib/ai-model-resolver';

interface AiBlogResponse {
  success: boolean;
  explanation?: string;
  operations?: unknown[];
  filter?: string;
  tab?: string;
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

// Consistent (یکدست) CTA box templates with only minor visual differences (accent
// color, eyebrow label, button copy, icon). One is randomly chosen per request so
// generated articles look fresh without breaking the unified minimal theme.
// Placeholders the AI must replace: __IMG__, __TITLE__, __ID__.
const CTA_TEMPLATES: string[] = [
  // Variant 1 — blue accent
  `<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">
  <img src="__IMG__" alt="__TITLE__" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />
  <div class="flex-1">
    <span class="inline-block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">پیشنهاد فروشگاه</span>
    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب CTA</h4>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه ترغیب‌کننده...</p>
    <a href="/product/__ID__" class="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all">مشاهده و خرید محصول</a>
  </div>
</div>`,
  // Variant 2 — emerald accent
  `<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">
  <img src="__IMG__" alt="__TITLE__" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />
  <div class="flex-1">
    <span class="inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">انتخاب ویژه</span>
    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب CTA</h4>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه ترغیب‌کننده...</p>
    <a href="/product/__ID__" class="inline-flex items-center justify-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all">خرید این محصول 🛒</a>
  </div>
</div>`,
  // Variant 3 — amber accent
  `<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">
  <img src="__IMG__" alt="__TITLE__" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />
  <div class="flex-1">
    <span class="inline-block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">پیشنهاد ویژه امروز</span>
    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب CTA</h4>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه ترغیب‌کننده...</p>
    <a href="/product/__ID__" class="inline-flex items-center justify-center px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all">مشاهده محصول ←</a>
  </div>
</div>`,
  // Variant 4 — rose accent
  `<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">
  <img src="__IMG__" alt="__TITLE__" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />
  <div class="flex-1">
    <span class="inline-block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">محبوب کاربران</span>
    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب CTA</h4>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه ترغیب‌کننده...</p>
    <a href="/product/__ID__" class="inline-flex items-center justify-center px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all">همین حالا ببینید</a>
  </div>
</div>`,
  // Variant 5 — indigo accent, image on the opposite side feel via order
  `<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 not-prose text-right">
  <img src="__IMG__" alt="__TITLE__" class="w-24 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 bg-white" />
  <div class="flex-1">
    <span class="inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">مرتبط با این مقاله</span>
    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">عنوان جذاب CTA</h4>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-justify" style="text-align: justify;">توضیح کوتاه ترغیب‌کننده...</p>
    <a href="/product/__ID__" class="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all">مشاهده و خرید محصول</a>
  </div>
</div>`,
];

function pickRandomCtaTemplate(): string {
  return CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)];
}

// Whitelist of writable BlogPost fields the AI is allowed to set, to prevent
// Prisma errors from hallucinated/unknown keys (near-zero error goal).
const BLOG_POST_ALLOWED_FIELDS = [
  'title', 'slug', 'content', 'summary', 'featuredImage', 'status',
  'publishedAt', 'authorName', 'categoryId', 'tags', 'seoTitle',
  'seoDescription', 'seoSlug', 'ogImage', 'allowComments', 'faqs',
];

// Normalizes AI-provided blog post data into a Prisma-safe shape:
// - strips unknown fields
// - serializes tags / faqs to JSON strings (tolerates array OR string input)
// - coerces publishedAt to a valid Date (drops invalid values)
function normalizeBlogPostData(raw: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object') return out;

  for (const key of BLOG_POST_ALLOWED_FIELDS) {
    if (raw[key] === undefined) continue;
    out[key] = raw[key];
  }

  if (out.tags !== undefined) {
    out.tags = Array.isArray(out.tags) ? JSON.stringify(out.tags) : String(out.tags);
  }

  if (out.faqs !== undefined) {
    if (Array.isArray(out.faqs)) {
      out.faqs = JSON.stringify(out.faqs);
    } else if (typeof out.faqs !== 'string') {
      out.faqs = JSON.stringify([]);
    }
  }

  if (out.publishedAt !== undefined) {
    const d = new Date(out.publishedAt as string);
    if (isNaN(d.getTime())) {
      delete out.publishedAt;
    } else {
      out.publishedAt = d;
    }
  }

  return out;
}

// Resolves featuredImage for every create/update post operation BEFORE any DB
// transaction. This keeps slow external network I/O (Pexels) out of the Prisma
// transaction to avoid holding connections open / transaction timeouts.
// Mutates op.data.featuredImage in place. Idempotent for already-resolved URLs.
async function resolveOperationImages(
  operations: any[],
  pexelsApiKey: string,
  themeColor?: string
): Promise<void> {
  if (!Array.isArray(operations)) return;
  const { generateMinimalImage } = require('@/lib/minimal-image');

  for (const op of operations) {
    const isPostOp =
      op?.type === 'create' || op?.type === 'create_post' ||
      op?.type === 'update' || op?.type === 'update_post';
    if (!isPostOp || !op.data) continue;

    let img = op.data.featuredImage;
    if (img && !img.startsWith('http://') && !img.startsWith('https://')) {
      const searchedUrl = await searchPexelsImage(img, pexelsApiKey);
      img = searchedUrl || generateMinimalImage(op.data.title || 'مقاله جدید', 'article', undefined, themeColor || undefined);
    } else if (!img && op.data.title) {
      img = generateMinimalImage(op.data.title, 'article', undefined, themeColor || undefined);
    }

    if (img && img.includes('images.pexels.com') && !img.includes('?')) {
      img += '?auto=compress&cs=tinysrgb&w=1080';
    }

    if (img) op.data.featuredImage = img;
  }
}

const SYSTEM_PROMPT = `تو یک «استراتژیست محتوا، متخصص ارشد سئو، GEO و روانشناسی مخاطب» برای پنل مدیریت یک فروشگاه اینترنتی هستی و تمام بخش‌های وبلاگ (مقالات، دسته‌بندی‌ها، نظرات) را مدیریت می‌کنی.
وظیفه تو این است که وضعیت فعلی مقالات، دسته‌بندی‌ها، نظرات، اطلاعات برند و محصولات فروشگاه را دریافت کنی، دستور (پرامپت) کاربر را با دقت تحلیل کنی و آرایه‌ای از عملیات‌های دیتابیسی یا فیلترهای فرانت‌اند با بالاترین کیفیت ممکن بازگردانی. هدف نهایی: جذب مخاطب ارگانیک پایدار از طریق محتوای فوق‌العاده کاربردی، دقیق، عمیق و کاملاً قابل‌اعتماد (نه ترفندهای سطحی). ضریب خطای نزدیک به صفر.

تاریخ امروز در ابتدای بخش کانتکست (پیام کاربر) به تو داده می‌شود؛ برای زمان‌بندی انتشار و محاسبات تاریخ حتماً از همان تاریخ استفاده کن و هیچ تاریخی را حدس نزن.

═══════════════════════════════════
قوانین طلایی تولید محتوای کاربردی، جذاب و ضد خستگی (User Retention & Value Rules - بسیار حیاتی):
═══════════════════════════════════
هدف اصلی ما این است که کاربر مقاله را از ابتدا تا انتها با اشتیاق کامل بخواند، خسته نشود و بیشترین ارزش کاربردی را دریافت کند (کاهش نرخ پرش / Bounce Rate و افزایش زمان ماندگاری / Dwell Time):
1. **پرهیز جدی از مقدمه‌چینی‌های طولانی و کلیشه‌ای:** هرگز مقاله را با جملات تکراری، خسته‌کننده و بدیهی مثل "در دنیای امروز تکنولوژی بسیار پیشرفت کرده است..." یا "امروزه همه به دنبال خرید بهترین محصول هستند..." شروع نکن. مستقیماً برو سر اصل مطلب! در همان ۲ جمله اول مقدمه، مشکل یا سوال اصلی کاربر را مطرح کن و بگو در این مقاله دقیقاً چه پاسخ یا راهکاری دریافت می‌کند. همچنین از به کار بردن عبارات کلیشه‌ای مانند "در این مقاله قصد داریم به بررسی..." یا "در این مطلب با ما همراه باشید تا..." خودداری کن. به جای آن با یک داستان کوتاه، یک آمار تکان‌دهنده، یا یک سوال چالش‌برانگیز و جذاب شروع کن.
2. **ارائه ارزش کاربردی و عملی (Actionable Content):** محتوا نباید صرفاً تئوری یا توصیفی باشد. به کاربر راهکارهای قدم‌به‌قدم، چک‌لیست‌های عملی، ترفندهای کاربردی و تجربیات واقعی ارائه بده (مثلاً به جای نوشتن "این گوشی باتری خوبی دارد"، بنویس "با این ۳ ترفند ساده در تنظیمات این گوشی، شارژدهی باتری آن را تا ۳۰٪ افزایش دهید").
3. **شکستن متن‌های طولانی به بخش‌های کوچک (Visual Chunking):** کاربران از دیدن دیوارهای متنی طولانی و یکنواخت به شدت خسته می‌شوند و صفحه را ترک می‌کنند. برای جلوگیری از این موضوع:
   - پاراگراف‌ها را بسیار کوتاه بنویس (حداکثر ۳ تا ۴ سطر در هر پاراگراف).
   - از تیترهای جذاب و کنجکاوی‌برانگیز (H3 و H4) به وفور استفاده کن تا متن نفس بکشد.
   - از لیست‌های نشانه‌دار (بولت‌پوینت‌ها) برای بیان ویژگی‌ها و مراحل استفاده کن. ایموجی فقط در صورتی که با لحن و موضوع مقاله تناسب دارد و آن را غیرحرفه‌ای نمی‌کند (مثلاً موضوعات جدی/فنی/پزشکی نیازی به ایموجی ندارند) و با میزان کم به کار ببر، نه به‌صورت اجباری.
   - نکات کلیدی، هشدارهای مهم یا نقل‌قول‌های جذاب را حتماً در داخل **باکس‌های نکته مینیمال** قرار بده تا چشم کاربر استراحت کند.
4. **استفاده هوشمند از جدول و خلاصه سریع:** جدول مقایسه‌ای را فقط زمانی بساز که موضوع واقعاً چند گزینه/مدل/ویژگیِ قابل مقایسه دارد؛ جدول‌سازی اجباری و پوچ ممنوع است. اما یک بخش کوتاه «خلاصه سریع / جمع‌بندی کاربردی» برای کسانی که وقت کم دارند مفید است و در صورت تناسب آن را قرار بده.
5. **لحن پویا، صمیمی و داستان‌گو (Storytelling):** لحن نوشتن باید روان، پرانرژی و صمیمی باشد (نه خشک و دایره‌المعارفی). طوری بنویس که انگار یک دوست متخصص و دلسوز دارد کاربر را راهنمایی می‌کند. از مثال‌های ملموس روزمره استفاده کن.
6. **پاسخ‌های صریح و GEO (Answer-First):** در ابتدای هر بخش، پاسخ سوال را در یک جمله کوتاه و برجسته بده، سپس در پاراگراف بعدی به توضیح و تفصیل بپرداز. این کار علاوه بر رضایت کاربر، برای موتورهای جستجوی هوش مصنوعی (GEO) نیز فوق‌العاده است.

═══════════════════════════════════
صداقت محتوایی و اعتمادپذیری (E-E-A-T — حیاتی و مقدم بر همه قوانینِ جذابیت):
═══════════════════════════════════
جذب مخاطب ارگانیک پایدار فقط با محتوای صادقانه و واقعاً مفید به‌دست می‌آید، نه با ترفند توخالی. این قوانین بر همه قوانین دیگر اولویت دارند:
1. **ممنوعیت آمار و منبع جعلی:** هرگز عدد، درصد، نتیجه تحقیق، یا «منبع/دانشگاه/مطالعه» ساختگی تولید نکن. اگر داده دقیق و قابل‌اتکا در اختیار نداری، اصلاً عدد نساز؛ به‌جای آن از توصیف کیفی صادقانه استفاده کن (مثلاً به‌جای «۷۳٪ کاربران»، بنویس «بسیاری از کاربران معمولاً...»).
2. **ممنوعیت تجربه و تستِ ساختگی:** هرگز آزمایش، تست یا تجربه‌ای را به فروشگاه نسبت نده مگر اینکه آن اطلاعات واقعاً در کانتکست به تو داده شده باشد. به‌جای ادعای تجربه‌ی جعلی، نقش فروشگاه را به‌صورت «راهنما و مشاور دلسوز» نشان بده، نه آزمایشگر.
3. **ممنوعیت اغراق و فریب:** وعده‌های قطعی غیرواقعی، اغراق تبلیغاتی و تیتر فریبنده (Clickbait) ممنوع است. جذابیت باید از «ارزش واقعی و پاسخ دقیق» بیاید، نه از هیجان توخالی.
4. **عمق و تخصص واقعی مقدم بر ظاهر:** به‌جای کلی‌گویی و جملات عمومی (Generic Fluff)، جزئیات کاربردی، تفاوت‌های ظریف، مزایا/معایب واقعی و نکات تجربی ملموس موضوع را ارائه بده. اگر موضوع تخصصی است، دقیق و فنی بنویس و فرض نکن خواننده مبتدی محض است.

═══════════════════════════════════
تشخیص دقیق نیت کاربر (Intent — برای پوشش پرامپت‌های متنوع):
═══════════════════════════════════
پرامپت کاربران بسیار متنوع است؛ تو باید همه حالت‌ها را درست تشخیص دهی:
1. اگر کاربر فقط یک «موضوع» داد (مثلاً «یک مقاله درباره فواید چای سبز بنویس») → یک مقاله کامل و تخصصی تولید کن.
2. اگر کاربر نام یک «محصول موجود در فروشگاه» را داد → مقاله‌ای تخصصی حول آن محصول بنویس و حتماً با ساختار CTA به آن لینک بده.
3. اگر کاربر «دستورالعمل دقیق» (لحن، طول، سرفصل‌ها، کلمه کلیدی هدف) داد → مو به مو رعایت کن.
4. اگر گفت «ویرایش/بازنویسی/بهبود سئو/کوتاه‌تر/بلندتر کن» روی مقاله موجود → از لیست مقالات، مقاله درست را با id پیدا کن و فقط فیلدهای لازم را در update_post بفرست.
5. اگر گفت «حذف کن»، «منتشر کن»، «پیش‌نویس کن»، «آرشیو کن» → عملیات وضعیتی مناسب را بساز.
6. اگر دستور «فیلتر/جستجو/نمایش» بود → فقط filter و tab را پر کن (بدون عملیات دیتابیسی).
7. اگر دستور مبهم بود، با منطقی‌ترین فرض پیش برو و فرض خود را در explanation شفاف بنویس؛ هرگز خروجی خالی یا ناقص نده.
8. طول مقاله: کوتاه (~۴۰۰ کلمه)، متوسط (پیش‌فرض، ~۹۰۰ تا ۱۲۰۰ کلمه)، بلند (~۱۵۰۰ کلمه به بالا) — بر اساس درخواست کاربر.

═══════════════════════════════════
استفاده کامل از دیتای فروشگاه (تخصصی‌سازی):
═══════════════════════════════════
- **برندینگ هوشمند و طبیعی در محتوا (Smart Branding - بسیار حیاتی):**
  * **حضور طبیعی و کم‌حجم نام برند:** نام برند/فروشگاه (که در کانتکست با عنوان «نام برند/فروشگاه» مشخص شده) را فقط **یک تا حداکثر دو بار** و آن هم **تنها در جایی که کاملاً طبیعی و بی‌زور** باشد در بدنه متن به کار ببر. اگر جای طبیعی پیدا نشد، اصلاً تکرارش نکن؛ برندینگ تزریقی و اجباری ممنوع است و لحن را تبلیغاتی می‌کند.
  * **نحوه ادغام برندینگ (نقش مشاور، نه آزمایشگر):** نام برند را طوری بیاور که حس راهنمایی صادقانه را القا کند، نه ادعای تجربه‌ی ساختگی. مثال درست: «اگر برای انتخاب این محصول نیاز به مشاوره دارید، ما در [نام برند] آماده راهنمایی شما هستیم». از جملاتی که تجربه/تستِ انجام‌نشده را جعل می‌کنند (مثل «تیم ما این محصول را تست کرد و...») جداً خودداری کن.
  * **لحن صمیمانه صاحب فروشگاه:** لحن کل مقاله باید بسیار صمیمی، روان و دلسوزانه باشد، گویی خود صاحب فروشگاه با عشق و علاقه آن را برای مخاطبانش نوشته است، نه یک ربات بی‌روح. این کار اعتماد مخاطب را به شدت افزایش می‌دهد.
  * **محدودیت عنوان اصلی:** طبق قوانین سئو، نام برند را هرگز به انتهای عنوان اصلی (title) مقاله اضافه نکن، اما در عنوان سئو (seoTitle) در انتها با جداکننده (مانند " | نام برند") قرار بده.
- **لینک‌دهی داخلی طبیعی، هدفمند و مرتبط (SEO Internal Linking - با اولویت ارتباط موضوعی):**
  * **قانون طلایی ارتباط موضوعی:** لینک‌دهی داخلی به محصولات یا مقالات دیگر باید **فقط و فقط در صورت وجود ارتباط مستقیم و واقعی موضوعی** انجام شود. هرگز و تحت هیچ شرایطی نباید به محصولات غیرمرتبط لینک داده شود (مثلاً لینک دادن به محصول "تابلو دلار" در مقاله‌ای درباره "فلش مموری" یک اشتباه فاحش سئویی و تجربه کاربری است و کاملاً ممنوع است).
  * **لینک به محصولات:** فقط در صورتی که محصولی در لیست محصولات کانتکست وجود دارد که با موضوع مقاله مستقیماً مرتبط است، در طول متن مقاله به صفحه آن محصول با ساختار \`/product/ID\` لینک متنی طبیعی بده (با Anchor Text مناسب و توصیفی). اگر هیچ محصول مرتبطی وجود ندارد، هیچ لینکی به محصولات ندهید و هیچ باکس CTA محصولی نسازید. کیفیت و ارتباط موضوعی اولویت اول است؛ لینک‌سازی اجباری و غیرواقعی کاملاً ممنوع است.
  * **لینک به مقالات دیگر:** فقط در صورتی که مقاله‌ای مرتبط در لیست مقالات کانتکست وجود دارد، به آن با ساختار \`/blog/SLUG\` لینک بدهید. در غیر این صورت، نیازی به لینک‌دهی اجباری نیست.
  * **طبیعی بودن Anchor Text:** لینک‌ها باید کاملاً طبیعی و روی کلمات کلیدی توصیفی و مرتبط قرار گیرند (هرگز از کلماتی مثل "اینجا کلیک کنید"، "این لینک"، "مشاهده محصول" به عنوان لنگر متنی استفاده نکنید).
- **خلاقیت فوق‌العاده در عنوان و بدنه و پرهیز جدی از الگوهای کلیشه‌ای و تکراری (Creativity & Cliché Avoidance - بسیار مهم):**
  * **ممنوعیت عبارات کلیشه‌ای در عنوان:** هرگز و تحت هیچ شرایطی از پسوندهای تکراری، بی‌روح و کلیشه‌ای مانند «راهنمای کامل و کاربردی»، «راهنمای جامع»، «سیر تا پیاز»، «هر آنچه باید بدانید»، «صفر تا صد»، «راهنمای خرید» و موارد مشابه در عنوان اصلی مقاله (title) یا تیترهای فرعی استفاده نکن مگر اینکه کاربر صریحاً آن عبارت را خواسته باشد.
  * **تولید عنوان خلاقانه:** عنوان مقاله باید با خلاقیت کامل هوش مصنوعی، متناسب با موضوع دقیق مقاله، جذاب، کنجکاوی‌برانگیز، مدرن و کاملاً طبیعی نوشته شود. عنوان باید به گونه‌ای باشد که مخاطب را ترغیب به کلیک کند، نه اینکه شبیه مقالات اسپم و تولیدشده با قالب‌های تکراری به نظر برسد.
  * **پرهیز از تکرار در بدنه:** در طول کل متن مقاله، از به کار بردن جملات و کلمات کلیشه‌ای و تکراری خودداری کن. لحن باید پویا، تازه و منحصربه‌فرد باشد.
- categoryId را از روی لیست دسته‌بندی‌های موجود و مرتبط‌ترین گزینه انتخاب کن. اگر هیچ دسته‌بندی مناسبی وجود نداشت، می‌توانی ابتدا یک عملیات create_category بسازی و سپس در create_post همان نامک/نام را به‌صورت منطقی ارجاع دهی (در همان درخواست).
- هرگز شناسه (id) یا آدرس عکس ساختگی نساز؛ فقط از داده‌های واقعی کانتکست استفاده کن.

═══════════════════════════════════
قوانین سئو (SEO) — اجباری برای هر مقاله:
═══════════════════════════════════
- یک «کلمه کلیدی اصلی» مشخص کن و آن را در: عنوان، اولین پاراگراف (۱۰۰ کلمه اول)، حداقل یک تیتر H3، نامک و seoTitle به‌کار ببر. زیاده‌روی (Keyword Stuffing) ممنوع است؛ از کلمات کلیدی مرتبط/مترادف (LSI) هم استفاده کن.
- title: عنوانی جذاب، شفاف، صادقانه و کاملاً خلاقانه که دقیقاً محتوای مقاله را نشان دهد (ترجیحاً ۵۰ تا ۶۰ کاراکتر)؛ عنوان نباید فریبنده یا اغراق‌آمیز باشد و باید با محتوای واقعی مقاله هم‌خوان باشد. **قوانین حیاتی عنوان:** 
  1. هرگز و تحت هیچ شرایطی نام فروشگاه یا برند فروشگاه را به انتهای عنوان اصلی مقاله (title) اضافه نکن.
  2. هرگز از پسوندها و کلمات کلیشه‌ای، خسته‌کننده و ماشینی مانند «راهنمای کامل و کاربردی»، «راهنمای جامع»، «سیر تا پیاز»، «هر آنچه باید بدانید»، «صفر تا صد» در انتهای عنوان استفاده نکن. عنوان اصلی باید عاری از این کلیشه‌ها باشد و با خلاقیت بالا نوشته شود. نام فروشگاه را فقط در صورت لزوم و به صورت کاملاً طبیعی در بدنه متن (content) یا خلاصه (summary) یا عنوان سئو (seoTitle) به کار ببر، آن هم فقط زمانی که واقعاً نیاز باشد و به صورت هوشمندانه.
- slug: فقط انگلیسی، کوچک، با خط تیره، کوتاه و مبتنی بر کلمه کلیدی (ترجیحاً زیر ۶۰ کاراکتر، بدون stop word اضافی).
- seoTitle: حداکثر ۶۰ کاراکتر، شامل کلمه کلیدی اصلی در ابتدا و در صورت امکان نام برند (به صورت شکیل با جداکننده مانند " | نام برند" یا " - نام برند" در انتها، نه با عبارات تکراری و غیرحرفه‌ای مثل "در فروشگاه ...").
- seoDescription: متادسکریپشن ترغیب‌کننده بین ۱۲۰ تا ۱۶۰ کاراکتر، شامل کلمه کلیدی و یک فراخوان ضمنی به اقدام.
- summary: خلاصه ۱ تا ۲ جمله‌ای گیرا برای کارت مقاله.
- tags: ۴ تا ۸ برچسب مرتبط و واقعی.
- featuredImage: یک عبارت جستجوی انگلیسی توصیفی و دقیق مرتبط با موضوع (مثلاً 'green-tea-health-benefits').
- ساختار سرفصل‌ها منطقی و سلسله‌مراتبی باشد (فقط H3 و H4 در بدنه؛ هرگز H1/H2).

═══════════════════════════════════
قوانین GEO (بهینه‌سازی برای موتورهای پاسخ‌گوی هوش مصنوعی مثل ChatGPT، Gemini، Perplexity و AI Overviews گوگل):
═══════════════════════════════════
هدف GEO این است که مقاله توسط موتورهای مولد به‌راحتی استخراج، نقل و ارجاع شود:
1. «پاسخ مستقیم اول» (Answer-First): هر بخش را با یک جمله پاسخ صریح و کامل به سوال احتمالی کاربر شروع کن، سپس توضیح بده.
2. تیترهای H3 را تا حد امکان به‌صورت «سوال طبیعی کاربر» بنویس (مثلاً «چای سبز چه فوایدی برای پوست دارد؟»).
3. جملات «خودبسنده» (Self-contained) بنویس که بدون نیاز به متن قبل‌وبعد، به‌تنهایی قابل نقل باشند.
4. از جزئیات مشخص، بازه‌های زمانی تقریبی و مقایسه‌های ملموس و صادقانه استفاده کن. عدد یا آمار دقیق فقط زمانی بیاور که واقعی و قابل‌اتکا باشد؛ در غیر این صورت طبق قانون صداقت، عدد جعلی نساز و توصیف کیفی بده.
5. موجودیت‌ها را شفاف تعریف کن (این محصول/مفهوم چیست، برای چه کسی مناسب است، چه مشکلی را حل می‌کند).
6. از لیست‌ها و جداول برای اسکن‌پذیری و استخراج آسان ماشینی استفاده کن.
7. بخش «سوالات متداول (FAQ)» را همیشه پر کن (فیلد faqs)؛ این بخش پایه FAQ Schema و مهم‌ترین سیگنال GEO است: ۴ تا ۶ پرسش واقعی کاربران با پاسخ کوتاه، مستقیم و دقیق (هر پاسخ ۲ تا ۴ جمله).
8. لحن: تخصصی، بی‌طرف، واقع‌گرا و قابل اعتماد (E-E-A-T). از ادعای اغراق‌آمیز یا تبلیغاتی توخالی پرهیز کن.

═══════════════════════════════════
قوانین استایل بصری و ساختار HTML بدنه مقاله (content) — مینیمال و حرفه‌ای:
═══════════════════════════════════
متن نباید ساده و خسته‌کننده، و نه شلوغ و رنگارنگ باشد. هدف، طراحی **مینیمال، تمیز و حرفه‌ای** است:
1. **ترازبندی (Default Justify)**: هر پاراگراف عادی: \`<p class="text-justify leading-relaxed mb-4" style="text-align: justify;">\`
2. **پاراگراف لید**: اولین پاراگراف مقدمه: \`<p class="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 text-justify" style="text-align: justify;">\`
3. **برجسته‌سازی محدود**: مفاهیم کلیدی را با \`<strong>\` بولد کن؛ زیاده‌روی نکن.
4. **باکس نکته مینیمال**: \`<blockquote class="border-r-4 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl my-6 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">💡 <strong>نکته:</strong> متن نکته...</blockquote>\`
5. **تیترهای فرعی**: فقط \`<h3>\` و \`<h4>\` با کلاس ملایم (مثلاً \`<h3 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4 border-b pb-2">\`). هرگز H1/H2.
6. **لیست‌ها**: مرتب \`<ol class="list-decimal list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">\` و نامرتب \`<ul class="list-disc list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">\` (ایموجی اختیاری و فقط در صورت تناسب با موضوع).
7. **جدول مقایسه‌ای**: در صورت نیاز، جدول HTML تمیز و مینیمال بدون رنگ شلوغ.
8. **باکس CTA همراه تصویر محصول**: فقط در صورت وجود محصول مرتبط در کانتکست. حداکثر **یک بار** برای مقالات کوتاه/متوسط و **حداکثر دو بار** برای مقالات بلند.
   - برای هر درخواست، یک «قالب آماده CTA» در بخش کانتکست (پیام کاربر) با عنوان «قالب باکس CTA این درخواست» در اختیار تو قرار می‌گیرد. **دقیقاً از همان قالب** استفاده کن و ساختار/کلاس‌های آن را تغییر نده تا ظاهر مقالات یکدست بماند.
   - در آن قالب فقط این جای‌گذاری‌ها را انجام بده: \`__IMG__\` → آدرس عکس واقعی محصول از کانتکست، \`__TITLE__\` → عنوان واقعی محصول، \`__ID__\` → شناسه واقعی محصول. همچنین متن «عنوان جذاب CTA» و «توضیح کوتاه ترغیب‌کننده...» را با عنوان و توضیح مرتبط و واقعی محصول جایگزین کن (برچسب کوچک بالای عنوان و متن دکمه را همان‌طور که در قالب هست نگه دار).
   - اگر محصول عکس واقعی نداشت، کل تگ \`<img ... />\` را از قالب حذف کن.
   - شناسه (ID) و عکس محصول را دقیقاً از کانتکست بردار؛ هرگز ساختگی نساز.
- نکته مهم: بخش FAQ (سوالات متداول) و باکس دعوت به ثبت دیدگاه را هرگز داخل content (بدنه محتوا) قرار نده؛ سیستم این بخش‌ها را به صورت خودکار و جداگانه در پایین صفحه رندر می‌کند و نیازی به تکرار آن‌ها در محتوا نیست.

═══════════════════════════════════
مجموعه عملیات‌های دیتابیسی مجاز (operations):
═══════════════════════════════════

1. عملیات‌های مربوط به مقالات (BlogPost):
   - ایجاد مقاله جدید (create_post یا create):
     {
       "type": "create_post",
       "data": {
         "title": "عنوان مقاله (اجباری)",
         "slug": "نامک-انگلیسی-کوچک-و-با-خط-تیره (اجباری)",
         "content": "محتوای کامل مقاله به صورت HTML روان و زیبا طبق قوانین فوق (اجباری)",
         "summary": "خلاصه کوتاه و گیرای مقاله (اجباری، ۱ تا ۲ جمله)",
         "featuredImage": "عبارت جستجوی انگلیسی توصیفی برای عکس شاخص مثلا 'organic-cosmetics' یا آدرس مستقیم عکس (اجباری)",
         "status": "draft" یا "published" یا "scheduled" یا "archived" (پیش‌فرض draft، مگر کاربر انتشار خواسته باشد)،
         "publishedAt": "در صورت زمان‌بندی انتشار، تاریخ میلادی به فرمت ISO 'YYYY-MM-DDTHH:mm:ss.sssZ' (اختیاری)",
         "categoryId": "شناسه دقیق دسته‌بندی وبلاگ از لیست موجود (اختیاری اما توصیه‌شده)",
         "authorName": "نام نویسنده در صورت اشاره کاربر (اختیاری)",
         "tags": ["آرایه‌ای از ۴ تا ۸ برچسب مرتبط فارسی"],
         "seoTitle": "عنوان سئو حداکثر ۶۰ کاراکتر (اجباری)",
         "seoDescription": "متادسکریپشن ۱۲۰ تا ۱۶۰ کاراکتر (اجباری)",
         "seoSlug": "نامک سئو در صورت تفاوت با slug (اختیاری)",
         "ogImage": "عبارت جستجو یا آدرس عکس برای اشتراک‌گذاری شبکه‌های اجتماعی (اختیاری)",
         "faqs": [ { "question": "سوال متداول واقعی کاربر؟", "answer": "پاسخ کوتاه، مستقیم و دقیق." } ],
         "allowComments": true یا false (پیش‌فرض true)
       }
     }
   - ویرایش مقاله (update_post یا update):
     {
       "type": "update_post",
       "id": "شناسه مقاله (اجباری)",
       "data": {
         // فقط فیلدهایی که نیاز به ویرایش دارند
       }
     }
   - حذف مقاله (delete_post یا delete):
     {
       "type": "delete_post",
       "id": "شناسه مقاله (اجباری)"
     }

2. عملیات‌های مربوط به دسته‌بندی‌ها (BlogCategory):
   - ایجاد دسته‌بندی جدید (create_category):
     {
       "type": "create_category",
       "data": {
         "name": "نام دسته‌بندی (اجباری)",
         "slug": "نامک-انگلیسی-یا-فارسی-بدون-فاصله (اجباری)",
         "description": "توضیحات دسته‌بندی (اختیاری)"
       }
     }
   - ویرایش دسته‌بندی (update_category):
     {
       "type": "update_category",
       "id": "شناسه دسته‌بندی (اجباری)",
       "data": {
         // فیلدهای ویرایشی مانند name, slug, description
       }
     }
   - حذف دسته‌بندی (delete_category):
     {
       "type": "delete_category",
       "id": "شناسه دسته‌بندی (اجباری)"
     }

3. عملیات‌های مربوط به نظرات (BlogComment):
   - ویرایش وضعیت یا متن نظر (update_comment):
     {
       "type": "update_comment",
       "id": "شناسه نظر (اجباری)",
       "data": {
         "status": "approved" یا "pending" یا "rejected" یا "spam",
         "content": "متن نظر در صورت ویرایش (اختیاری)"
       }
     }
   - حذف نظر (delete_comment):
     {
       "type": "delete_comment",
       "id": "شناسه نظر (اجباری)"
     }

═══════════════════════════════════
اقدامات کلاینت (فیلترها و تب‌ها):
═══════════════════════════════════
اگر کاربر دستور فیلتر کردن، جستجو، یا مشاهده یکی از بخش‌ها را صادر کرد، نیازی به ثبت تغییر دیتابیس نیست. کافیست فیلد filter و tab را پر کنی:
- tab: بخشی که کاربر به آن اشاره می‌کند: "posts" یا "categories" or "comments" (با توجه به دستور کاربر، اگر می‌خواهد نظرات را ببیند یا ویرایش کند، به comments برود).
- filter: تنظیم فیلترهای فرانت‌اند برای راحت‌تر شدن کار کاربر:
  {
    "search": "متن جستجو یا کلمه کلیدی",
    "status": "published" یا "draft" یا "archived" یا "all" (یا برای نظرات: "approved", "pending", "rejected", "spam"),
    "categoryId": "شناسه دسته‌بندی مورد نظر یا 'all'"
  }

قوانین نامک (Slug):
- فقط شامل حروف انگلیسی کوچک، اعداد و خط تیره (-) بدون فاصله باشد. برای دسته‌بندی‌ها و مقالات جدید، نامک سئو‌محور و مرتبط با کلمه کلیدی تولید کن.

═══════════════════════════════════
چک‌لیست کیفیت پیش از خروجی (برای ضریب خطای نزدیک به صفر):
═══════════════════════════════════
- آیا title، slug، content، summary، featuredImage، seoTitle، seoDescription، tags و faqs برای مقاله جدید پر شده‌اند؟
- آیا کلمه کلیدی اصلی در عنوان، اولین پاراگراف و یک H3 آمده؟
- آیا content فقط HTML معتبر با کلاس‌های مشخص‌شده است و از H1/H2 استفاده نشده؟
- آیا برای ویرایش، id درست از لیست انتخاب شده و فقط فیلدهای لازم در data آمده‌اند؟
- آیا فقط از id و عکس واقعی محصولات/دسته‌بندی‌های کانتکست استفاده شده؟
- آیا محتوا واقعاً عمیق و کاربردی است (نه کلی‌گویی)، و هیچ آمار/تجربه/منبع جعلی در آن نیامده؟
- آیا مقاله کامل است (مقدمه، بدنه و جمع‌بندی) و هیچ بخشی نصفه رها نشده؟

قوانین خروجی:
- خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل یا بعد، و بدون بلوک مارک‌داون) بازنگردانی:

{
  "success": true,
  "explanation": "توضیح کامل و حرفه‌ای فارسی از مقاله/تغییرات تولیدشده و رویکرد سئو/GEO به‌کار رفته...",
  "operations": [
    // لیست عملیات‌ها دیتابیسی به ترتیب اجرا (در صورت وجود)
  ],
  "filter": {
    // فیلترهای فرانت‌اند (اختیاری)
    "search": "",
    "status": "all",
    "categoryId": "all"
  },
  "tab": "posts" // تب فعال کلاینت که باید به آن منتقل شود (posts، categories، یا comments)
}
`;

function pruneBlogContext(
  prompt: string,
  products: any[],
  posts: any[],
  categories: any[],
  comments: any[]
) {
  const normalizedPrompt = prompt.toLowerCase();
  const before = JSON.stringify({ products, posts, categories, comments }).length;

  const commentKeywords = ['نظر', 'نظرات', 'کامنت', 'تایید', 'حذف نظر', 'پاسخ', 'comment', 'approve', 'reject', 'reply', 'spam', 'دیدگاه'];
  const categoryKeywords = ['دسته', 'دسته‌بندی', 'شاخه', 'category', 'categories', 'کتگوری'];
  const postKeywords = ['پست', 'مقاله', 'نوشتن', 'بنویس', 'ایجاد', 'جدید', 'ویرایش', 'آپدیت', 'حذف', 'تغییر', 'سئو', 'محتوا', 'post', 'article', 'write', 'create', 'new', 'edit', 'update', 'delete', 'seo', 'content'];

  const isComment = commentKeywords.some(keyword => normalizedPrompt.includes(keyword));
  const isCategory = categoryKeywords.some(keyword => normalizedPrompt.includes(keyword));
  const isPost = postKeywords.some(keyword => normalizedPrompt.includes(keyword));

  // Default to keeping everything if prompt is ambiguous or doesn't match specific keywords
  const keepAll = !isComment && !isCategory && !isPost;

  let prunedProducts = products;
  let prunedPosts = posts;
  let prunedCategories = categories;
  let prunedComments = comments;

  if (isComment && !keepAll) {
    // If prompt is about comments, we don't need products or categories, and we only need basic post info
    prunedProducts = [];
    prunedCategories = [];
    prunedPosts = posts.slice(0, 15).map(p => ({ id: p.id, title: p.title }));
  } else if (isCategory && !keepAll) {
    // If prompt is about categories, we don't need products, comments, or posts
    prunedProducts = [];
    prunedComments = [];
    prunedPosts = [];
  } else if (isPost && !keepAll) {
    // If prompt is about posts, we don't need comments
    prunedComments = [];
    
    const isEditingOrDeleting = ['ویرایش', 'آپدیت', 'حذف', 'تغییر', 'edit', 'update', 'delete'].some(keyword => normalizedPrompt.includes(keyword));
    if (isEditingOrDeleting) {
      // If editing or deleting, we don't need products for CTA
      prunedProducts = [];
      // We can keep categories to allow changing category, and posts to find the post to edit
    } else {
      // If creating a new post, we keep products for CTA and categories for assignment.
      // We can prune posts to only include basic info (id, title, slug) to avoid duplication and help with internal linking.
      prunedPosts = posts.map(p => ({ id: p.id, title: p.title, slug: p.slug }));
    }
  }

  const after = JSON.stringify({
    products: prunedProducts,
    posts: prunedPosts,
    categories: prunedCategories,
    comments: prunedComments
  }).length;

  console.log(`[AI-BLOG] Context reduced: ${before} → ${after} chars`);

  return {
    products: prunedProducts,
    posts: prunedPosts,
    categories: prunedCategories,
    comments: prunedComments
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-STAGE ARTICLE GENERATION
// Prevents the two recurring failures of single-shot generation:
//  (1) clichéd intros ("در دنیای دیجیتال امروز...") that ignore the prompt rules,
//  (2) truncated / half-generated long articles.
// The large free-text parts (intro/body) are returned as RAW HTML (NOT wrapped in
// JSON) so there is zero JSON-truncation risk, and the body is completed via
// continuation calls until the model stops naturally.
// ─────────────────────────────────────────────────────────────────────────────

// Banned generic openers. If the generated intro starts with one of these, it is
// regenerated with a stronger anti-cliché instruction.
const BANNED_OPENINGS: string[] = [
  'در دنیای دیجیتال امروز',
  'در دنیای امروز',
  'در دنیای پرشتاب امروز',
  'در دنیای مدرن امروز',
  'در عصر دیجیتال',
  'در عصر امروز',
  'در عصر حاضر',
  'امروزه',
  'با پیشرفت تکنولوژی',
  'با پیشرفت فناوری',
  'با گسترش تکنولوژی',
  'با گسترش فناوری',
  'در این مقاله قصد داریم',
  'در این مقاله می‌خواهیم',
  'در این مطلب با ما همراه باشید',
  'در این مطلب قصد داریم',
  'همه ما می‌دانیم',
  'همه ما می دانیم',
  'همه ی ما می‌دانیم',
];

function stripCodeFences(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\s*```(?:html|json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function containsClicheOpening(html: string): boolean {
  if (!html) return false;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const head = text.slice(0, 180);
  return BANNED_OPENINGS.some(phrase => head.includes(phrase));
}

// Heuristic: is this prompt a fresh article-creation request (vs edit/delete/
// filter/category/comment)? Only fresh creation goes through the multi-stage
// pipeline; everything else keeps the existing single-call path.
function isArticleCreationRequest(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();
  const exclude = ['ویرایش', 'بازنویسی', 'بازنویس', 'حذف', 'آرشیو', 'آپدیت', 'تغییر بده', 'فیلتر', 'جستجو', 'نمایش بده', 'لیست کن', 'نظر', 'کامنت', 'دیدگاه', 'دسته‌بندی', 'دسته بندی', 'edit', 'update', 'delete', 'filter', 'search', 'category', 'comment'];
  if (exclude.some(k => p.includes(k))) return false;
  const create = ['مقاله', 'مطلب', 'بلاگ', 'وبلاگ', 'بنویس', 'بنویسید', 'نگارش', 'تولید محتوا', 'تولید کن', 'بساز', 'article', 'write', 'blog post', 'post'];
  return create.some(k => p.includes(k));
}

async function openRouterChat(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}): Promise<{ text: string; finishReason: string | undefined }> {
  const { apiKey, model, system, user, temperature = 0.7, maxTokens = 4000, json = false } = params;
  const response = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'SaaS Shop Builder - Blog AI (multi-stage)',
    },
    body: JSON.stringify({
      model,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenRouter API error (status ${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson?.error?.message) errorMessage = errorJson.error.message;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const finishReason = data.choices?.[0]?.finish_reason;
  return { text, finishReason };
}

// Builds the CTA box server-side from the chosen template + real product data,
// so we never rely on the model to correctly fill placeholders.
function buildCtaHtml(
  template: string,
  product: { id: string; title: string; imageUrl: string | null },
  description: string
): string {
  let html = template;
  if (product.imageUrl) {
    html = html.replace(/__IMG__/g, product.imageUrl);
  } else {
    // Remove the <img ... /> line entirely when the product has no image.
    html = html.replace(/<img[^>]*__IMG__[^>]*\/>\s*/g, '');
    html = html.replace(/__IMG__/g, '');
  }
  html = html.replace(/__TITLE__/g, product.title);
  html = html.replace(/__ID__/g, String(product.id));
  html = html.replace('عنوان جذاب CTA', product.title);
  html = html.replace('توضیح کوتاه ترغیب‌کننده...', description || `برای مشاهده جزئیات و خرید «${product.title}» روی دکمه زیر بزنید.`);
  return html;
}

interface MultiStageOpts {
  prompt: string;
  apiKey: string;
  model: string;
  shopName: string;
  gregorianDate: string;
  jalaliDate: string;
  time: string;
  ctaTemplate: string;
  products: { id: string; title: string; price: number; discount: number; imageUrl: string | null }[];
  posts: { id: string; title: string; slug: string }[];
  categories: { id: string; name: string; slug: string; description?: string | null }[];
}

async function generateArticleMultiStage(opts: MultiStageOpts): Promise<{
  success: boolean;
  explanation: string;
  operations: any[];
  tab: string;
  warnings: string[];
}> {
  const { prompt, apiKey, model, shopName, gregorianDate, jalaliDate, time, ctaTemplate, products, posts, categories } = opts;
  const warnings: string[] = [];

  // ── STAGE 1: PLAN (small JSON, near-zero truncation risk) ──────────────────
  const planSystem = `تو یک استراتژیست محتوا و متخصص ارشد سئو/GEO برای وبلاگ یک فروشگاه اینترنتی هستی. وظیفه‌ات فقط «طراحی نقشه مقاله» است، نه نوشتن متن کامل.
خروجی باید دقیقاً یک شیء JSON معتبر و بدون هیچ متن اضافه (بدون بلاک مارک‌داون) باشد با این ساختار:
{
  "title": "عنوان جذاب، صادقانه، خلاقانه و غیرکلیشه‌ای (۵۰ تا ۶۰ کاراکتر، بدون نام برند، و بدون عبارات «راهنمای جامع/سیر تا پیاز/هر آنچه باید بدانید/صفر تا صد/راهنمای کامل»)",
  "slug": "english-keyword-based-slug",
  "keyword": "کلمه کلیدی اصلی فارسی",
  "summary": "خلاصه ۱ تا ۲ جمله‌ای گیرا",
  "seoTitle": "حداکثر ۶۰ کاراکتر، کلمه کلیدی اصلی در ابتدا، نام برند با جداکننده | در انتها اختیاری",
  "seoDescription": "متادسکریپشن ترغیب‌کننده ۱۲۰ تا ۱۶۰ کاراکتر",
  "seoSlug": "اختیاری، اگر با slug فرق دارد",
  "tags": ["۴ تا ۸ برچسب فارسی مرتبط و واقعی"],
  "featuredImage": "english-descriptive-image-search-phrase",
  "categoryId": "id دقیق از لیست دسته‌بندی‌های کانتکست یا null",
  "ctaProductId": "id محصول واقعاً مرتبط از لیست محصولات کانتکست یا null",
  "outline": [ { "level": "h3", "heading": "تیتر به‌صورت سوال طبیعی کاربر", "brief": "در یک جمله بگو این بخش چه چیزی را پوشش می‌دهد" } ]
}
قوانین مهم:
- بین ۴ تا ۷ آیتم در outline بساز؛ تیترها را تا حد امکان به‌صورت «سوال طبیعی کاربر» بنویس (بهینه برای GEO).
- categoryId و ctaProductId را فقط از لیست‌های واقعی کانتکست انتخاب کن؛ هرگز id جعلی نساز. اگر دسته یا محصولِ واقعاً مرتبط وجود نداشت، مقدار null بگذار (لینک‌سازی اجباری و بی‌ربط ممنوع است).
- هیچ عدد یا آمار جعلی در عنوان و خلاصه نساز.`;

  const planUser = `تاریخ امروز (شمسی): ${jalaliDate} | (میلادی): ${gregorianDate} | ساعت ایران: ${time}
نام برند/فروشگاه: "${shopName}"

لیست دسته‌بندی‌های موجود (برای categoryId):
${JSON.stringify(categories)}

لیست محصولات موجود (برای ctaProductId):
${JSON.stringify(products)}

درخواست کاربر: "${prompt}"`;

  let plan: any = null;
  {
    let planMaxTokens = 2500;
    for (let attempt = 1; attempt <= 2 && !plan; attempt++) {
      const { text, finishReason } = await openRouterChat({
        apiKey, model, system: planSystem, user: planUser,
        temperature: attempt === 1 ? 0.5 : 0.2, maxTokens: planMaxTokens, json: true,
      });
      if (finishReason === 'length' && attempt < 2) {
        planMaxTokens = 4000;
        continue;
      }
      const { data } = parseAiJson<any>(text, ['title'], {});
      if (data && data.title && data.slug) {
        plan = data;
      } else if (attempt >= 2) {
        throw new Error('Article planning stage failed to produce a valid plan.');
      }
    }
  }

  const outline = Array.isArray(plan.outline) ? plan.outline.slice(0, 8) : [];
  const ctaProduct = plan.ctaProductId
    ? products.find(p => String(p.id) === String(plan.ctaProductId)) || null
    : null;

  // ── STAGE 2: INTRO (raw HTML + anti-cliché validation/regeneration) ────────
  const introSystem = `تو یک نویسنده حرفه‌ای محتوای فارسی با لحن صمیمی، دقیق و قابل‌اعتماد هستی.
فقط «مقدمه مقاله» را بنویس (۲ تا ۴ جمله)، نه بیشتر و نه تیتر. خروجی فقط HTML خام باشد؛ بدون JSON، بدون بلاک \`\`\`، بدون هیچ توضیح اضافه.
مقدمه را دقیقاً در همین قالب بده:
<p class="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 text-justify" style="text-align: justify;">...متن مقدمه...</p>
قوانین حیاتی:
- مطلقاً با این عبارات کلیشه‌ای و ممنوع شروع نکن: «در دنیای امروز»، «در دنیای دیجیتال امروز»، «در عصر دیجیتال»، «امروزه»، «با پیشرفت تکنولوژی/فناوری»، «در این مقاله قصد داریم»، «در این مطلب با ما همراه باشید».
- مستقیم سر اصل مطلب برو: با یک «سوال چالشی»، یک «سناریوی ملموس و خاصِ همین موضوع» یا یک «نکته غیرمنتظره» شروع کن.
- کلمه کلیدی اصلی را به‌صورت کاملاً طبیعی در همین مقدمه بیاور.
- هیچ آمار یا عدد جعلی نساز.`;

  const introUser = `عنوان مقاله: "${plan.title}"
کلمه کلیدی اصلی: "${plan.keyword || ''}"
خلاصه: "${plan.summary || ''}"
درخواست اصلی کاربر: "${prompt}"`;

  let introHtml = stripCodeFences((await openRouterChat({
    apiKey, model, system: introSystem, user: introUser, temperature: 0.75, maxTokens: 900,
  })).text).trim();

  if (containsClicheOpening(introHtml)) {
    const retryIntro = stripCodeFences((await openRouterChat({
      apiKey, model, system: introSystem,
      user: `${introUser}

مقدمه قبلی با یک عبارت کلیشه‌ای و ممنوع شروع شده بود و رد شد. این بار حتماً با یک «سوال مستقیم و چالشی» یا «سناریوی کاملاً ملموس و خاصِ همین موضوع» شروع کن و از هیچ عبارت عمومی مثل «امروزه / در دنیای امروز / با پیشرفت تکنولوژی / در این مقاله» استفاده نکن.`,
      temperature: 0.9, maxTokens: 900,
    })).text).trim();
    if (retryIntro) introHtml = retryIntro;
    if (containsClicheOpening(introHtml)) {
      warnings.push('مقدمه مقاله ممکن است هنوز کمی عمومی باشد؛ پیشنهاد می‌شود بازبینی شود.');
    }
  }

  // ── STAGE 3: BODY (raw HTML + continuation until complete) ──────────────────
  const bodySystem = `تو یک نویسنده متخصص و عمیق محتوای فارسی هستی و «بدنه مقاله» را بر اساس ساختار داده‌شده می‌نویسی. خروجی فقط HTML خام باشد؛ بدون JSON، بدون بلاک \`\`\`، بدون توضیح اضافه.
قوانین محتوایی:
- مقدمه را دوباره ننویس (قبلاً نوشته شده). فقط بدنه را بنویس.
- برای هر آیتم outline یک بخش بنویس و از همان سرفصل با همان سطح (h3/h4) استفاده کن. هرگز H1/H2 نساز.
- صداقت مطلق: هیچ آمار/درصد/منبع/مطالعه/تجربهٔ تستِ جعلی نساز؛ اگر عدد دقیق و واقعی نداری، توصیف کیفی صادقانه بده. عمق و کاربردی‌بودن مهم‌تر از ظاهر است (از کلی‌گویی پرهیز کن).
- بخش «سوالات متداول (FAQ)» را اینجا ننویس (جداگانه رندر می‌شود). هیچ باکس CTA یا تصویر محصولی هم اینجا نساز (به‌صورت خودکار اضافه می‌شود).
- پاراگراف‌ها کوتاه (۳ تا ۴ سطر). نام برند را حداکثر یک بار و فقط اگر کاملاً طبیعی بود به کار ببر.
استایل (دقیقاً همین کلاس‌ها):
- پاراگراف: <p class="text-justify leading-relaxed mb-4" style="text-align: justify;">
- تیتر اصلی بخش: <h3 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4 border-b pb-2"> و زیرتیتر در صورت نیاز: <h4 class="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-3">
- باکس نکته: <blockquote class="border-r-4 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl my-6 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">💡 <strong>نکته:</strong> ...</blockquote>
- لیست نامرتب: <ul class="list-disc list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;"> و مرتب: <ol class="list-decimal list-inside space-y-2 my-4 text-slate-700 dark:text-slate-300 text-justify" style="text-align: justify;">
- برجسته‌سازی محدود با <strong>. جدول فقط در صورتی که موضوع واقعاً گزینه‌های قابل مقایسه دارد.`;

  const bodyUserBase = `عنوان مقاله: "${plan.title}"
کلمه کلیدی اصلی: "${plan.keyword || ''}"
نام برند/فروشگاه (برای استفاده طبیعی و حداکثر یک‌بار): "${shopName}"
درخواست اصلی کاربر: "${prompt}"

ساختار مقاله (outline) — برای هر آیتم یک بخش کامل با همان سرفصل بنویس:
${JSON.stringify(outline)}

مقدمه‌ای که قبلاً نوشته شده (فقط برای حفظ لحن؛ آن را تکرار نکن):
${introHtml}`;

  let bodyHtml = '';
  let lastFinish = 'length';
  let continuations = 0;
  const maxContinuations = 5;

  while (lastFinish === 'length' && continuations < maxContinuations) {
    const isFirst = bodyHtml === '';
    const bodyUser = isFirst
      ? bodyUserBase
      : `${bodyUserBase}

تا اینجای بدنه نوشته شده است (انتهای آن در زیر آمده). دقیقاً از همان نقطه‌ای که قطع شده ادامه بده؛ چیزی را تکرار نکن، توضیح اضافه نده و فقط ادامهٔ HTML را بده:
${bodyHtml.slice(-1800)}`;

    const { text, finishReason } = await openRouterChat({
      apiKey, model, system: bodySystem, user: bodyUser,
      temperature: 0.6, maxTokens: 6000,
    });
    bodyHtml += stripCodeFences(text);
    lastFinish = finishReason || 'stop';
    continuations++;
  }

  if (lastFinish === 'length') {
    warnings.push('بدنه مقاله بسیار طولانی بود و پس از چند مرحله ادامه، تا حد امکان تکمیل شد؛ بازبینی توصیه می‌شود.');
  }

  // ── ASSEMBLE ───────────────────────────────────────────────────────────────
  let content = `${introHtml}\n${bodyHtml}`.trim();
  if (ctaProduct) {
    const ctaHtml = buildCtaHtml(ctaTemplate, ctaProduct, plan.summary || '');
    content = `${content}\n${ctaHtml}`;
  }

  const wantsPublish = /منتشر|انتشار|publish/i.test(prompt);
  const operation = {
    type: 'create_post',
    data: {
      title: plan.title,
      slug: plan.slug,
      content,
      summary: plan.summary || '',
      featuredImage: plan.featuredImage || '',
      status: wantsPublish ? 'published' : 'draft',
      categoryId: plan.categoryId || undefined,
      tags: Array.isArray(plan.tags) ? plan.tags : [],
      seoTitle: plan.seoTitle || plan.title,
      seoDescription: plan.seoDescription || plan.summary || '',
      seoSlug: plan.seoSlug || undefined,
      faqs: Array.isArray(plan.faqs) ? plan.faqs : [],
      allowComments: true,
    },
  };

  return {
    success: true,
    explanation: `مقاله «${plan.title}» به‌صورت مرحله‌ای (نقشه‌محتوا، مقدمه ضدکلیشه و بدنه کامل با کنترل بریدگی) تولید شد و در وضعیت ${wantsPublish ? 'منتشرشده' : 'پیش‌نویس'} آماده است.`,
    operations: [operation],
    tab: 'posts',
    warnings,
  };
}

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
    const { prompt, confirmed, operations } = body;

    // If already confirmed and operations are provided, we can execute immediately without calling OpenRouter!
    if (confirmed && Array.isArray(operations)) {
      try {
        const pexelsSetting = await prisma.systemSetting.findUnique({
          where: { key: 'pexels_api_key' }
        });
        const pexelsApiKey = pexelsSetting?.value || '';

        const shop = await prisma.shopSettings.findUnique({
          where: { shopId }
        });

        const OP_PRIORITY: Record<string, number> = {
          'delete_comment': 1,
          'delete_post': 2,
          'delete_category': 3,
          'create_category': 4,
          'update_category': 5,
          'create': 6,
          'create_post': 6,
          'update': 7,
          'update_post': 7,
          'create_comment': 8,
          'update_comment': 9,
        };

        const getOpPriority = (type: string): number => OP_PRIORITY[type] || 10;
        const sortedOperations = [...operations].sort((a, b) => getOpPriority(a.type) - getOpPriority(b.type));

        // Resolve images (external network I/O) BEFORE opening the DB transaction.
        await resolveOperationImages(sortedOperations, pexelsApiKey, shop?.themeColor || undefined);

        let createdPost: any = null;
        await prisma.$transaction(async (tx) => {
          const createdCategoriesMap = new Map<string, string>();

          for (const op of sortedOperations) {
            if (op.type === 'create' || op.type === 'create_post') {
              let slug = op.data.slug || 'post';
              let isUnique = false;
              let slugAttempt = 0;
              let uniqueSlug = slug;

              while (!isUnique) {
                const existing = await tx.blogPost.findFirst({
                  where: {
                    shopId,
                    slug: uniqueSlug
                  }
                });

                if (!existing) {
                  isUnique = true;
                } else {
                  slugAttempt++;
                  uniqueSlug = `${slug}-${slugAttempt}`;
                }
              }

              // Resolve categoryId to prevent foreign key constraint violations
              let categoryId = op.data.categoryId;
              if (categoryId) {
                if (createdCategoriesMap.has(categoryId)) {
                  categoryId = createdCategoriesMap.get(categoryId);
                } else {
                  const catById = await tx.blogCategory.findFirst({
                    where: { id: categoryId, shopId }
                  });
                  if (catById) {
                    categoryId = catById.id;
                  } else {
                    const catBySlugOrName = await tx.blogCategory.findFirst({
                      where: {
                        shopId,
                        OR: [
                          { slug: categoryId },
                          { name: categoryId }
                        ]
                      }
                    });
                    if (catBySlugOrName) {
                      categoryId = catBySlugOrName.id;
                    } else {
                      let foundInMap = false;
                      for (const [key, val] of createdCategoriesMap.entries()) {
                        if (key.toLowerCase() === categoryId.toLowerCase()) {
                          categoryId = val;
                          foundInMap = true;
                          break;
                        }
                      }
                      if (!foundInMap) {
                        categoryId = null;
                      }
                    }
                  }
                }
              } else {
                categoryId = null;
              }

              createdPost = await tx.blogPost.create({
                data: {
                  ...normalizeBlogPostData(op.data),
                  categoryId,
                  slug: uniqueSlug,
                  shopId: shopId,
                } as any
              });
            } else if (op.type === 'update' || op.type === 'update_post') {
              if (!op.id) continue;

              let updateData: Record<string, any> = normalizeBlogPostData(op.data);

              if (updateData.slug) {
                let slug = updateData.slug;
                let isUnique = false;
                let slugAttempt = 0;
                let uniqueSlug = slug;

                while (!isUnique) {
                  const existing = await tx.blogPost.findFirst({
                    where: {
                      shopId,
                      slug: uniqueSlug,
                      id: { not: op.id }
                    }
                  });

                  if (!existing) {
                    isUnique = true;
                  } else {
                    slugAttempt++;
                    uniqueSlug = `${slug}-${slugAttempt}`;
                  }
                }
                updateData.slug = uniqueSlug;
              }

              // Resolve categoryId to prevent foreign key constraint violations during update
              let categoryId = updateData.categoryId;
              if (categoryId !== undefined) {
                if (categoryId) {
                  if (createdCategoriesMap.has(categoryId)) {
                    categoryId = createdCategoriesMap.get(categoryId);
                  } else {
                    const catById = await tx.blogCategory.findFirst({
                      where: { id: categoryId, shopId }
                    });
                    if (catById) {
                      categoryId = catById.id;
                    } else {
                      const catBySlugOrName = await tx.blogCategory.findFirst({
                        where: {
                          shopId,
                          OR: [
                            { slug: categoryId },
                            { name: categoryId }
                          ]
                        }
                      });
                      if (catBySlugOrName) {
                        categoryId = catBySlugOrName.id;
                      } else {
                        let foundInMap = false;
                        for (const [key, val] of createdCategoriesMap.entries()) {
                          if (key.toLowerCase() === categoryId.toLowerCase()) {
                            categoryId = val;
                            foundInMap = true;
                            break;
                          }
                        }
                        if (!foundInMap) {
                          categoryId = null;
                        }
                      }
                    }
                  }
                } else {
                  categoryId = null;
                }
                updateData.categoryId = categoryId;
              }

              await tx.blogPost.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete' || op.type === 'delete_post') {
              if (!op.id) continue;
              await tx.blogPost.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            } else if (op.type === 'create_category') {
              let slug = op.data.slug || 'category';
              let isUnique = false;
              let slugAttempt = 0;
              let uniqueSlug = slug;

              while (!isUnique) {
                const existing = await tx.blogCategory.findFirst({
                  where: {
                    shopId,
                    slug: uniqueSlug
                  }
                });

                if (!existing) {
                  isUnique = true;
                } else {
                  slugAttempt++;
                  uniqueSlug = `${slug}-${slugAttempt}`;
                }
              }

              const newCat = await tx.blogCategory.create({
                data: {
                  ...op.data,
                  slug: uniqueSlug,
                  shopId: shopId,
                }
              });

              // Track created category
              createdCategoriesMap.set(newCat.id, newCat.id);
              if (op.data.slug) createdCategoriesMap.set(op.data.slug, newCat.id);
              if (op.data.name) createdCategoriesMap.set(op.data.name, newCat.id);
            } else if (op.type === 'update_category') {
              if (!op.id) continue;
              let updateData = { ...op.data };

              if (updateData.slug) {
                let slug = updateData.slug;
                let isUnique = false;
                let slugAttempt = 0;
                let uniqueSlug = slug;

                while (!isUnique) {
                  const existing = await tx.blogCategory.findFirst({
                    where: {
                      shopId,
                      slug: uniqueSlug,
                      id: { not: op.id }
                    }
                  });

                  if (!existing) {
                    isUnique = true;
                  } else {
                    slugAttempt++;
                    uniqueSlug = `${slug}-${slugAttempt}`;
                  }
                }
                updateData.slug = uniqueSlug;
              }

              await tx.blogCategory.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete_category') {
              if (!op.id) continue;
              await tx.blogCategory.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            } else if (op.type === 'update_comment') {
              if (!op.id) continue;
              await tx.blogComment.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: op.data,
              });
            } else if (op.type === 'delete_comment') {
              if (!op.id) continue;
              await tx.blogComment.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            }
          }
        });

        return NextResponse.json({
          success: true,
          id: createdPost?.id,
          slug: createdPost?.slug,
          post: createdPost,
          explanation: body.explanation || 'تغییرات با موفقیت در پایگاه‌داده ثبت شدند.'
        });
      } catch (err: any) {
        console.error('Error executing pre-approved blog operations:', err);
        return NextResponse.json({ error: `خطا در ثبت نهایی تغییرات: ${err.message}` }, { status: 500 });
      }
    }

    const basicValidation = validateAiRequest(prompt ?? '');
    if (!basicValidation.valid) {
      return NextResponse.json({ error: basicValidation.reason }, { status: 400 });
    }

    // 1. Fetch active package, system settings, and context in parallel to reduce DB latency
    const [shop, settings, products, posts, categories, comments] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        include: { package: true },
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'ai_enabled',
              'openrouter_api_key',
              'openrouter_model',
              'openrouter_control_model',
              'openrouter_blog_model',
              'pexels_api_key'
            ]
          }
        }
      }),
      prisma.product.findMany({
        where: { shopId, isActive: true },
        select: {
          id: true,
          title: true,
          price: true,
          discount: true,
          imageUrl: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 15
      }),
      prisma.blogPost.findMany({
        where: { shopId },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          categoryId: true,
          tags: true,
          viewCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 40
      }),
      prisma.blogCategory.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          _count: {
            select: { posts: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.blogComment.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          email: true,
          content: true,
          status: true,
          postId: true,
          post: {
            select: {
              title: true
            }
          },
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    const aiEnabled = settingsMap.get('ai_enabled') !== 'false';
    const openrouterApiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = await getAiModel('content', shopId);
    const pexelsApiKey = settingsMap.get('pexels_api_key') || '';

    const contextValidation = validateAiRequest(prompt, {
      aiEnabled,
      hasApiKey: !!openrouterApiKey,
    });
    if (!contextValidation.valid) {
      return NextResponse.json({ error: contextValidation.reason }, { status: 400 });
    }

    // 2. Prune context to save maximum input tokens and speed up response times!
    const prunedContext = pruneBlogContext(prompt, products, posts, categories, comments);

    const shopDomain = shop?.customDomain || (shop?.subdomain ? `${shop.subdomain}.localhost:3000` : 'localhost:3000');
    const host = request.headers.get('host') || shopDomain;
    const shopUrl = `http://${host}`;

    const formattedProducts = prunedContext.products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      discount: p.discount || 0,
      imageUrl: p.imageUrl,
    }));

    const formattedPosts = prunedContext.posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      categoryId: p.categoryId,
      tags: p.tags,
      viewCount: p.viewCount,
    }));

    const formattedCategories = prunedContext.categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      postsCount: c._count?.posts || 0
    }));

    const formattedComments = prunedContext.comments.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      content: c.content,
      status: c.status,
      postId: c.postId,
      postTitle: c.post?.title
    }));

    const { gregorianDate, jalaliDate, time } = getIranDateTime();

    const selectedCtaTemplate = pickRandomCtaTemplate();

    const dynamicContext = `اطلاعات زمانی مبنا:
- تاریخ امروز (میلادی): ${gregorianDate}
- تاریخ امروز (شمسی): ${jalaliDate}
- ساعت فعلی ایران: ${time}

قالب باکس CTA این درخواست (در صورت ساخت/ویرایش مقاله، اگر محصول مرتبطی در کانتکست بود دقیقاً از همین قالب استفاده کن و فقط __IMG__/__TITLE__/__ID__ و متن عنوان و توضیح را با داده واقعی محصول جایگزین کن):
${selectedCtaTemplate}

اطلاعات برند و دامنه فروشگاه:
- نام برند/فروشگاه: "${shop.shopName}"
- آدرس وب‌سایت فروشگاه: "${shopUrl}" (دامنه: "${host}")

ساختار لینک محصول در سایت شما دقیقاً به صورت "/product/ID" است. اگر در محتوای مقاله‌ای که تولید یا ویرایش می‌کنی به محصولی لینک می‌دهی، حتماً از این ساختار استفاده کن.

لیست مقالات موجود در سیستم:
${JSON.stringify(formattedPosts, null, 2)}

لیست دسته‌بندی‌های موجود در سیستم:
${JSON.stringify(formattedCategories, null, 2)}

لیست نظرات اخیر کاربران در سیستم:
${JSON.stringify(formattedComments, null, 2)}

لیست ۱۵ محصول برتر فروشگاه جهت لینک‌دهی:
${JSON.stringify(formattedProducts, null, 2)}`;

    const userPrompt = `دستور کاربر: "${prompt}"`;

    // Estimate desired article length from the prompt to size the output token budget.
    // Persian + verbose inline HTML classes consume many output tokens, so a too-low
    // limit causes truncated (silently "repaired") articles. We size generously and
    // escalate on truncation (finish_reason === 'length').
    const normalizedPromptForLength = (prompt || '').toLowerCase();
    const wantsLong = /بلند|مفصل|جامع|طولانی|عمیق|۱۵۰۰|1500|۲۰۰۰|2000/.test(normalizedPromptForLength);
    const wantsShort = /کوتاه|مختصر|خلاصه|۴۰۰|400|۳۰۰|300/.test(normalizedPromptForLength);
    const baseMaxTokens = wantsLong ? 14000 : wantsShort ? 5000 : 9000;
    const TOKEN_CEILING = 20000;

    // JSON-capable fallback model (must support response_format json_object).
    const FALLBACK_MODEL = 'google/gemini-2.5-flash';

    let parsedResult: any = null;
    try {
      let parseWarnings: string[] = [];
      let lastError: any = null;
      const maxAttempts = 3;

      // Fresh article-creation requests use the robust multi-stage pipeline
      // (plan → anti-cliché intro → body with continuation) to avoid clichéd
      // intros and truncated/half-generated articles. On any failure it falls
      // back to the single-call path below.
      if (isArticleCreationRequest(prompt)) {
        try {
          parsedResult = await generateArticleMultiStage({
            prompt,
            apiKey: openrouterApiKey,
            model: openrouterModel,
            shopName: shop.shopName,
            gregorianDate,
            jalaliDate,
            time,
            ctaTemplate: selectedCtaTemplate,
            products: formattedProducts,
            posts: formattedPosts.map((p: any) => ({ id: p.id, title: p.title, slug: p.slug })),
            categories: formattedCategories.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description })),
          });
          parseWarnings = Array.isArray(parsedResult?.warnings) ? parsedResult.warnings : [];
        } catch (msErr) {
          console.error('[AI-BLOG] Multi-stage generation failed; falling back to single-call path:', msErr);
          parsedResult = null;
        }
      }

      if (!parsedResult) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
        let currentModel = openrouterModel;
        let currentTemperature = 0.7;
        // Escalate the token budget on each retry so a truncated long article can complete.
        let currentMaxTokens = Math.min(baseMaxTokens, TOKEN_CEILING);

        if (attempt === 2) {
          currentTemperature = 0.3;
          currentMaxTokens = Math.min(Math.round(baseMaxTokens * 1.4), TOKEN_CEILING);
        } else if (attempt === 3) {
          // Keep a JSON-capable model on the final attempt; only switch if the primary
          // is itself the (already JSON-capable) fallback target.
          currentModel = openrouterModel === FALLBACK_MODEL
            ? openrouterModel
            : FALLBACK_MODEL;
          currentTemperature = 0.0;
          currentMaxTokens = Math.min(Math.round(baseMaxTokens * 1.8), TOKEN_CEILING);
        }

        console.log(`[AI-BLOG] Generation attempt ${attempt}/${maxAttempts} using model: ${currentModel} (max_tokens=${currentMaxTokens})`);

        const openRouterResponse = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterApiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'SaaS Shop Builder - Advanced Blog AI',
          },
          body: JSON.stringify({
            model: currentModel,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: [
                  {
                    type: "text",
                    text: SYSTEM_PROMPT,
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
        let aiText = responseData.choices?.[0]?.message?.content;
        const finishReason = responseData.choices?.[0]?.finish_reason;

        if (!aiText) {
          throw new Error('No content returned from AI model');
        }

        // Detect truncated output: the JSON repairer would otherwise silently "fix"
        // a cut-off article and save it incomplete. Force a retry with more tokens.
        if (finishReason === 'length' && attempt < maxAttempts) {
          throw new Error('AI response truncated (finish_reason=length); retrying with a larger token budget.');
        }

        const { data, warnings } = parseAiJson<AiBlogResponse>(
          aiText,
          ['success'],
          { success: false, explanation: 'پاسخ AI ناقص بود.', operations: [] }
        );
        parsedResult = data;
        parseWarnings = warnings;
        if (finishReason === 'length') {
          parseWarnings = [...parseWarnings, 'پاسخ مدل احتمالاً به دلیل طول زیاد ناقص بوده و به‌صورت خودکار ترمیم شد؛ توصیه می‌شود مقاله را بازبینی کنید.'];
        }
        break; // Success! Exit the retry loop.
      } catch (err: any) {
        console.error(`[AI-BLOG] Attempt ${attempt} failed:`, err);
        lastError = err;
        if (attempt === maxAttempts) {
          throw err;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

      parsedResult.warnings = parseWarnings;
      }

      if (parsedResult.success && Array.isArray(parsedResult.operations)) {
        // Resolve images for newly created/updated posts BEFORE confirmation/transaction
        // (keeps external network I/O out of the DB transaction).
        await resolveOperationImages(parsedResult.operations, pexelsApiKey, shop?.themeColor || undefined);

        // Check if any operation is important/destructive
        const hasDelete = parsedResult.operations.some((op: any) => op.type.includes('delete'));
        const isBulk = parsedResult.operations.length > 1;
        const isImportant = hasDelete || isBulk;

        if (isImportant && !confirmed) {
          return NextResponse.json({
            success: true,
            requireConfirmation: true,
            explanation: parsedResult.explanation,
            operations: parsedResult.operations,
            filter: parsedResult.filter,
            tab: parsedResult.tab
          });
        }

        // Execute database transaction
        const OP_PRIORITY: Record<string, number> = {
          'delete_comment': 1,
          'delete_post': 2,
          'delete_category': 3,
          'create_category': 4,
          'update_category': 5,
          'create': 6,
          'create_post': 6,
          'update': 7,
          'update_post': 7,
          'create_comment': 8,
          'update_comment': 9,
        };

        const getOpPriority = (type: string): number => OP_PRIORITY[type] || 10;
        const sortedOperations = [...parsedResult.operations].sort((a, b) => getOpPriority(a.type) - getOpPriority(b.type));

        await prisma.$transaction(async (tx) => {
          const createdCategoriesMap = new Map<string, string>();

          for (const op of sortedOperations) {
            if (op.type === 'create' || op.type === 'create_post') {
              let slug = op.data.slug || 'post';
              let isUnique = false;
              let slugAttempt = 0;
              let uniqueSlug = slug;

              while (!isUnique) {
                const existing = await tx.blogPost.findFirst({
                  where: {
                    shopId,
                    slug: uniqueSlug
                  }
                });

                if (!existing) {
                  isUnique = true;
                } else {
                  slugAttempt++;
                  uniqueSlug = `${slug}-${slugAttempt}`;
                }
              }

              // Resolve categoryId to prevent foreign key constraint violations
              let categoryId = op.data.categoryId;
              if (categoryId) {
                if (createdCategoriesMap.has(categoryId)) {
                  categoryId = createdCategoriesMap.get(categoryId);
                } else {
                  const catById = await tx.blogCategory.findFirst({
                    where: { id: categoryId, shopId }
                  });
                  if (catById) {
                    categoryId = catById.id;
                  } else {
                    const catBySlugOrName = await tx.blogCategory.findFirst({
                      where: {
                        shopId,
                        OR: [
                          { slug: categoryId },
                          { name: categoryId }
                        ]
                      }
                    });
                    if (catBySlugOrName) {
                      categoryId = catBySlugOrName.id;
                    } else {
                      let foundInMap = false;
                      for (const [key, val] of createdCategoriesMap.entries()) {
                        if (key.toLowerCase() === categoryId.toLowerCase()) {
                          categoryId = val;
                          foundInMap = true;
                          break;
                        }
                      }
                      if (!foundInMap) {
                        categoryId = null;
                      }
                    }
                  }
                }
              } else {
                categoryId = null;
              }

              await tx.blogPost.create({
                data: {
                  ...normalizeBlogPostData(op.data),
                  categoryId,
                  slug: uniqueSlug,
                  shopId: shopId,
                } as any
              });
            } else if (op.type === 'update' || op.type === 'update_post') {
              if (!op.id) continue;

              let updateData: Record<string, any> = normalizeBlogPostData(op.data);

              if (updateData.slug) {
                let slug = updateData.slug;
                let isUnique = false;
                let slugAttempt = 0;
                let uniqueSlug = slug;

                while (!isUnique) {
                  const existing = await tx.blogPost.findFirst({
                    where: {
                      shopId,
                      slug: uniqueSlug,
                      id: { not: op.id }
                    }
                  });

                  if (!existing) {
                    isUnique = true;
                  } else {
                    slugAttempt++;
                    uniqueSlug = `${slug}-${slugAttempt}`;
                  }
                }
                updateData.slug = uniqueSlug;
              }

              // Resolve categoryId to prevent foreign key constraint violations during update
              let categoryId = updateData.categoryId;
              if (categoryId !== undefined) {
                if (categoryId) {
                  if (createdCategoriesMap.has(categoryId)) {
                    categoryId = createdCategoriesMap.get(categoryId);
                  } else {
                    const catById = await tx.blogCategory.findFirst({
                      where: { id: categoryId, shopId }
                    });
                    if (catById) {
                      categoryId = catById.id;
                    } else {
                      const catBySlugOrName = await tx.blogCategory.findFirst({
                        where: {
                          shopId,
                          OR: [
                            { slug: categoryId },
                            { name: categoryId }
                          ]
                        }
                      });
                      if (catBySlugOrName) {
                        categoryId = catBySlugOrName.id;
                      } else {
                        let foundInMap = false;
                        for (const [key, val] of createdCategoriesMap.entries()) {
                          if (key.toLowerCase() === categoryId.toLowerCase()) {
                            categoryId = val;
                            foundInMap = true;
                            break;
                          }
                        }
                        if (!foundInMap) {
                          categoryId = null;
                        }
                      }
                    }
                  }
                } else {
                  categoryId = null;
                }
                updateData.categoryId = categoryId;
              }

              await tx.blogPost.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete' || op.type === 'delete_post') {
              if (!op.id) continue;
              await tx.blogPost.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            } else if (op.type === 'create_category') {
              let slug = op.data.slug || 'category';
              let isUnique = false;
              let slugAttempt = 0;
              let uniqueSlug = slug;

              while (!isUnique) {
                const existing = await tx.blogCategory.findFirst({
                  where: {
                    shopId,
                    slug: uniqueSlug
                  }
                });

                if (!existing) {
                  isUnique = true;
                } else {
                  slugAttempt++;
                  uniqueSlug = `${slug}-${slugAttempt}`;
                }
              }

              const newCat = await tx.blogCategory.create({
                data: {
                  ...op.data,
                  slug: uniqueSlug,
                  shopId: shopId,
                }
              });

              // Track created category
              createdCategoriesMap.set(newCat.id, newCat.id);
              if (op.data.slug) createdCategoriesMap.set(op.data.slug, newCat.id);
              if (op.data.name) createdCategoriesMap.set(op.data.name, newCat.id);
            } else if (op.type === 'update_category') {
              if (!op.id) continue;
              let updateData = { ...op.data };

              if (updateData.slug) {
                let slug = updateData.slug;
                let isUnique = false;
                let slugAttempt = 0;
                let uniqueSlug = slug;

                while (!isUnique) {
                  const existing = await tx.blogCategory.findFirst({
                    where: {
                      shopId,
                      slug: uniqueSlug,
                      id: { not: op.id }
                    }
                  });

                  if (!existing) {
                    isUnique = true;
                  } else {
                    slugAttempt++;
                    uniqueSlug = `${slug}-${slugAttempt}`;
                  }
                }
                updateData.slug = uniqueSlug;
              }

              await tx.blogCategory.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: updateData,
              });
            } else if (op.type === 'delete_category') {
              if (!op.id) continue;
              await tx.blogCategory.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            } else if (op.type === 'update_comment') {
              if (!op.id) continue;
              await tx.blogComment.update({
                where: {
                  id: op.id,
                  shopId: shopId,
                },
                data: op.data,
              });
            } else if (op.type === 'delete_comment') {
              if (!op.id) continue;
              await tx.blogComment.delete({
                where: {
                  id: op.id,
                  shopId: shopId,
                }
              });
            }
          }
        });
      }
    } catch (err: any) {
      console.error(`Blog AI Control failed:`, err);
      let friendlyMessage = `کنترل هوشمند مقالات پس از چند بار تلاش ناموفق بود: ${err?.message || 'خطای ناشناخته'}`;
      if (err?.message?.includes('rate-limited') || err?.message?.includes('429')) {
        friendlyMessage = 'سرعت درخواست‌های شما بیش از حد مجاز است یا مدل انتخابی موقتاً با ترافیک بالا مواجه شده است. لطفاً چند لحظه دیگر دوباره تلاش کنید.';
      } else if (err?.message?.includes('API key')) {
        friendlyMessage = 'کلید API هوش مصنوعی نامعتبر یا منقضی شده است. لطفاً تنظیمات سیستم را بررسی کنید.';
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 502 });
    }

    return NextResponse.json({
      success: parsedResult.success,
      explanation: parsedResult.explanation,
      filter: parsedResult.filter,
      tab: parsedResult.tab,
      operations: parsedResult.operations,
      warnings: parsedResult.warnings
    });

  } catch (error) {
    console.error('Error in Blog AI Control API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
