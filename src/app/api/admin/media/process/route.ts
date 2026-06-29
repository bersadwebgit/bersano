import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const {
      mediaIds,
      removeBg = false,
      bgColor = '#ffffff',
      dimensions = 'square', // 'square' | 'portrait' | 'landscape' | 'original'
      subjectScale = 50, // percentage of canvas size (e.g. 50)
      watermarkType = 'none', // 'none' | 'text' | 'logo'
      watermarkText = '',
      watermarkLogoUrl = '',
      watermarkOpacity = 0.25,
      watermarkPosition = 'center', // 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    } = body;

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'لطفا فایل‌های مورد نظر را انتخاب کنید.' }, { status: 400 });
    }

    // Fetch the shop settings and check active package
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

    // Check if background removal is requested and enabled
    if (removeBg && !packageFeatures.bgRemovalEnabled) {
      return NextResponse.json({ error: 'قابلیت حذف پس‌زمینه در پکیج فعلی شما فعال نیست. لطفا پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    // Check srv background removal limit if requested
    if (removeBg) {
      const bgRemovalLimit = parseInt(packageFeatures.bgRemovalLimit) || 0;
      const bgRemovalCount = shop.bgRemovalCount || 0;

      if (bgRemovalLimit > 0 && bgRemovalCount + mediaIds.length > bgRemovalLimit) {
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

    // Process images one by one
    for (const mediaId of mediaIds) {
      try {
        const mediaItem = await prisma.media.findFirst({
          where: { id: mediaId, shopId },
        });

        if (!mediaItem || mediaItem.shopId !== shopId || mediaItem.type !== 'image') {
          continue; // skip invalid files
        }

        const filename = path.basename(mediaItem.url);
        const localFilePath = path.join(process.cwd(), 'public', 'uploads', filename);

        // Verify file exists on disk
        try {
          await fs.access(localFilePath);
        } catch (e) {
          console.error(`File not found: ${localFilePath}`);
          continue;
        }

        let inputBuffer = await fs.readFile(localFilePath);

        // 1. Optional background removal using Poof.bg
        if (removeBg) {
          const formData = new FormData();
          const fileBlob = new Blob([inputBuffer], { type: 'image/png' });
          formData.append('image_file', fileBlob, filename);
          formData.append('crop', 'true'); // Crop so Poof.bg returns trimmed subject

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
            continue; // Skip if BG removal fails for this image
          }
        }

        // 2. Load the subject image and trim it (locally) to find its bounding box
        // Trimming is excellent for removing any leftover solid borders or transparency padding!
        let subjectSharp = sharp(inputBuffer);
        
        // If removeBg was false, we trim solid/alpha borders to isolate the subject
        if (!removeBg) {
          try {
            subjectSharp = subjectSharp.trim();
          } catch (e) {
            // Some images (with noise or complex borders) might throw or not trim, fallback to original
            subjectSharp = sharp(inputBuffer);
          }
        }

        const subjectBuffer = await subjectSharp.toBuffer();
        const subjectMeta = await sharp(subjectBuffer).metadata();
        const sWidth = subjectMeta.width || 1;
        const sHeight = subjectMeta.height || 1;

        // 3. Determine target canvas dimensions
        let targetWidth = 1000;
        let targetHeight = 1000;

        if (dimensions === 'portrait') {
          targetWidth = 1000;
          targetHeight = 1333; // 3:4 Portrait
        } else if (dimensions === 'landscape') {
          targetWidth = 1000;
          targetHeight = 750; // 4:3 Landscape
        } else if (dimensions === 'original') {
          // Keep original image dimensions
          const origMeta = await sharp(inputBuffer).metadata();
          targetWidth = origMeta.width || 1000;
          targetHeight = origMeta.height || 1000;
        }

        // 4. Calculate Subject Resize and Scaling
        const maxCanvasDim = Math.max(targetWidth, targetHeight);
        const targetSubjectDim = maxCanvasDim * (subjectScale / 100);
        const scaleFactor = targetSubjectDim / Math.max(sWidth, sHeight);

        const resizedSWidth = Math.round(sWidth * scaleFactor);
        const resizedSHeight = Math.round(sHeight * scaleFactor);

        const resizedSubjectBuffer = await sharp(subjectBuffer)
          .resize(resizedSWidth, resizedSHeight, { fit: 'fill' })
          .toBuffer();

        // 5. Create the canvas with solid background color
        // Sharp can create a blank canvas using the input option 'create'
        const hexBg = bgColor.startsWith('#') ? bgColor : '#ffffff';
        const canvasSharp = sharp({
          create: {
            width: targetWidth,
            height: targetHeight,
            channels: 3,
            background: hexBg,
          }
        });

        // 6. Build composites list
        const composites = [];

        // Put subject exactly in the center of the canvas
        const leftPos = Math.round((targetWidth - resizedSWidth) / 2);
        const topPos = Math.round((targetHeight - resizedSHeight) / 2);
        composites.push({
          input: resizedSubjectBuffer,
          left: leftPos,
          top: topPos,
        });

        // 7. Add Minimal Watermark
        if (watermarkType === 'text' && watermarkText) {
          const fontSize = Math.round(targetWidth * 0.035); // responsive font size
          const alphaHex = Math.round(watermarkOpacity * 255).toString(16).padStart(2, '0');
          const watermarkColor = `rgba(128,128,128,${watermarkOpacity})`;

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
            
            // Generate logo with transparency
            const logoBuffer = await sharp(logoPath)
              .resize(logoSize, logoSize, { fit: 'inside' })
              .ensureAlpha()
              // Apply opacity using linear color transform
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

        // Composite layers and output to WebP with good quality
        const finalBuffer = await canvasSharp
          .composite(composites)
          .webp({ quality: 85 })
          .toBuffer();

        // Save output to uploads folder
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const resultFilename = `${uniqueSuffix}-processed.webp`;
        const resultFilePath = path.join(process.cwd(), 'public', 'uploads', resultFilename);

        await fs.writeFile(resultFilePath, finalBuffer);
        const resultUrl = `/uploads/${resultFilename}`;

        // Create new record in Media table
        const originalNameWithoutExt = mediaItem.name.substring(0, mediaItem.name.lastIndexOf('.')) || mediaItem.name;
        const newMediaItem = await prisma.media.create({
          data: {
            shopId,
            url: resultUrl,
            type: 'image',
            name: `${originalNameWithoutExt}-پردازش‌شده.webp`,
            alt: `${mediaItem.alt || originalNameWithoutExt} پردازش‌شده`,
            size: finalBuffer.length,
            originalId: mediaItem.id,
            originalUrl: mediaItem.url,
          },
        });

        processedItems.push(newMediaItem);

        // If background removal occurred, increment the shop settings counter
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
      processed: processedItems,
    });
  } catch (error) {
    console.error('Error in bulk process media route:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
