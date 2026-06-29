import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { syncDemoDataFlag } from '@/lib/clear-demo-data';
import { Invalidate } from '@/lib/invalidate';
import { embedProduct } from '@/lib/product-embedding';
import { checkIdempotency, saveIdempotency } from '@/lib/idempotency';

function parseNumber(val: any, defaultValue: any = 0): any {
  if (val === undefined || val === null) return defaultValue;
  let str = String(val).trim();
  if (!str) return defaultValue;
  
  // Convert Persian/Arabic digits to English digits
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    str = str.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  
  // Remove commas (often used as thousand separators e.g., "12,000" or "۱۲,۰۰۰")
  str = str.replace(/,/g, '');
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? defaultValue : parsed;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, shopId: payload.shopId },
      include: {
        variants: true,
        categories: {
          select: { id: true, name: true }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const { id } = await params;
    const data = await req.json();

    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id, shopId: payload.shopId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Auto-correct and normalize price and wholesalePrice to prevent validation errors
    let price = data.price !== undefined ? parseNumber(data.price, 0) : existingProduct.price;
    let wholesalePrice = data.wholesalePrice !== undefined ? parseNumber(data.wholesalePrice, 0) : (existingProduct.wholesalePrice ? Number(existingProduct.wholesalePrice) : null);

    if (wholesalePrice && wholesalePrice > 0) {
      if (price <= 0) {
        price = Math.round(wholesalePrice * 1.2);
        data.price = price;
      } else if (wholesalePrice >= price) {
        wholesalePrice = Math.round(price * 0.8);
        data.wholesalePrice = wholesalePrice;
      }
    }

    // Validate wholesale rules if wholesale price is provided
    if (data.wholesalePrice) {
      const wPrice = parseNumber(data.wholesalePrice, 0);
      if (wPrice > 0) {
        const rPrice = parseNumber(data.price !== undefined ? data.price : existingProduct.price, 0);
        if (rPrice <= 0) {
          return NextResponse.json({ error: 'قیمت تک‌فروشی برای محصول عمده‌فروشی الزامی است.' }, { status: 400 });
        }
        if (wPrice > rPrice) {
          return NextResponse.json({ error: 'قیمت عمده‌فروشی نمی‌تواند بیشتر از قیمت تک‌فروشی محصول باشد.' }, { status: 400 });
        }

        // Validate against variants if any
        const variantsToCheck = data.variants !== undefined ? data.variants : [];
        if (variantsToCheck.length > 0) {
          const invalidVariant = variantsToCheck.find((v: any) => parseNumber(v.price, 0) < wPrice);
          if (invalidVariant) {
            return NextResponse.json({ 
              error: `قیمت عمده‌فروشی نمی‌تواند بیشتر از قیمت تنوع "${invalidVariant.name}" باشد.` 
            }, { status: 400 });
          }
        }

        const moq = data.moq !== undefined ? Math.round(parseNumber(data.moq, 1)) : existingProduct.moq;
        if (moq < 1) {
          return NextResponse.json({ error: 'حداقل مقدار سفارش (MOQ) باید حداقل ۱ باشد.' }, { status: 400 });
        }

        const wholesaleUnitSize = data.wholesaleUnitSize !== undefined ? Math.round(parseNumber(data.wholesaleUnitSize, 1)) : existingProduct.wholesaleUnitSize;
        if (wholesaleUnitSize < 1) {
          return NextResponse.json({ error: 'تعداد در واحد عمده باید حداقل ۱ باشد.' }, { status: 400 });
        }

        // Validate tiers
        if (data.wholesaleTiers) {
          try {
            const tiers = typeof data.wholesaleTiers === 'string' ? JSON.parse(data.wholesaleTiers) : data.wholesaleTiers;
            if (Array.isArray(tiers)) {
              for (const tier of tiers) {
                if (tier.minQty < moq) {
                  return NextResponse.json({ error: `حداقل تعداد در پله‌های تخفیف عمده (${tier.minQty}) نمی‌تواند کمتر از MOQ (${moq}) باشد.` }, { status: 400 });
                }
                if (tier.discountPercent < 1 || tier.discountPercent > 100) {
                  return NextResponse.json({ error: 'درصد تخفیف پله‌ای باید بین ۱ تا ۱۰۰ باشد.' }, { status: 400 });
                }
                if (tier.maxQty !== null && tier.maxQty !== undefined && tier.maxQty <= tier.minQty) {
                  return NextResponse.json({ error: 'حداکثر تعداد در پله تخفیف باید بیشتر از حداقل تعداد آن باشد.' }, { status: 400 });
                }
              }
            }
          } catch (e) {
            return NextResponse.json({ error: 'فرمت پله‌های تخفیف عمده نامعتبر است.' }, { status: 400 });
          }
        }

        // Validate exclusive prices
        if (data.wholesaleExclusivePrices) {
          try {
            const exclusivePrices = typeof data.wholesaleExclusivePrices === 'string' ? JSON.parse(data.wholesaleExclusivePrices) : data.wholesaleExclusivePrices;
            if (Array.isArray(exclusivePrices)) {
              for (const ep of exclusivePrices) {
                if (!ep.price || ep.price <= 0) {
                  return NextResponse.json({ error: 'قیمت اختصاصی گروه‌ها باید بزرگتر از ۰ باشد.' }, { status: 400 });
                }
                if (ep.price > wPrice) {
                  return NextResponse.json({ error: `قیمت اختصاصی گروه "${ep.target}" نمی‌تواند بیشتر از قیمت پایه عمده‌فروشی باشد.` }, { status: 400 });
                }
              }
            }
          } catch (e) {
            return NextResponse.json({ error: 'فرمت قیمت‌های اختصاصی نامعتبر است.' }, { status: 400 });
          }
        }
      }
    }

    // Validate category if provided
    let categoryId = undefined;
    if (data.categoryId !== undefined) {
      if (data.categoryId === '' || data.categoryId === 'null' || data.categoryId === 'undefined' || data.categoryId === null) {
        categoryId = null;
      } else {
        const category = await prisma.category.findFirst({
          where: {
            shopId: payload.shopId as string,
            OR: [
              { id: data.categoryId },
              { name: data.categoryId },
              { slug: data.categoryId }
            ]
          }
        });
        if (category) {
          categoryId = category.id;
        } else {
          const looseCategory = await prisma.category.findFirst({
            where: {
              shopId: payload.shopId as string,
              name: { contains: data.categoryId, mode: 'insensitive' }
            }
          });
          if (looseCategory) {
            categoryId = looseCategory.id;
          } else {
            categoryId = null; // Set to null instead of failing
          }
        }
      }
    }

    let secondaryCategoryIds: string[] | undefined = undefined;
    if (data.secondaryCategoryIds !== undefined) {
      if (Array.isArray(data.secondaryCategoryIds)) {
        const validCategories = await prisma.category.findMany({
          where: {
            id: { in: data.secondaryCategoryIds.filter(Boolean) },
            shopId: payload.shopId as string
          },
          select: { id: true }
        });
        secondaryCategoryIds = validCategories.map(c => c.id);
      } else {
        secondaryCategoryIds = [];
      }
    }

    // Handle variants update
    if (data.variants) {
      // Get existing variants
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: id, shopId: payload.shopId }
      });
      
      const existingVariantIds = existingVariants.map(v => v.id);
      const incomingVariantIds = data.variants.filter((v: any) => v.id).map((v: any) => v.id);
      
      // Delete variants that are no longer present
      const variantsToDelete = existingVariantIds.filter(id => !incomingVariantIds.includes(id));
      if (variantsToDelete.length > 0) {
        await prisma.productVariant.deleteMany({
          where: { id: { in: variantsToDelete }, shopId: payload.shopId }
        });
      }
      
      // Update or create variants
      for (const variant of data.variants) {
        if (variant.id) {
          await prisma.productVariant.update({
            where: { 
              id: variant.id,
              shopId: payload.shopId
            } as any,
            data: {
              name: variant.name,
              colorCode: variant.colorCode || null,
              imageUrl: variant.imageUrl || null,
              price: parseNumber(variant.price, 0),
              stock: Math.round(parseNumber(variant.stock, 0)),
              isDefault: !!variant.isDefault
            }
          });
        } else {
          await prisma.productVariant.create({
            data: {
              shopId: payload.shopId,
              productId: id,
              name: variant.name,
              colorCode: variant.colorCode || null,
              imageUrl: variant.imageUrl || null,
              price: parseNumber(variant.price, 0),
              stock: Math.round(parseNumber(variant.stock, 0)),
              isDefault: !!variant.isDefault
            }
          });
        }
      }
    }

    // If no image is provided or it is explicitly set to null/empty, generate a minimal SVG placeholder
    let finalImageUrl = data.imageUrl !== undefined ? data.imageUrl : existingProduct.imageUrl;
    if (!finalImageUrl && data.title) {
      const { generateMinimalImage } = require('@/lib/minimal-image');
      let categoryName = undefined;
      const targetCategoryId = categoryId !== undefined ? categoryId : existingProduct.categoryId;
      if (targetCategoryId) {
        const category = await prisma.category.findFirst({ where: { id: targetCategoryId, shopId: payload.shopId } });
        if (category) categoryName = category.name;
      }
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: payload.shopId as string }
      });
      finalImageUrl = generateMinimalImage(data.title || existingProduct.title, 'product', categoryName, shopSettings?.themeColor || undefined);
    }

    const product = await prisma.product.update({
      where: { 
        id,
        shopId: payload.shopId
      } as any,
      data: {
        title: data.title,
        brand: data.brand !== undefined ? data.brand : (existingProduct as any).brand,
        description: data.description !== undefined ? data.description : existingProduct.description,
        price: data.price ? parseNumber(data.price, 0) : existingProduct.price,
        discount: data.discount !== undefined ? (data.discount ? parseNumber(data.discount, 0) : 0) : existingProduct.discount,
        discountMinQty: data.discountMinQty !== undefined ? (data.discountMinQty ? Math.round(parseNumber(data.discountMinQty, 0)) : 0) : existingProduct.discountMinQty,
        imageUrl: finalImageUrl,
        galleryUrls: data.galleryUrls !== undefined ? data.galleryUrls : existingProduct.galleryUrls,
        stock: data.stock !== undefined ? Math.round(parseNumber(data.stock, 0)) : existingProduct.stock,
        fullDescription: data.fullDescription !== undefined ? data.fullDescription : existingProduct.fullDescription,
        seoTitle: data.seoTitle !== undefined ? data.seoTitle : (existingProduct as any).seoTitle,
        seoDescription: data.seoDescription !== undefined ? data.seoDescription : (existingProduct as any).seoDescription,
        schemaMarkup: data.schemaMarkup !== undefined ? data.schemaMarkup : (existingProduct as any).schemaMarkup,
        faqs: data.faqs !== undefined ? data.faqs : (existingProduct as any).faqs,
        features: data.features !== undefined ? data.features : existingProduct.features,
        specs: data.specs !== undefined ? data.specs : existingProduct.specs,
        isSpecial: data.isSpecial !== undefined ? !!data.isSpecial : existingProduct.isSpecial,
        specialEndsAt: data.specialEndsAt !== undefined ? (data.specialEndsAt ? new Date(data.specialEndsAt) : null) : existingProduct.specialEndsAt,
        isActive: data.isActive !== undefined ? data.isActive : existingProduct.isActive,
        type: data.type || existingProduct.type,
        categoryId: categoryId !== undefined ? categoryId : existingProduct.categoryId,
        categories: secondaryCategoryIds !== undefined ? {
          set: secondaryCategoryIds.map(id => ({ id }))
        } : undefined,
        fileUrl: data.fileUrl !== undefined ? data.fileUrl : existingProduct.fileUrl,
        downloadLimit: data.downloadLimit !== undefined ? (data.downloadLimit ? Math.round(parseNumber(data.downloadLimit, 0)) : 0) : existingProduct.downloadLimit,
        downloadExpiryDays: data.downloadExpiryDays !== undefined ? (data.downloadExpiryDays ? Math.round(parseNumber(data.downloadExpiryDays, 0)) : 0) : existingProduct.downloadExpiryDays,
        downloadIpRestriction: data.downloadIpRestriction !== undefined ? !!data.downloadIpRestriction : existingProduct.downloadIpRestriction,
        fileFormat: data.fileFormat !== undefined ? data.fileFormat : existingProduct.fileFormat,
        fileSize: data.fileSize !== undefined ? data.fileSize : existingProduct.fileSize,
        previewUrl: data.previewUrl !== undefined ? data.previewUrl : existingProduct.previewUrl,
        techSpecs: data.techSpecs !== undefined ? data.techSpecs : existingProduct.techSpecs,
        downloadFiles: data.downloadFiles !== undefined ? data.downloadFiles : existingProduct.downloadFiles,
        wholesalePrice: data.wholesalePrice !== undefined ? (data.wholesalePrice ? parseNumber(data.wholesalePrice, null) : null) : existingProduct.wholesalePrice,
        wholesaleTiers: data.wholesaleTiers !== undefined ? data.wholesaleTiers : existingProduct.wholesaleTiers,
        wholesaleExclusivePrices: data.wholesaleExclusivePrices !== undefined ? data.wholesaleExclusivePrices : existingProduct.wholesaleExclusivePrices,
        moq: data.moq !== undefined ? Math.round(parseNumber(data.moq, 1)) : existingProduct.moq,
        wholesaleUnit: data.wholesaleUnit !== undefined ? data.wholesaleUnit : existingProduct.wholesaleUnit,
        wholesaleUnitSize: data.wholesaleUnitSize !== undefined ? Math.round(parseNumber(data.wholesaleUnitSize, 1)) : existingProduct.wholesaleUnitSize,
        weight: data.weight !== undefined ? parseNumber(data.weight, 0) : existingProduct.weight,
        volume: data.volume !== undefined ? parseNumber(data.volume, 0) : existingProduct.volume,
        isWholesaleOnly: data.isWholesaleOnly !== undefined ? !!data.isWholesaleOnly : existingProduct.isWholesaleOnly,
      },
    });

    await Invalidate.product(payload.shopId as string, id);

    // Trigger embedding generation in background (non-blocking)
    embedProduct(id, payload.shopId).catch((err) => {
      console.error('[PUT Product] Background embedding failed:', err);
    });

    const responseObj = { product };
    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, responseObj);
    }

    return NextResponse.json(responseObj);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const product = await prisma.product.findFirst({
      where: { id, shopId: payload.shopId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check confirmation
    const url = new URL(req.url);
    const confirmed = url.searchParams.get('confirmed') === 'true';

    if (!confirmed) {
      return NextResponse.json({
        needsConfirmation: true,
        message: `آیا از حذف محصول "${product.title}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.`,
        diff: {
          action: 'delete',
          item: product.title,
          id: id
        }
      });
    }

    await prisma.product.delete({
      where: {
        id,
        shopId: payload.shopId,
      },
    });

    if (product.isDemo) {
      await prisma.review.deleteMany({ where: { shopId: payload.shopId, productId: id } });
      await syncDemoDataFlag(payload.shopId as string);
    }

    await Invalidate.product(payload.shopId as string, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}