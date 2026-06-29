import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import sharp from 'sharp';

// Safe mime types for chat uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است.' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'شناسه گفتگو ارسال نشده است.' }, { status: 400 });
    }

    // Verify chat session is active and belongs to the current shop
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.shopId !== shop.shopId || session.status === 'closed') {
      return NextResponse.json({ error: 'گفتگوی فعال یافت نشد.' }, { status: 403 });
    }

    // Security check 1: File size restriction
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حداکثر حجم مجاز فایل ۵ مگابایت است.' }, { status: 400 });
    }

    // Security check 2: File type restriction (MIME and extension check)
    const mimeType = file.type || '';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'فرمت فایل مجاز نیست. فقط تصاویر (WebP, JPG, PNG, GIF) و فایل PDF مجاز می‌باشند.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'پسوند فایل مجاز نیست.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {}

    // Create unique safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let filename = '';
    let finalBuffer: Buffer = buffer;

    const isPdf = mimeType === 'application/pdf' || ext === '.pdf';
    const isGif = mimeType === 'image/gif' || ext === '.gif';

    if (isPdf) {
      // PDF: Keep original name but sanitize it
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      filename = `chat-doc-${uniqueSuffix}-${sanitizedName}`;
    } else if (isGif) {
      filename = `chat-img-${uniqueSuffix}.gif`;
    } else {
      // Optimize other images to webp
      finalBuffer = await sharp(buffer)
        .resize(1000, 1000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer();
        
      filename = `chat-img-${uniqueSuffix}.webp`;
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, finalBuffer);
    
    const url = `/uploads/${filename}`;
    const fileType = isPdf ? 'file' : 'image';

    // Save file metadata in Media library
    await prisma.media.create({
      data: {
        shopId: shop.shopId,
        url,
        type: fileType,
        name: file.name,
        size: finalBuffer.length,
        alt: `فایل گفتگو - ${file.name}`
      }
    });

    return NextResponse.json({ url, type: fileType, name: file.name });
  } catch (error) {
    console.error('[ERROR] [ChatUpload]:', error);
    return NextResponse.json({ error: 'خطا در آپلود فایل.' }, { status: 500 });
  }
}
