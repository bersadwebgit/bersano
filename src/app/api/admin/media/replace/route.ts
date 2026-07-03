import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { processedId } = body;

    if (!processedId) {
      return NextResponse.json({ error: 'لطفا شناسه تصویر پردازش‌شده را ارسال کنید.' }, { status: 400 });
    }

    // 1. Fetch the processed media item
    const processedMedia = await prisma.media.findFirst({
      where: { id: processedId, shopId },
    });

    if (!processedMedia) {
      return NextResponse.json({ error: 'تصویر پردازش‌شده یافت نشد.' }, { status: 404 });
    }

    if (!processedMedia.originalId) {
      return NextResponse.json({ error: 'این تصویر دارای نسخه قبلی نیست یا قبلا جایگزین شده است.' }, { status: 400 });
    }

    // 2. Fetch the original media item
    const originalMedia = await prisma.media.findFirst({
      where: { id: processedMedia.originalId, shopId },
    });

    if (!originalMedia || originalMedia.shopId !== shopId) {
      return NextResponse.json({ error: 'تصویر اصلی یافت نشد.' }, { status: 404 });
    }

    const oldUrl = originalMedia.url;
    const newUrl = processedMedia.url;

    // 3. Delete the original physical file from disk
    try {
      const filename = oldUrl.split('/').pop();
      if (filename) {
        const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
        await unlink(filepath);
      }
    } catch (fsError) {
      console.error('Failed to delete original file from filesystem:', fsError);
    }

    // 4. Update the original media database record to point to the new URL and update its metadata
    await prisma.media.updateMany({
      where: { id: originalMedia.id, shopId },
      data: {
        url: newUrl,
        size: processedMedia.size,
        originalId: null,
        originalUrl: null,
      },
    });

    const updatedOriginal = await prisma.media.findFirst({
      where: { id: originalMedia.id, shopId },
    });

    // 5. Delete the processed media record from the database (since it is now merged into the original record)
    await prisma.media.deleteMany({
      where: { id: processedMedia.id, shopId },
    });

    // 6. Bulk update all references to oldUrl with newUrl across the database
    // Update Products (imageUrl)
    await prisma.product.updateMany({
      where: { shopId, imageUrl: oldUrl },
      data: { imageUrl: newUrl },
    });

    // Update Product Gallery (galleryUrls column which contains JSON array of strings)
    const productsWithGallery = await prisma.product.findMany({
      where: {
        shopId,
        galleryUrls: { contains: oldUrl },
      },
    });

    for (const prod of productsWithGallery) {
      if (prod.galleryUrls) {
        try {
          const gallery: string[] = JSON.parse(prod.galleryUrls);
          if (Array.isArray(gallery)) {
            const updatedGallery = gallery.map(img => img === oldUrl ? newUrl : img);
            await prisma.product.updateMany({
              where: { id: prod.id, shopId },
              data: { galleryUrls: JSON.stringify(updatedGallery) },
            });
          }
        } catch (e) {
          console.error(`Error updating gallery images for product ${prod.id}:`, e);
        }
      }
    }

    // Update ProductVariant (imageUrl)
    await prisma.productVariant.updateMany({
      where: { shopId, imageUrl: oldUrl },
      data: { imageUrl: newUrl },
    });

    // Update Category (imageUrl)
    await prisma.category.updateMany({
      where: { shopId, imageUrl: oldUrl },
      data: { imageUrl: newUrl },
    });

    // Update Story (thumbnailUrl & mediaUrl)
    await prisma.story.updateMany({
      where: { shopId, thumbnailUrl: oldUrl },
      data: { thumbnailUrl: newUrl },
    });
    await prisma.story.updateMany({
      where: { shopId, mediaUrl: oldUrl },
      data: { mediaUrl: newUrl },
    });

    // Update BlogPost (featuredImage)
    await prisma.blogPost.updateMany({
      where: { shopId, featuredImage: oldUrl },
      data: { featuredImage: newUrl },
    });

    // Update Brand (logoUrl)
    await prisma.brand.updateMany({
      where: { shopId, logoUrl: oldUrl },
      data: { logoUrl: newUrl },
    });

    // Update ShopSettings (logoUrl & faviconUrl)
    await prisma.shopSettings.updateMany({
      where: { shopId, logoUrl: oldUrl },
      data: { logoUrl: newUrl },
    });
    await prisma.shopSettings.updateMany({
      where: { shopId, faviconUrl: oldUrl },
      data: { faviconUrl: newUrl },
    });

    return NextResponse.json({
      success: true,
      media: updatedOriginal,
    });
  } catch (error) {
    console.error('Error in replace media route:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
