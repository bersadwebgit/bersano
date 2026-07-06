import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { clearShopDemoDataWithTx } from '@/lib/clear-demo-data';
import { Invalidate } from '@/lib/invalidate';
import { embedProduct } from '@/lib/product-embedding';
import { checkIdempotency, saveIdempotency } from '@/lib/idempotency';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { validateUrl } from '@/lib/validate-url';

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

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { shopId: payload.shopId },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const data = await req.json();

    if (data.description) data.description = sanitizeHtml(data.description);
    if (data.fullDescription) data.fullDescription = sanitizeHtml(data.fullDescription);

    if (data.imageUrl && !(await validateUrl(data.imageUrl))) {
      data.imageUrl = null;
    }
    if (data.galleryUrls && Array.isArray(data.galleryUrls)) {
      const validations = await Promise.all(data.galleryUrls.map(url => validateUrl(url)));
      data.galleryUrls = data.galleryUrls.filter((_, idx) => validations[idx]);
    }
    if (data.fileUrl && !(await validateUrl(data.fileUrl))) {
      data.fileUrl = null;
    }
    if (data.previewUrl && !(await validateUrl(data.previewUrl))) {
      data.previewUrl = null;
    }

    // Fetch active package features and current product count to enforce limits
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: payload.shopId as string },
      include: { package: true }
    });

    const isPackageActive = shopSettings?.packageExpiresAt ? new Date(shopSettings.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? shopSettings?.package : null;
    let maxProducts = 0;
    
    if (activePackage) {
      try {
        const features = JSON.parse(activePackage.features);
        if (features.maxProducts && features.maxProducts > 0) {
          maxProducts = parseInt(features.maxProducts);
        }
      } catch (e) {
        console.error("Error parsing package features:", e);
      }
    }

    if (maxProducts > 0) {
      const currentProductCount = await prisma.product.count({
        where: { shopId: payload.shopId as string }
      });

      if (currentProductCount >= maxProducts) {
        return NextResponse.json({ 
          error: `شما به حد نصاب تعریف محصول پکیج خود (${maxProducts} کالا) رسیده‌اید. برای افزایش ظرفیت، لطفاً پکیج خود را ارتقا دهید.` 
        }, { status: 403 });
      }
    }

    // Auto-correct and normalize price and wholesalePrice to prevent validation errors
    let price = parseNumber(data.price, 0);
    let wholesalePrice = data.wholesalePrice ? parseNumber(data.wholesalePrice, 0) : null;
    
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
        const rPrice = parseNumber(data.price, 0);
        if (rPrice <= 0) {
          return NextResponse.json({ error: 'قیمت تک‌فروشی برای محصول عمده‌فروشی الزامی است.' }, { status: 400 });
        }
        if (wPrice > rPrice) {
          return NextResponse.json({ error: 'قیمت عمده‌فروشی نمی‌تواند بیشتر از قیمت تک‌فروشی محصول باشد.' }, { status: 400 });
        }

        // Validate against variants if any
        if (data.variants && data.variants.length > 0) {
          const invalidVariant = data.variants.find((v: any) => parseNumber(v.price, 0) < wPrice);
          if (invalidVariant) {
            return NextResponse.json({ 
              error: `قیمت عمده‌فروشی نمی‌تواند بیشتر از قیمت تنوع "${invalidVariant.name}" باشد.` 
            }, { status: 400 });
          }
        }

        const moq = data.moq ? Math.round(parseNumber(data.moq, 1)) : 1;
        if (moq < 1) {
          return NextResponse.json({ error: 'حداقل مقدار سفارش (MOQ) باید حداقل ۱ باشد.' }, { status: 400 });
        }

        const wholesaleUnitSize = data.wholesaleUnitSize ? Math.round(parseNumber(data.wholesaleUnitSize, 1)) : 1;
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

    let categoryId = null;
    if (data.categoryId && data.categoryId !== '' && data.categoryId !== 'null' && data.categoryId !== 'undefined') {
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

    let secondaryCategoryIds: string[] = [];
    if (data.secondaryCategoryIds && Array.isArray(data.secondaryCategoryIds)) {
      const validCategories = await prisma.category.findMany({
        where: {
          id: { in: data.secondaryCategoryIds.filter(Boolean) },
          shopId: payload.shopId as string
        },
        select: { id: true }
      });
      secondaryCategoryIds = validCategories.map(c => c.id);
    }

    // If shop has demo data, clear only demo items before creating a real product
    if (shopSettings?.hasDemoData) {
      try {
        await prisma.$transaction(async (tx) => {
          await clearShopDemoDataWithTx(payload.shopId as string, tx);
        });
      } catch (clearErr) {
        console.error('Failed to clear demo data on product creation:', clearErr);
      }
    }

    // If no image is provided, generate a minimal SVG placeholder
    let finalImageUrl = data.imageUrl || null;
    if (!finalImageUrl) {
      const { generateMinimalImage } = require('@/lib/minimal-image');
      let categoryName = undefined;
      if (categoryId) {
        const category = await prisma.category.findFirst({ where: { id: categoryId, shopId: payload.shopId as string } });
        if (category) categoryName = category.name;
      }
      finalImageUrl = generateMinimalImage(data.title, 'product', categoryName, shopSettings?.themeColor || undefined);
    }

    // Enforce single default variant logic and calculate total stock if variants exist
    if (data.variants && data.variants.length > 0) {
      const hasDefault = data.variants.some((v: any) => !!v.isDefault);
      if (!hasDefault) {
        const firstInStockIdx = data.variants.findIndex((v: any) => Math.round(parseNumber(v.stock, 0)) > 0);
        const targetIdx = firstInStockIdx > -1 ? firstInStockIdx : 0;
        data.variants = data.variants.map((v: any, idx: number) => ({
          ...v,
          isDefault: idx === targetIdx,
        }));
      } else {
        let foundDefault = false;
        data.variants = data.variants.map((v: any) => {
          if (v.isDefault) {
            if (foundDefault) {
              return { ...v, isDefault: false };
            }
            foundDefault = true;
          }
          return v;
        });
      }
    }

    let calculatedStock = data.type === 'digital' ? 999999 : Math.round(parseNumber(data.stock, 0));
    if (data.variants && data.variants.length > 0 && data.type !== 'digital') {
      calculatedStock = data.variants.reduce((sum: number, v: any) => sum + Math.round(parseNumber(v.stock, 0)), 0);
    }

    const product = await prisma.product.create({
      data: {
        shopId: payload.shopId,
        title: data.title,
        brand: data.brand || null,
        description: data.description || null,
        price: parseNumber(data.price, 0),
        discount: data.discount ? parseNumber(data.discount, 0) : 0,
        discountMinQty: data.discountMinQty ? Math.round(parseNumber(data.discountMinQty, 0)) : 0,
        imageUrl: finalImageUrl,
        stock: calculatedStock,
        fullDescription: data.fullDescription || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        schemaMarkup: data.schemaMarkup || null,
        faqs: data.faqs || null,
        features: data.features || null,
        specs: data.specs || null,
        galleryUrls: data.galleryUrls || null,
        isSpecial: data.isSpecial !== undefined ? !!data.isSpecial : false,
        specialEndsAt: data.specialEndsAt ? new Date(data.specialEndsAt) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        type: data.type || 'physical',
        categoryId,
        categories: secondaryCategoryIds.length > 0 ? {
          connect: secondaryCategoryIds.map(id => ({ id }))
        } : undefined,
        fileUrl: data.fileUrl || null,
        downloadLimit: data.downloadLimit ? Math.round(parseNumber(data.downloadLimit, 0)) : 0,
        downloadExpiryDays: data.downloadExpiryDays ? Math.round(parseNumber(data.downloadExpiryDays, 0)) : 0,
        downloadIpRestriction: !!data.downloadIpRestriction,
        fileFormat: data.fileFormat || null,
        fileSize: data.fileSize || null,
        previewUrl: data.previewUrl || null,
        techSpecs: data.techSpecs || null,
        downloadFiles: data.downloadFiles || null,
        wholesalePrice: data.wholesalePrice ? parseNumber(data.wholesalePrice, null) : null,
        wholesaleTiers: data.wholesaleTiers || '[]',
        wholesaleExclusivePrices: data.wholesaleExclusivePrices || '[]',
        moq: data.moq ? Math.round(parseNumber(data.moq, 1)) : 1,
        wholesaleUnit: data.wholesaleUnit || 'عدد',
        wholesaleUnitSize: data.wholesaleUnitSize ? Math.round(parseNumber(data.wholesaleUnitSize, 1)) : 1,
        weight: data.weight ? parseNumber(data.weight, 0) : 0,
        volume: data.volume ? parseNumber(data.volume, 0) : 0,
        isWholesaleOnly: !!data.isWholesaleOnly,
        variants: data.variants && data.variants.length > 0 ? {
          create: data.variants.map((v: any) => ({
            shopId: payload.shopId,
            name: v.name,
            colorCode: v.colorCode || null,
            imageUrl: v.imageUrl || null,
            price: parseNumber(v.price, 0),
            stock: Math.round(parseNumber(v.stock, 0)),
            isDefault: !!v.isDefault,
            sku: v.sku || null,
            optionsJson: v.optionsJson || null,
          }))
        } : undefined
      },
    });

    // Hide the sample blog post (tutorial) if it exists and is published
    try {
      await prisma.blogPost.updateMany({
        where: {
          shopId: payload.shopId,
          slug: 'shop-management-guide',
          status: 'published'
        },
        data: {
          status: 'draft'
        }
      });
    } catch (blogErr) {
      console.error('Failed to hide sample blog post on product creation:', blogErr);
    }

    await Invalidate.products(payload.shopId as string);

    // Trigger embedding generation in background (non-blocking)
    embedProduct(product.id, payload.shopId).catch((err) => {
      console.error('[POST Product] Background embedding failed:', err);
    });

    const responseObj = { product };
    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, responseObj);
    }

    return NextResponse.json(responseObj);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}