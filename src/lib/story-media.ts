import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';

/**
 * Downloads an external image, resizes and optimizes it, saves it to local public uploads,
 * registers it in the shop's Media table, and returns the local relative URL.
 * 
 * @param url The external HTTP/HTTPS image URL
 * @param shopId The ID of the current tenant shop
 * @param isThumbnail Whether to optimize as a thumbnail size
 */
export async function downloadAndOptimizeImage(
  url: string, 
  shopId: string, 
  isThumbnail = false
): Promise<string> {
  // If not an external HTTP/HTTPS URL, return it as is
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return url;
  }

  // Skip localhost or same-domain URLs
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return url;
  }

  try {
    // Fetch image
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch external image from ${url}:`, response.statusText);
      return url;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${uniqueSuffix}-${isThumbnail ? 'thumb' : 'media'}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Optimize with Sharp
    let optimizedBuffer: Buffer;
    if (isThumbnail) {
      optimizedBuffer = await sharp(buffer)
        .resize(360, 640, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      optimizedBuffer = await sharp(buffer)
        .resize(1080, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    }

    // Write file
    await writeFile(filepath, optimizedBuffer);
    const localUrl = `/uploads/${filename}`;

    // Register in Media table
    try {
      await prisma.media.create({
        data: {
          shopId,
          url: localUrl,
          type: 'image',
          name: filename,
          size: optimizedBuffer.length,
          alt: 'Downloaded Story Media'
        }
      });
    } catch (mediaDbError) {
      console.error('Failed to register story media in database:', mediaDbError);
    }

    return localUrl;
  } catch (error) {
    console.error(`Error in downloadAndOptimizeImage for ${url}:`, error);
    return url;
  }
}
