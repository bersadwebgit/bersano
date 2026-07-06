import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openRouterFetch, parseOpenRouterJsonResponse, getIranDateTime } from '@/lib/openrouter-fetch';
import { verifyPlatformSession } from '@/lib/platform-auth';

// Helper to resolve the correct AI model name for platform central blog actions
async function getPlatformBlogModel(action: string): Promise<string> {
  let key = 'platform_blog_idea_model';
  let defaultModel = 'google/gemini-2.5-flash';

  if (action === 'generate_outline') {
    key = 'platform_blog_outline_model';
  } else if (action === 'generate_section') {
    key = 'platform_blog_section_model';
    defaultModel = 'anthropic/claude-3.5-sonnet';
  } else if (action === 'generate_seo_metadata' || action === 'generate_schema' || action === 'generate_internal_links') {
    key = 'platform_blog_seo_model';
  } else if (action === 'generate_direct_answer' || action === 'generate_key_takeaways' || action === 'extract_entities' || action === 'cluster_topics' || action === 'generate_external_references') {
    key = 'platform_blog_geo_model';
    defaultModel = 'anthropic/claude-3.5-sonnet';
  } else if (action === 'improve_readability' || action === 'paraphrase' || action === 'make_professional' || action === 'make_conversational' || action === 'add_persian_idioms' || action === 'shorten_text' || action === 'expand_text' || action === 'translate_or_adapt') {
    key = 'platform_blog_rewrite_model';
  } else if (action === 'generate_faq') {
    key = 'platform_blog_faq_model';
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    });
    if (setting?.value && setting.value.trim() !== '') {
      return setting.value.trim();
    }
  } catch (error) {
    console.error('Error fetching platform model:', error);
  }

  // Fallback to general system openrouter model if available
  try {
    const backupSetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_blog_model' }
    });
    if (backupSetting?.value) {
      return backupSetting.value;
    }
  } catch {}

  return defaultModel;
}

