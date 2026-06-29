import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'customer');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'برای آپلود تصویر باید وارد حساب کاربری خود شوید.' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'فقط فایل‌های تصویری مجاز هستند.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    let filename = '';
    let finalBuffer: any = buffer;

    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

    if (isGif) {
      filename = `review-${uniqueSuffix}.gif`;
    } else {
      // Optimize image using sharp
      // Convert to webp, resize max width/height to 800x800 for review photos
      finalBuffer = await sharp(buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
        
      filename = `review-${uniqueSuffix}.webp`;
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, finalBuffer);
    
    const url = `/uploads/${filename}`;

    // Also register in Media table so admin can see it in media library if needed,
    // or just return the URL for the review.
    await prisma.media.create({
      data: {
        shopId,
        url,
        type: 'image',
        name: file.name,
        size: finalBuffer.length,
        alt: `تصویر نظر - ${file.name}`
      }
    });

    return NextResponse.json({ url });
  } catch (e) {
    console.error('Error uploading review image:', e);
    return NextResponse.json({ error: 'خطا در آپلود تصویر.' }, { status: 500 });
  }
}
