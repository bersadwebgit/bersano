import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { verifyPlatformSession } from '@/lib/platform-auth';

// Safe mime types for blog uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    // Only content manager and superadmin can upload blog images
    const session = await verifyPlatformSession(['superadmin', 'content_manager']);
    if (!session) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز؛ فقط مدیر محتوا یا سوپر ادمین امکان آپلود تصویر دارند' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است.' }, { status: 400 });
    }

    // Security check 1: File size restriction
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حداکثر حجم مجاز تصویر ۱۰ مگابایت است.' }, { status: 400 });
    }

    // Security check 2: File type restriction (MIME and extension check)
    const mimeType = file.type || '';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'فرمت فایل مجاز نیست. فقط تصاویر (WebP, JPG, PNG, GIF) مجاز می‌باشند.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
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

    const isGif = mimeType === 'image/gif' || ext === '.gif';

    if (isGif) {
      filename = `blog-img-${uniqueSuffix}.gif`;
    } else {
      // Optimize other images to webp
      // We allow 1200 max width/height for beautiful high-quality blog covers
      finalBuffer = await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
        
      filename = `blog-img-${uniqueSuffix}.webp`;
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, finalBuffer);
    
    const url = `/uploads/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[ERROR] [BlogUpload]:', error);
    return NextResponse.json({ error: 'خطا در آپلود تصویر.' }, { status: 500 });
  }
}
