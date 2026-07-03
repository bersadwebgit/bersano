import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;

    // Safety check against directory traversal
    if (!pathParts || !Array.isArray(pathParts) || pathParts.length === 0) {
      return NextResponse.json({ error: 'مسیر نامعتبر است' }, { status: 400 });
    }

    if (pathParts.some((p) => p === '..' || p === '.')) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const filename = path.join(...pathParts);

    // Resolve file path in public uploads (try standard cwd and /app absolute paths)
    let filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (!existsSync(filePath)) {
      filePath = path.join('/app', 'public', 'uploads', filename);
    }

    if (!existsSync(filePath)) {
      console.log(`[WARN] [UploadsRoute] File not found | { filePath: "${filePath}" }`);
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    const stats = statSync(filePath);
    const fileStream = createReadStream(filePath);

    // Determine Content-Type based on extension
    let contentType = 'application/octet-stream';
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.png': contentType = 'image/png'; break;
      case '.jpg':
      case '.jpeg': contentType = 'image/jpeg'; break;
      case '.gif': contentType = 'image/gif'; break;
      case '.webp': contentType = 'image/webp'; break;
      case '.svg': contentType = 'image/svg+xml'; break;
      case '.pdf': contentType = 'application/pdf'; break;
      case '.mp4': contentType = 'video/mp4'; break;
      case '.mp3': contentType = 'audio/mpeg'; break;
      case '.zip': contentType = 'application/zip'; break;
    }

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
        // Enable long-term browser caching for static uploads
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    });

  } catch (error) {
    console.error('[ERROR] [UploadsRoute] Unexpected error during streaming:', error);
    return NextResponse.json({ error: 'خطای سرور در خروجی فایل' }, { status: 500 });
  }
}
