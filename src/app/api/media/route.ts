import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const payload =
      (await verifyAuth(request, 'admin')) ||
      (await verifyAuth(request, 'customer'));
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم فایل ارسالی نباید بیشتر از ۱۰ مگابایت باشد' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    let filename = '';
    let finalBuffer: any = buffer;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

    if (isGif) {
      filename = `${uniqueSuffix}.gif`;
    } else if (isImage) {
      // Optimize image using sharp
      // Convert to webp, resize max width/height to 1080x1920 (good for stories and general web)
      // withoutEnlargement ensures smaller images aren't stretched
      finalBuffer = await sharp(buffer)
        .resize(1080, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer() as unknown as Buffer;
        
      filename = `${uniqueSuffix}.webp`;
    } else {
      // For videos or other files, keep original extension
      filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '');
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, finalBuffer);
    
    const url = `/uploads/${filename}`;
    const type = isImage ? 'image' : isVideo ? 'video' : 'file';

    const media = await prisma.media.create({
      data: {
        shopId,
        url,
        type,
        name: file.name,
        size: finalBuffer.length,
        alt: file.name
      }
    });

    return NextResponse.json(media);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const media = await prisma.media.findMany({ 
      where: { shopId }, 
      orderBy: { createdAt: 'desc' } 
    });
    return NextResponse.json(media);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
