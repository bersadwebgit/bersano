import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAiModel } from '@/lib/ai-model-resolver';
import { callAiGateway } from '@/lib/ai-gateway';

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
    
    // Try to find the first '[' and last ']'
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      try {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      } catch (innerError) {}
    }
    
    throw new Error('Failed to parse AI response as JSON Array');
  }
}

const DEFAULT_PROMPTS = {
  ai_seo_faq_prompt: `تو یک محقق محتوای سئو هستی که وظیفه‌ات تکمیل و بهبود توضیحات محصول و تولید سوالات متداول (FAQ) با استفاده از اطلاعات معتبر است.

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
مرحله ۱ — شناسایی و غنی‌سازی اطلاعات محصول (اجباری):
═══════════════════════════════════

برند و مدل محصول را شناسایی کن.

قوانین شناسایی و غنی‌سازی:
۱. اگر محصول متعلق به یک برند و مدل معروف جهانی یا ملی است (مانند نایک/Nike، اپل/Apple، سامسونگ، زونتس/Zontes، شیائومی و غیره) و تو مشخصات فنی و ویژگی‌های دقیق آن را در دانش داخلی خود داری، از آن دانش برای غنی‌سازی و پاسخ به سوالات متداول استفاده کن.
۲. اگر محصول برای تو ناشناخته است، یا یک برند محلی، دست‌ساز یا خاص است که اطلاعاتی از آن در دانش عمومی وجود ندارد، **به هیچ وجه فرآیند را متوقف نکن و هرگز خطای "یافت نشد" بازنگردان!** بلکه با تکیه بر اطلاعات ورودی ارائه شده در فیلدهای بالا، بهترین، دقیق‌ترین و کاربردی‌ترین سوالات متداول را تولید کن.

═══════════════════════════════════
مرحله ۲ — فرمت خروجی:
═══════════════════════════════════

۵ سوال متداول و کلیدی (FAQ) به همراه پاسخ‌های کوتاه، دقیق و ترغیب‌کننده برای این محصول تولید کن.
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
]`
};

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { title, description, brand, price, type, categoryId, specs, features, variants, fullDescription } = body;

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
      return NextResponse.json({ error: 'برای استفاده از تولید سوالات متداول با هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.' }, { status: 403 });
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = JSON.parse(activePackage.features);
    } catch (e) {
      console.error('Error parsing features:', e);
    }

    if (!packageFeatures.aiFaqsEnabled) {
      return NextResponse.json({ error: 'قابلیت تولید سوالات متداول با هوش مصنوعی در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    const openrouterFaqPromptSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_seo_faq_prompt' },
    });

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

    // Clean and truncate fullDescription (stripping HTML tags)
    const cleanedFullDesc = fullDescription 
      ? fullDescription.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim().substring(0, 1000) 
      : '';

    // If the setting exists but is an old default prompt, let's update it to the new default prompt
    if (openrouterFaqPromptSetting && 
        (!openrouterFaqPromptSetting.value.includes('تو یک محقق محتوای سئو هستی') ||
         openrouterFaqPromptSetting.value.includes('شما یک متخصص بازاریابی و ثبت محصول') || 
         openrouterFaqPromptSetting.value.includes('قوانین تولید پرسش و پاسخ (FAQ)'))) {
      try {
        await prisma.systemSetting.update({
          where: { key: 'ai_seo_faq_prompt' },
          data: { value: DEFAULT_PROMPTS.ai_seo_faq_prompt },
        });
        openrouterFaqPromptSetting.value = DEFAULT_PROMPTS.ai_seo_faq_prompt;
      } catch (err) {
        console.error('Error updating system setting in DB:', err);
      }
    }

    // 5. Build prompt and substitute variables (Conditional checks - only append non-empty segments)
    let faqPrompt = openrouterFaqPromptSetting?.value || DEFAULT_PROMPTS.ai_seo_faq_prompt;
    faqPrompt = faqPrompt
      .replace(/{title}/g, title)
      .replace(/{description}/g, description || '')
      .replace(/{brand}/g, brand || 'نامشخص')
      .replace(/{price}/g, price ? Number(price).toLocaleString('fa-IR') : 'نامشخص')
      .replace(/{type}/g, type === 'digital' ? 'دانلودی (فایل)' : 'فیزیکی')
      .replace(/{category}/g, categoryName || 'نامشخص')
      .replace(/{specs}/g, specsText || 'ثبت نشده')
      .replace(/{features}/g, featuresText || 'ثبت نشده')
      .replace(/{variants}/g, variantsText || 'ندارد')
      .replace(/{fullDescription}/g, cleanedFullDesc || 'ثبت نشده');

    // 6. Request via Canonical AI Client
    const result = await callAiGateway({
      shopId,
      endpoint: 'ai-faqs',
      slot: 'simple',
      messages: [{ role: 'user', content: faqPrompt }],
      mode: 'json',
      temperature: 0.3,
      maxTokens: 1000,
      skipQuotaCheck: false,
      featureKey: 'aiFaqsEnabled',
    });

    if (!result.success) {
      if (result.error?.includes('اطلاعات کافی') || result.text?.includes('اطلاعات کافی')) {
        return NextResponse.json({ error: 'اطلاعات کافی برای تکمیل از اینترنت یافت نشد.' }, { status: 422 });
      }
      return NextResponse.json({ error: result.error || 'تولید سوالات متداول پس از چند بار تلاش ناموفق بود.' }, { status: 502 });
    }

    const parsedFaqs = result.data;
    if (!Array.isArray(parsedFaqs)) {
      return NextResponse.json({ error: 'پاسخ هوش مصنوعی در قالب آرایه معتبر نبود.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      faqs: parsedFaqs,
    });

  } catch (error) {
    console.error('Error in AI FAQ API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}