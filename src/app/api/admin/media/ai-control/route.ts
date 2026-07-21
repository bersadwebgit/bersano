// [AI-OPTIMIZED] — caching, selective context, retry added
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { openRouterFetch } from '@/lib/openrouter-fetch';
import { isRateLimited } from '@/lib/rate-limiter';
import { getAiModel } from '@/lib/ai-model-resolver';

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

const SYSTEM_PROMPT = `تو یک دستیار هوشمند و فوق‌العاده دقیق برای پردازش و ویرایش هوشمند تصاویر محصولات در پنل مدیریت فروشگاه‌ساز هستی.
وظیفه تو این است که لیست تصاویر موجود در گالری کاربر را به همراه دستور (پرامپت) کاربر دریافت کنی و تصمیم بگیری که کدام تصویر(ها) باید پردازش شوند و چه تنظیماتی روی آن‌ها اعمال شود.

لیست تصاویر موجود شامل آرایه‌ای از اشیا با ساختار زیر است:
[
  { "id": "شناسه تصویر", "name": "نام فایل", "url": "آدرس تصویر", "alt": "متن جایگزین" }
]

تو باید بر اساس دستور کاربر، تصویر یا تصاویر هدف را شناسایی کنی و شناسه (id) آن‌ها را در آرایه "selectedMediaIds" قرار دهی.
مثال‌های شناسایی تصویر:
- "عکس کفش نایک": تصویری که نام یا alt آن شامل "nike" یا "نایک" یا "کفش" است را پیدا کن.
- "عکس دومی": دومین تصویر در لیست ارسالی (بر اساس ترتیب آرایه).
- "همه عکس‌ها": شناسه تمام تصاویر موجود در لیست را برگردان.

همچنین باید پارامترهای پردازش تصویر را بر اساس درخواست کاربر استخراج کنی:
1. حذف پس‌زمینه (removeBg):
   - اگر کاربر گفت "پس‌زمینه حذف بشه" یا "بدون بک‌گراند بشه" یا "remove background"، مقدار removeBg را true کن.
2. رنگ پس‌زمینه (bgColor):
   - اگر کاربر گفت "زمینه سفید بشه" یا "بک‌گراند سفید"، مقدار bgColor را "#ffffff" قرار بده.
   - اگر رنگ دیگری خواست، کد هگز مناسب آن را قرار بده. پیش‌فرض "#ffffff" است.
3. ابعاد تصویر (dimensions):
   - مقادیر مجاز: "square" (مربع ۱:۱)، "portrait" (پرتره ۳:۴)، "landscape" (افقی ۴:۳)، "original" (حفظ ابعاد اصلی).
   - اگر کاربر اشاره‌ای نکرد، پیش‌فرض "square" یا "original" قرار بده.
4. مقیاس سوژه (subjectScale):
   - عددی بین ۵۰ تا ۹۵ درصد. پیش‌فرض ۸۰ است.
5. واتر‌مارک (watermarkType):
   - مقادیر مجاز: "none" (بدون واتر‌مارک)، "text" (متنی)، "logo" (لوگوی فروشگاه).
   - اگر کاربر گفت "واتر‌مارک بیاد" یا "واتر‌مارک متنی ..."، نوع را "text" قرار بده و متن آن را در "watermarkText" بگذار.
   - اگر گفت "واتر‌مارک لوگو"، نوع را "logo" قرار بده.
6. متن واتر‌مارک (watermarkText):
   - متن درخواستی کاربر برای واتر‌مارک (مثلاً نام فروشگاه یا برند).
7. جایگزینی تصویر اصلی (replaceOriginal):
   - اگر کاربر گفت "جایگزین عکس محصول بشه" یا "جایگزین بشه" یا "روی عکس اصلی اعمال بشه"، مقدار replaceOriginal را true کن. در غیر این صورت false باشد تا یک تصویر جدید ایجاد شود.

مدیریت کتابخانه رسانه (Library CRUD — متفاوت از پردازش تصویر):
اگر دستور کاربر به‌جای پردازش/ویرایش تصویر، درباره «مدیریت فایل‌های کتابخانه» است (تغییر نام فایل، تنظیم متن جایگزین/alt، یا حذف تصویر)، به‌جای فیلدهای پردازش، آرایه‌ای به نام "operations" برگردان. هر عملیات یکی از این سه نوع است:
- تغییر نام: { "type": "rename", "id": "شناسه تصویر", "name": "نام-جدید.webp" }
- تنظیم متن جایگزین (alt): { "type": "setAlt", "id": "شناسه تصویر", "alt": "متن جایگزین سئوشده و توصیفی" }
- حذف تصویر: { "type": "delete", "id": "شناسه تصویر" }
نکات:
- شناسه‌ها را دقیقاً از لیست تصاویر ارسالی انتخاب کن؛ هرگز شناسه نامعتبر نساز.
- برای تغییر اندازه/ابعاد تصویر از همان مسیر پردازش (selectedMediaIds + settings.dimensions) استفاده کن، نه operations.
- اگر کاربر هم پردازش و هم مدیریت کتابخانه را همزمان خواست، اولویت با درخواست صریح‌تر است؛ هر دو را در یک پاسخ ترکیب نکن.

خروجی تو باید دقیقاً یک شیء JSON معتبر با ساختار زیر باشد و هیچ متن اضافی دیگر (قبل، بعد یا در توضیحات مارک‌داون) بازنگردانی:

برای پردازش تصویر:
{
  "success": true,
  "explanation": "توضیحات فارسی از تغییراتی که قرار است اعمال شود و تصاویری که انتخاب شده‌اند...",
  "selectedMediaIds": ["id1", "id2"],
  "settings": {
    "removeBg": true/false,
    "bgColor": "#ffffff",
    "dimensions": "square",
    "subjectScale": 80,
    "watermarkType": "none/text/logo",
    "watermarkText": "متن واتر‌مارک در صورت وجود",
    "watermarkOpacity": 0.25,
    "watermarkPosition": "center"
  },
  "replaceOriginal": true/false
}

برای مدیریت کتابخانه (تغییر نام/alt/حذف):
{
  "success": true,
  "explanation": "توضیحات فارسی از عملیات مدیریتی که روی فایل‌ها انجام می‌شود...",
  "operations": [
    { "type": "rename", "id": "id1", "name": "نام-جدید.webp" },
    { "type": "setAlt", "id": "id2", "alt": "متن جایگزین جدید" },
    { "type": "delete", "id": "id3" }
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
    const { prompt, confirmed, rawResult } = body;

    if (!prompt && (!confirmed || !rawResult)) {
      return NextResponse.json({ error: 'لطفاً دستور خود را وارد کنید.' }, { status: 400 });
    }

    let parsedResult: any = null;

    if (confirmed && rawResult) {
      parsedResult = rawResult;
    } else {
      // 1. Fetch all images for the current shop to provide to the AI
      const mediaItems = await prisma.media.findMany({
        where: { shopId, type: 'image' },
        orderBy: { createdAt: 'desc' },
      });

      if (mediaItems.length === 0) {
        return NextResponse.json({ error: 'هیچ تصویری در گالری شما یافت نشد.' }, { status: 400 });
      }

      // Prepare a simplified list of media items for the LLM to keep token usage low
      const simplifiedMedia = mediaItems.map((item, index) => ({
        index: index + 1,
        id: item.id,
        name: item.name,
        url: item.url,
        alt: item.alt || '',
      }));

      // 2. Fetch OpenRouter Configuration
      const openrouterApiKeySetting = await prisma.systemSetting.findUnique({
        where: { key: 'openrouter_api_key' },
      });
      const openrouterControlModelSetting = await prisma.systemSetting.findUnique({
        where: { key: 'openrouter_control_model' },
      });
      const openrouterModelSetting = await prisma.systemSetting.findUnique({
        where: { key: 'openrouter_model' },
      });

      const openrouterApiKey = openrouterApiKeySetting?.value;
      let openrouterModel = await getAiModel('simple', shopId);

      // Auto-correct slow/invalid/unstable models to extremely fast and stable google/gemini-2.5-flash
      const lowerModel = openrouterModel.toLowerCase();
      if (
        lowerModel.includes('gpt-oss') || 
        lowerModel.includes('gemma-4') || 
        lowerModel.includes('flash-lite') || 
        lowerModel.includes('lite') || 
        (lowerModel.includes('free') && (lowerModel.includes('llama-2') || lowerModel.includes('mistral-7b'))) ||
        !openrouterModel.trim()
      ) {
        openrouterModel = 'google/gemini-2.5-flash';
        
        // Proactively update database settings to permanently optimize speed for the user
        if (
          openrouterControlModelSetting?.value === 'openai/gpt-oss-120b:free' || 
          openrouterControlModelSetting?.value?.includes('lite') || 
          openrouterControlModelSetting?.value?.includes('flash-lite')
        ) {
          try {
            await prisma.systemSetting.update({
              where: { key: 'openrouter_control_model' },
              data: { value: 'google/gemini-2.5-flash' }
            });
          } catch (e) {
            console.error('Failed to auto-update openrouter_control_model setting:', e);
          }
        }
        if (openrouterModelSetting?.value === 'google/gemma-4-31b-it:free' || 
          openrouterModelSetting?.value?.includes('lite') || 
          openrouterModelSetting?.value?.includes('flash-lite')
        ) {
          try {
            await prisma.systemSetting.update({
              where: { key: 'openrouter_model' },
              data: { value: 'google/gemini-2.5-flash' }
            });
          } catch (e) {
            console.error('Failed to auto-update openrouter_model setting:', e);
          }
        }
      }

      if (!openrouterApiKey) {
        return NextResponse.json({ error: 'سرویس هوش مصنوعی کنترل هوشمند در حال حاضر پیکربندی نشده است. لطفاً به پشتیبانی سیستم اطلاع دهید.' }, { status: 503 });
      }

      const dynamicContext = `لیست تصاویر موجود در گالری فروشگاه:\n${JSON.stringify(simplifiedMedia, null, 2)}`;
      const userPrompt = `دستور کاربر: "${prompt}"`;

      // 3. Request to OpenRouter
      try {
        const openRouterResponse = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterApiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'SaaS Shop Builder Media AI',
          },
          body: JSON.stringify({
            model: openrouterModel,
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
            temperature: 0.1,
            max_tokens: 2000,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          return NextResponse.json({ error: `خطای سرویس هوش مصنوعی: ${errorText}` }, { status: 502 });
        }

        const responseData = await openRouterResponse.json();
        const aiText = responseData.choices?.[0]?.message?.content;

        if (!aiText) {
          return NextResponse.json({ error: 'پاسخی از مدل هوش مصنوعی دریافت نشد.' }, { status: 502 });
        }

        parsedResult = cleanAndParseJson(aiText);
      } catch (err: any) {
        return NextResponse.json({ error: `خطا در ارتباط با سرویس هوش مصنوعی: ${err.message}` }, { status: 502 });
      }
    }

    // Library management flow (rename / set alt / delete) — distinct from image processing.
    if (parsedResult.success && Array.isArray(parsedResult.operations) && parsedResult.operations.length > 0) {
      const ops = parsedResult.operations;
      const hasDelete = ops.some((op: any) => op?.type === 'delete');

      // Deletions are destructive: ask for confirmation first.
      if (hasDelete && !confirmed) {
        return NextResponse.json({
          success: true,
          requireConfirmation: true,
          explanation: parsedResult.explanation,
          rawResult: parsedResult,
        });
      }

      const managed: any[] = [];
      for (const op of ops) {
        try {
          if (!op?.id) continue;
          // Tenant isolation: ensure the media belongs to this shop before mutating.
          const item = await prisma.media.findFirst({ where: { id: op.id, shopId } });
          if (!item) continue;

          if (op.type === 'rename' && op.name) {
            const updated = await prisma.media.update({
              where: { id: op.id },
              data: { name: String(op.name).trim() },
            });
            managed.push(updated);
          } else if (op.type === 'setAlt' && op.alt !== undefined) {
            const updated = await prisma.media.update({
              where: { id: op.id },
              data: { alt: String(op.alt) },
            });
            managed.push(updated);
          } else if (op.type === 'delete') {
            try {
              const filename = item.url.split('/').pop();
              if (filename) {
                await unlink(path.join(process.cwd(), 'public', 'uploads', filename));
              }
            } catch (fsError) {
              console.error('Failed to delete media file from filesystem:', fsError);
            }
            await prisma.media.delete({ where: { id: op.id } });
            managed.push({ id: op.id, deleted: true });
          }
        } catch (opErr) {
          console.error('Media library operation failed:', opErr);
        }
      }

      return NextResponse.json({
        success: true,
        explanation: parsedResult.explanation || 'عملیات مدیریت کتابخانه رسانه با موفقیت انجام شد.',
        processed: managed,
        operations: ops,
      });
    }

    if (!parsedResult.success || !parsedResult.selectedMediaIds || parsedResult.selectedMediaIds.length === 0) {
      return NextResponse.json({
        success: false,
        explanation: parsedResult.explanation || 'تصویر مورد نظر پیدا نشد یا دستور نامفهوم بود.',
        processed: [],
      });
    }

    // Check if background removal or replacing original is requested
    const removeBg = !!parsedResult.settings?.removeBg;
    const replaceOriginal = !!parsedResult.replaceOriginal;
    const isImportant = removeBg || replaceOriginal;

    if (isImportant && !confirmed) {
      return NextResponse.json({
        success: true,
        requireConfirmation: true,
        explanation: parsedResult.explanation,
        rawResult: parsedResult
      });
    }

    // 4. Verify package limits if background removal is requested
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
      return NextResponse.json({ error: 'جهت انجام پردازش پیشرفته تصاویر نیاز به فعال‌سازی پکیج اشتراک دارید.' }, { status: 403 });
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = JSON.parse(activePackage.features);
    } catch (e) {
      console.error('Error parsing features:', e);
    }

    if (removeBg && !packageFeatures.bgRemovalEnabled) {
      return NextResponse.json({ error: 'قابلیت حذف پس‌زمینه در پکیج فعلی شما فعال نیست. لطفا پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    if (removeBg) {
      const bgRemovalLimit = parseInt(packageFeatures.bgRemovalLimit) || 0;
      const bgRemovalCount = shop.bgRemovalCount || 0;

      if (bgRemovalLimit > 0 && bgRemovalCount + parsedResult.selectedMediaIds.length > bgRemovalLimit) {
        return NextResponse.json({
          error: `سهمیه حذف پس‌زمینه پکیج شما کافی نیست. سهمیه باقی‌مانده: ${bgRemovalLimit - bgRemovalCount} عدد.`,
        }, { status: 403 });
      }
    }

    // Fetch Poof API key if background removal is requested
    let poofApiKey = '';
    if (removeBg) {
      const systemSetting = await prisma.systemSetting.findUnique({
        where: { key: 'poof_api_key' },
      });
      poofApiKey = systemSetting?.value || '';
      if (!poofApiKey) {
        return NextResponse.json({ error: 'سرویس هوش مصنوعی حذف پس‌زمینه در حال حاضر پیکربندی نشده است.' }, { status: 503 });
      }
    }

    const processedItems = [];
    const settings = parsedResult.settings || {};
    const bgColor = settings.bgColor || '#ffffff';
    const dimensions = settings.dimensions || 'square';
    const subjectScale = settings.subjectScale || 80;
    const watermarkType = settings.watermarkType || 'none';
    const watermarkText = settings.watermarkText || '';
    const watermarkLogoUrl = settings.watermarkLogoUrl || '';
    const watermarkOpacity = settings.watermarkOpacity || 0.25;
    const watermarkPosition = settings.watermarkPosition || 'center';

    // 5. Process each identified image
    for (const mediaId of parsedResult.selectedMediaIds) {
      try {
        const mediaItem = await prisma.media.findFirst({
          where: { id: mediaId, shopId },
        });

        if (!mediaItem || mediaItem.shopId !== shopId || mediaItem.type !== 'image') {
          continue;
        }

        const filename = path.basename(mediaItem.url);
        const localFilePath = path.join(process.cwd(), 'public', 'uploads', filename);

        try {
          await fs.access(localFilePath);
        } catch (e) {
          console.error(`File not found: ${localFilePath}`);
          continue;
        }

        let inputBuffer = await fs.readFile(localFilePath);

        // A. Background removal
        if (removeBg) {
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
          } else {
            console.error('Poof API error on image:', mediaId, await poofResponse.text());
            continue;
          }
        }

        // B. Load and trim subject
        let subjectSharp = sharp(inputBuffer);
        if (!removeBg) {
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

        // C. Target dimensions
        let targetWidth = 1000;
        let targetHeight = 1000;

        if (dimensions === 'portrait') {
          targetWidth = 1000;
          targetHeight = 1333;
        } else if (dimensions === 'landscape') {
          targetWidth = 1000;
          targetHeight = 750;
        } else if (dimensions === 'original') {
          const origMeta = await sharp(inputBuffer).metadata();
          targetWidth = origMeta.width || 1000;
          targetHeight = origMeta.height || 1000;
        }

        // D. Scaling
        const maxCanvasDim = Math.max(targetWidth, targetHeight);
        const targetSubjectDim = maxCanvasDim * (subjectScale / 100);
        const scaleFactor = targetSubjectDim / Math.max(sWidth, sHeight);

        const resizedSWidth = Math.round(sWidth * scaleFactor);
        const resizedSHeight = Math.round(sHeight * scaleFactor);

        const resizedSubjectBuffer = await sharp(subjectBuffer)
          .resize(resizedSWidth, resizedSHeight, { fit: 'fill' })
          .toBuffer();

        // E. Create canvas
        const hexBg = bgColor.startsWith('#') ? bgColor : '#ffffff';
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

        // F. Watermark
        if (watermarkType === 'text' && watermarkText) {
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
        } else if (watermarkType === 'logo' && watermarkLogoUrl) {
          const logoFilename = path.basename(watermarkLogoUrl);
          const logoPath = path.join(process.cwd(), 'public', 'uploads', logoFilename);

          try {
            await fs.access(logoPath);
            const logoSize = Math.round(Math.min(targetWidth, targetHeight) * 0.12);
            const logoBuffer = await sharp(logoPath)
              .resize(logoSize, logoSize, { fit: 'inside' })
              .ensureAlpha()
              .linear([1, 1, 1, watermarkOpacity], [0, 0, 0, 0])
              .toBuffer();

            let logoLeft = targetWidth - logoSize - 40;
            let logoTop = targetHeight - logoSize - 40;

            if (watermarkPosition === 'center') {
              logoLeft = Math.round((targetWidth - logoSize) / 2);
              logoTop = Math.round((targetHeight - logoSize) / 2);
            } else if (watermarkPosition === 'bottom-left') {
              logoLeft = 40;
              logoTop = targetHeight - logoSize - 40;
            } else if (watermarkPosition === 'top-right') {
              logoLeft = targetWidth - logoSize - 40;
              logoTop = 40;
            } else if (watermarkPosition === 'top-left') {
              logoLeft = 40;
              logoTop = 40;
            }

            composites.push({
              input: logoBuffer,
              left: logoLeft,
              top: logoTop,
            });
          } catch (e) {
            console.error('Logo watermark not found:', logoPath);
          }
        }

        const finalBuffer = await canvasSharp
          .composite(composites)
          .webp({ quality: 85 })
          .toBuffer();

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const resultFilename = `${uniqueSuffix}-ai-processed.webp`;
        const resultFilePath = path.join(process.cwd(), 'public', 'uploads', resultFilename);

        await fs.writeFile(resultFilePath, finalBuffer);
        const resultUrl = `/uploads/${resultFilename}`;

        // Create new record in Media table
        const originalNameWithoutExt = mediaItem.name.substring(0, mediaItem.name.lastIndexOf('.')) || mediaItem.name;
        
        let finalMediaItem;

        if (replaceOriginal) {
          const oldUrl = mediaItem.url;
          const newUrl = resultUrl;

          // Delete the original physical file
          try {
            const oldFilename = oldUrl.split('/').pop();
            if (oldFilename) {
              const oldFilepath = path.join(process.cwd(), 'public', 'uploads', oldFilename);
              await unlink(oldFilepath);
            }
          } catch (fsError) {
            console.error('Failed to delete original file from filesystem:', fsError);
          }

          // Update the original record
          finalMediaItem = await prisma.media.update({
            where: { id: mediaItem.id },
            data: {
              url: newUrl,
              size: finalBuffer.length,
              name: `${originalNameWithoutExt}-هوشمند.webp`,
              alt: `${mediaItem.alt || originalNameWithoutExt} پردازش‌شده هوشمند`,
              originalId: null,
              originalUrl: null,
            },
            allowCrossTenant: true,
          } as any);

          // Bulk update references across database
          await prisma.product.updateMany({
            where: { shopId, imageUrl: oldUrl },
            data: { imageUrl: newUrl },
          });

          const productsWithGallery = await prisma.product.findMany({
            where: { shopId, galleryUrls: { contains: oldUrl } },
          });

          for (const prod of productsWithGallery) {
            if (prod.galleryUrls) {
              try {
                const gallery: string[] = JSON.parse(prod.galleryUrls);
                if (Array.isArray(gallery)) {
                  const updatedGallery = gallery.map(img => img === oldUrl ? newUrl : img);
                  await prisma.product.update({
                    where: { id: prod.id },
                    data: { galleryUrls: JSON.stringify(updatedGallery) },
                    allowCrossTenant: true,
                  } as any);
                }
              } catch (e) {
                console.error(`Error updating gallery images for product ${prod.id}:`, e);
              }
            }
          }

          await prisma.productVariant.updateMany({
            where: { shopId, imageUrl: oldUrl },
            data: { imageUrl: newUrl },
          });

          await prisma.category.updateMany({
            where: { shopId, imageUrl: oldUrl },
            data: { imageUrl: newUrl },
          });

          await prisma.story.updateMany({
            where: { shopId, thumbnailUrl: oldUrl },
            data: { thumbnailUrl: newUrl },
          });
          await prisma.story.updateMany({
            where: { shopId, mediaUrl: oldUrl },
            data: { mediaUrl: newUrl },
          });

          await prisma.blogPost.updateMany({
            where: { shopId, featuredImage: oldUrl },
            data: { featuredImage: newUrl },
          });

          await prisma.brand.updateMany({
            where: { shopId, logoUrl: oldUrl },
            data: { logoUrl: newUrl },
          });

          await prisma.shopSettings.updateMany({
            where: { shopId, logoUrl: oldUrl },
            data: { logoUrl: newUrl },
          });
          await prisma.shopSettings.updateMany({
            where: { shopId, faviconUrl: oldUrl },
            data: { faviconUrl: newUrl },
          });

        } else {
          // Create a new record as processed, keeping originalId/originalUrl
          finalMediaItem = await prisma.media.create({
            data: {
              shopId,
              url: resultUrl,
              type: 'image',
              name: `${originalNameWithoutExt}-هوشمند.webp`,
              alt: `${mediaItem.alt || originalNameWithoutExt} پردازش‌شده هوشمند`,
              size: finalBuffer.length,
              originalId: mediaItem.id,
              originalUrl: mediaItem.url,
            },
          });
        }

        processedItems.push(finalMediaItem);

        // Increment background removal count if active
        if (removeBg) {
          await prisma.shopSettings.update({
            where: { shopId },
            data: {
              bgRemovalCount: {
                increment: 1,
              },
            },
          });
        }
      } catch (err) {
        console.error(`Error processing image ${mediaId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      explanation: parsedResult.explanation,
      processed: processedItems,
      replaceOriginal,
    });

  } catch (error) {
    console.error('Error in AI Control Media API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
