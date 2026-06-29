import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const fileIndexStr = searchParams.get('fileIndex');

    // Get client IP address safely
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // 1. Fetch the download token
    const downloadToken = await prisma.downloadToken.findUnique({
      where: { token },
      allowCrossTenant: true,
    } as any);

    if (!downloadToken) {
      return NextResponse.json({ error: 'لینک دانلود نامعتبر است' }, { status: 404 });
    }

    // 2. Fetch the corresponding product
    const product = await prisma.product.findFirst({
      where: { 
        id: downloadToken.productId,
        shopId: downloadToken.shopId
      },
    });

    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'این محصول دیگر در دسترس نیست' }, { status: 404 });
    }

    // 3. Validation - Check if link has expired
    if (downloadToken.expiresAt && downloadToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'لینک دانلود منقضی شده است' }, { status: 403 });
    }

    // 4. Validation - Check if max downloads reached
    if (downloadToken.maxDownloads && downloadToken.maxDownloads > 0 && downloadToken.downloadCount >= downloadToken.maxDownloads) {
      return NextResponse.json({ error: 'تعداد دفعات مجاز دانلود به پایان رسیده است' }, { status: 403 });
    }

    // 5. Validation - Check IP restriction
    if (product.downloadIpRestriction) {
      if (downloadToken.lastIp && downloadToken.lastIp !== clientIp) {
        // Log IP violation
        console.log(`[WARN] [DownloadService] IP Mismatch blocked | { token: "${token}", lastIp: "${downloadToken.lastIp}", currentIp: "${clientIp}" }`);
        return NextResponse.json({ error: 'دانلود این فایل فقط از IP اولیه مجاز است' }, { status: 403 });
      }
    }

    // 6. Determine file URL and original filename
    let fileUrl = product.fileUrl;
    let originalName = product.title;

    // Handle multiple file download if requested & exists
    if (fileIndexStr !== null && product.downloadFiles) {
      try {
        const files = JSON.parse(product.downloadFiles);
        const index = parseInt(fileIndexStr);
        if (Array.isArray(files) && index >= 0 && index < files.length) {
          fileUrl = files[index].url;
          originalName = files[index].name || `${product.title}_file_${index}`;
        }
      } catch (err) {
        console.error('[ERROR] [DownloadService] Failed to parse downloadFiles JSON:', err);
      }
    }

    if (!fileUrl) {
      return NextResponse.json({ error: 'فایل این محصول موجود نیست' }, { status: 404 });
    }

    // 7. Resolve file path in public uploads
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      return NextResponse.json({ error: 'فرمت فایل نامعتبر است' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (!existsSync(filePath)) {
      console.log(`[ERROR] [DownloadService] File does not exist on disk | { filePath: "${filePath}" }`);
      return NextResponse.json({ error: 'فایل فیزیکی روی سرور یافت نشد' }, { status: 404 });
    }

    // 8. Log the download attempt using structured logger rules
    const nowStr = new Date().toISOString();
    console.log(`[INFO] [DownloadService] [${nowStr}] Download started | { token: "${token}", userId: "${downloadToken.userId}", buyerEmail: "${downloadToken.buyerEmail || ''}", productId: "${product.id}", clientIp: "${clientIp}", currentCount: ${downloadToken.downloadCount} }`);

    // 9. Update download status in Database
    await prisma.downloadToken.update({
      where: { 
        id: downloadToken.id,
        shopId: downloadToken.shopId
      },
      data: {
        downloadCount: { increment: 1 },
        lastIp: clientIp,
      },
    });

    // 10. Stream the file securely
    const stats = statSync(filePath);
    const fileStream = createReadStream(filePath);

    // Set file extension or content type
    let contentType = 'application/octet-stream';
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.zip') contentType = 'application/zip';
    else if (ext === '.mp3') contentType = 'audio/mpeg';

    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName + ext)}"`,
      }
    });

  } catch (error) {
    console.error('[ERROR] [DownloadService] Unexpected error during download:', error);
    return NextResponse.json({ error: 'خطای سیستمی در دانلود فایل' }, { status: 500 });
  }
}
