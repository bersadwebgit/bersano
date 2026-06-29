import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getColorHexFromName } from '@/lib/colors';
import { queueManager } from '@/lib/queue';

// Helper to check if URL is external
function isExternalUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://')) && 
         !trimmed.includes('localhost') && 
         !trimmed.includes('127.0.0.1');
}

// Helper to download and optimize external images
async function downloadAndOptimizeImage(url: string, shopId: string, originalName: string = 'imported-image'): Promise<string | null> {
  if (!isExternalUrl(url)) return url;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    await mkdir(uploadDir, { recursive: true });
    
    let filename = '';
    let finalBuffer: Buffer = buffer;
    const contentType = response.headers.get('content-type') || '';
    const isGif = contentType.includes('gif') || url.toLowerCase().endsWith('.gif');
    
    if (isGif) {
      filename = `${uniqueSuffix}.gif`;
    } else {
      try {
        finalBuffer = await sharp(buffer)
          .resize(1080, 1920, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();
        filename = `${uniqueSuffix}.webp`;
      } catch (sharpError) {
        const ext = path.extname(url).split('?')[0] || '.webp';
        filename = `${uniqueSuffix}${ext}`;
      }
    }
    
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, finalBuffer);
    
    const localUrl = `/uploads/${filename}`;
    
    await prisma.media.create({
      data: {
        shopId,
        url: localUrl,
        type: 'image',
        name: originalName,
        size: finalBuffer.length,
        alt: originalName
      }
    });
    
    return localUrl;
  } catch (error) {
    console.error('Failed to download image:', url, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = payload.shopId;
    const data = await req.json();

    // Add job to background queue
    const job = await queueManager.addJob(shopId, 'import', data);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'فرآیند درون‌ریزی آغاز شد و در پس‌زمینه در حال انجام است.'
    });
  } catch (error: any) {
    console.error('Save Import Queue Error:', error);
    return NextResponse.json({ error: 'خطا در ثبت فرآیند درون‌ریزی در صف پس‌زمینه.', details: error.message }, { status: 500 });
  }
}