export async function POST(request: Request) {
  // Check collaborator or superadmin session (only superadmin, content_manager, or seo_manager can edit blog)
  const session = await verifyPlatformSession(['superadmin', 'content_manager', 'seo_manager']);
  if (!session) {
    return NextResponse.json({ error: 'شما دسترسی لازم برای استفاده از ابزارهای هوش مصنوعی پلتفرم را ندارید' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, topic, keyword, outline, sectionTitle, content, selectedText, context } = body;

    if (!action) {
      return NextResponse.json({ error: 'پارامتر action الزامی است' }, { status: 400 });
    }

    // Load OpenRouter API Key
    const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'openrouter_api_key' }
    });

    const openrouterApiKey = openrouterApiKeySetting?.value || process.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'کلید API برای OpenRouter تعریف نشده است. لطفاً ابتدا در تنظیمات سیستم کلید را وارد کنید.' }, { status: 400 });
    }

    const aiModel = await getPlatformBlogModel(action);
    const { jalaliDate, time } = getIranDateTime();

    let systemPrompt = 'شما یک دستیار نویسنده و متخصص سئو سه‌بعدی و GEO (بهینه‌سازی موتورهای پاسخگو) در پلتفرم فروشگاه‌ساز برسانا هستید. پاسخ‌های خود را به صورت شیوا، با رعایت نگارش فارسی روان و لحن متقاعدکننده بنویسید. تاریخ جاری سیستم به وقت تهران: ' + jalaliDate + ' ساعت ' + time;
    let userPrompt = '';

    switch (action) {
      case 'generate_ideas':
        systemPrompt += '\nوظیفه شما تولید ایده‌های ناب مقاله برای وبلاگ پلتفرم است که باعث تشویق کاربران به راه‌اندازی فروشگاه اینترنتی شود.';
        userPrompt = `لطفاً ۳ الی ۵ ایده جذاب و هدفمند برای تولید مقاله در وبلاگ با موضوع/کلیدواژه اصلی «${topic || keyword}» به زبان فارسی تولید کنید. هر ایده دارای عنوان جذاب، توضیح مختصر در حد یک خط و توجیه سئو باشد.`;
        break;

      case 'generate_outline':
        systemPrompt += '\nوظیفه شما تولید ساختار سرفصل‌های سمانتیک (H2/H3/H4) متوازن است.';
        userPrompt = `برای موضوع «${topic}» و کلمه کلیدی اصلی «${keyword}»، یک اوت‌لاین (سرفصل‌های درختی استاندارد مقاله شامل H2 و H3) و خلاصه کوتاهی از مواردی که در هر بخش باید پرداخته شود، تولید کنید.`;
        break;

      case 'generate_section':
        systemPrompt += '\nوظیفه شما نگارش کامل، عمیق و اصولی یک بخش از مقاله بر اساس سرفصل است. لحن نوشتن باید روان، تخصصی و به شدت خوانا باشد. هرگز از فونت‌های نمایشی استفاده نکنید و تگ‌های HTML تمیز مانند <p>، <strong>، <ul> و <li> اعمال کنید.';
        userPrompt = `لطفاً متنی جامع، غنی و مستدل در حدود ۳۰۰ الی ۶۰۰ کلمه برای بخش «${sectionTitle}» در مقاله با ساختار کلی «${outline || ''}» بنویسید. کلمه کلیدی اصلی «${keyword || ''}» است.`;
        break;

      case 'generate_direct_answer':
        systemPrompt += '\nوظیفه شما تولید خلاصه‌ مستقیم و بهینه‌شده برای موتورهای پاسخگو (GEO) است. این پاسخ باید مستقیم، بدون حاشیه و در قالب ۲ الی ۳ جمله پرمحتوا نوشته شود که موتور پاسخگو بتواند آن را مستقیماً نقل‌قول کند.';
        userPrompt = `برای موضوع «${topic || sectionTitle}» و کلمه کلیدی اصلی «${keyword}»، یک پاسخ مستقیم و صریح برای موتورهای پاسخگو (GEO Summary / Direct Answer) تولید کنید.`;
        break;

      case 'generate_key_takeaways':
        systemPrompt += '\nوظیفه شما تولید نکات کلیدی و نتایج مهم مقاله (Key Takeaways) در قالب لیست بالت‌پوینت است.';
        userPrompt = `لطفاً نکات کلیدی، کاربردی و خلاصه نتایج مهم مقاله با محتوای زیر را در قالب یک لیست بالت‌پوینت مرتب در قالب مارک‌داون (Markdown) تولید کنید:\n\n${content || context}`;
        break;

      case 'generate_faq':
        systemPrompt += '\nوظیفه شما تولید پرسش و پاسخ‌های متداول (FAQ) به همراه اسکیما استاندارد متناظر است.';
        userPrompt = `بر اساس محتوای این مقاله، ۳ الی ۵ سوال بسیار پر تکرار کاربران را استخراج کرده و پاسخ‌های مستقیم و فوق‌العاده کاربردی برای آن‌ها بنویسید. خروجی باید به صورت آرایه‌ای از اشیاء جی‌سان با ساختار [{ "question": "...", "answer": "..." }] باشد و هیچ توضیح اضافی یا بلاک کد در خروجی ارسال نکنید. محتوا:\n\n${content || context}`;
        break;

      case 'generate_seo_metadata':
        systemPrompt += '\nوظیفه شما بهینه‌سازی عنوان سئو و توضیحات متا بر اساس اصول کلیدواژه‌ها است.';
        userPrompt = `بر اساس محتوای مقاله با موضوع «${topic}» و کلیدواژه اصلی «${keyword}»، عنوان سئو جذاب (کمتر از ۶۰ کاراکتر) و دیسکریپشن متای ترغیب‌کننده و دارای کال‌تو‌اکشن (بین ۱۲۰ تا ۱۵۵ کاراکتر) تولید کنید. خروجی به فرمت JSON باشد: { "metaTitle": "...", "metaDescription": "..." } بدون هیچ متنی در بالا یا پایین آن.`;
        break;

      case 'generate_schema':
        systemPrompt += '\nوظیفه شما تولید اسکیما یا داده‌های ساختاریافته (JSON-LD) به صورت کاملاً معتبر است.';
        userPrompt = `برای مقاله‌ای با موضوع «${topic}»، آدرس کانیکال «${context || ''}» و کلیدواژه «${keyword}»، یک قطعه کد اسکیما نوع JSON-LD Article تولید کنید. خروجی باید فقط کد جی‌سان خام باشد، بدون هیچ توضیح یا بلاک علامت نقل قول.`;
        break;

      case 'generate_internal_links':
        systemPrompt += '\nوظیفه شما پیشنهاد انکرتکست‌ها و ساختار لینک‌های داخلی هدفمند است.';
        userPrompt = `بر اساس محتوای مقاله زیر و موضوع پلتفرم فروشگاه‌ساز برسانا، ۳ الی ۵ لنگر لینک داخلی (Anchor Text) مناسب به همراه صفحات پیشنهادی مانند ساخت فروشگاه (/blog)، معرفی پکیج‌ها (/packages)، سئو فروشگاه و غیره پیشنهاد دهید:\n\n${content || context}`;
        break;

      case 'generate_external_references':
        systemPrompt += '\nوظیفه شما پیشنهاد ارجاعات خارجی معتبر و با کیفیت علمی/تجاری بین‌المللی است.';
        userPrompt = `برای موضوع «${topic}»، ۳ الی ۵ مرجع بین‌المللی، وب‌سایت مرجع تکنولوژی یا مقاله‌های علمی معتبر پیشنهاد دهید که می‌توان برای تایید اطلاعات به آن‌ها ارجاع داد.`;
        break;

      case 'improve_readability':
        systemPrompt += '\nوظیفه شما بازنویسی متن برای افزایش شدید سطح خوانایی (Readability Index)، حذف لغات پیچیده و طولانی و روان‌سازی جملات است.';
        userPrompt = `لطفاً متن زیر را به زبان فارسی روان، شیوا و فوق‌العاده خوانا بازنویسی کنید، به صورتی که ساختار و مفهوم کاملاً حفظ شود:\n\n${selectedText || content}`;
        break;

      case 'paraphrase':
        systemPrompt += '\nوظیفه شما پارافریز یا بازنویسی متن به صورتی متفاوت برای حفظ ارزش محتوایی و جلوگیری از تکرار است.';
        userPrompt = `لطفاً متن زیر را پارافریز کنید تا لحن آن تازه و کاملاً متمایز شود:\n\n${selectedText || content}`;
        break;

      case 'make_professional':
        systemPrompt += '\nوظیفه شما ارتقای سطح نگارش به لحنی کاملاً رسمی، علمی، تخصصی و به شدت معتبر در بازار تجارت الکترونیک است.';
        userPrompt = `لطفاً متن زیر را با لحنی بسیار حرفه‌ای، شرکتی و قوی بازنویسی کنید:\n\n${selectedText || content}`;
        break;

      case 'make_conversational':
        systemPrompt += '\nوظیفه شما تبدیل لحن متن به لحنی صمیمی، دوستانه، همدلانه و گفتگویی (conversational) است، به گونه‌ای که با کاربران ارتباط عاطفی برقرار کند.';
        userPrompt = `لطفاً لحن متن زیر را صمیمی، دلسوزانه و گفتگویی کنید:\n\n${selectedText || content}`;
        break;

      case 'add_persian_idioms':
        systemPrompt += '\nوظیفه شما غنی‌سازی متن با استفاده به جا و جذاب از ضرب‌المثل‌ها، کنایه‌ها و اصطلاحات اصیل و شیرین زبان فارسی است.';
        userPrompt = `لطفاً متن زیر را بررسی کرده و چند تعبیر یا ضرب‌المثل شیرین فارسی به آن اضافه کنید تا روح ایرانی به خود بگیرد:\n\n${selectedText || content}`;
        break;

      case 'shorten_text':
        systemPrompt += '\nوظیفه شما خلاصه کردن و فشرده‌سازی متن بدون از دست رفتن مفاهیم اصلی آن است.';
        userPrompt = `لطفاً این متن را به کوتاه‌ترین شکل ممکن، در جملاتی کوتاه و پر مغز فشرده کنید:\n\n${selectedText || content}`;
        break;

      case 'expand_text':
        systemPrompt += '\nوظیفه شما بسط دادن، تشریح و افزودن جزییات منطقی و توضیحات کاربردی به متن کوتاه است.';
        userPrompt = `لطفاً متن کوتاه زیر را با توضیحات تکمیلی، ذکر نمونه‌ها و جزئیات بیشتر بسط دهید:\n\n${selectedText || content}`;
        break;

      case 'extract_entities':
        systemPrompt += '\nوظیفه شما استخراج موجودیت‌های سمانتیک (Entities) شامل برندها، افراد، مفاهیم تکنولوژی و پروتکل‌ها برای گوگل گراف است.';
        userPrompt = `لطفاً تمام موجودیت‌های کلیدی (Entities) به کار رفته در این متن را شناسایی کرده و آن‌ها را در قالب یک لیست ساده برای استفاده در متا و گراف سمانتیک استخراج کنید:\n\n${content || context}`;
        break;

      case 'cluster_topics':
        systemPrompt += '\nوظیفه شما دسته‌بندی موضوعی و تعیین خوشه‌های محتوایی (Topic Clustering) مرتبط با مقاله است.';
        userPrompt = `بر اساس متن مقاله، خوشه‌های محتوایی مرتبط را مشخص کرده و ساختار سمانتیک پیشنهادی برای پیوند دادن این مقاله با مطالب دیگر را معین کنید:\n\n${content || context}`;
        break;

      case 'translate_or_adapt':
        systemPrompt += '\nوظیفه شما ترجمه تخصصی یا بومی‌سازی (Localization) مطالب مرجع خارجی به بازار تجارت الکترونیک ایران است.';
        userPrompt = `لطفاً متن مرجع زیر را به زبان فارسی بومی‌سازی و ترجمه کنید و اصطلاحات را برای کاربران ایرانی معادل‌سازی کنید:\n\n${selectedText || content || context}`;
        break;

      default:
        return NextResponse.json({ error: 'اکشن تعریف نشده است' }, { status: 400 });
    }

    const startCall = performance.now();
    
    const response = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bersana.ir',
        'X-Title': 'Bersana Platform Central Blog Manager'
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter Error]', errorText);
      return NextResponse.json({ error: `خطا در دریافت پاسخ از هوش مصنوعی: ${response.status} - ${errorText.slice(0, 150)}` }, { status: response.status });
    }

    const data = await parseOpenRouterJsonResponse(response);
    const generatedText = data?.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      result: generatedText,
      model: aiModel
    });

  } catch (error: any) {
    console.error('Error in AI platform blog route:', error);
    return NextResponse.json({ error: 'خطای سرور در برقراری ارتباط با هوش مصنوعی: ' + (error?.message || error) }, { status: 500 });
  }
}
