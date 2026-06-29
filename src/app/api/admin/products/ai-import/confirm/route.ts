import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\u0600-\u06FFa-z0-9-]+/g, '') // Remove non-Persian and non-alphanumeric characters except -
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

function getRelevantIconForCategory(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Clothing & Fashion
  if (lowerName.includes('لباس') || lowerName.includes('پوشاک') || lowerName.includes('تیشرت') || lowerName.includes('پیراهن') || lowerName.includes('شلوار') || lowerName.includes('کت') || lowerName.includes('کفش') || lowerName.includes('صندل') || lowerName.includes('کیف') || lowerName.includes('کلاه') || lowerName.includes('جوراب') || lowerName.includes('شال') || lowerName.includes('روسری') || lowerName.includes('clothing') || lowerName.includes('shirt') || lowerName.includes('pants') || lowerName.includes('shoes') || lowerName.includes('bag') || lowerName.includes('fashion') || lowerName.includes('مد')) {
    if (lowerName.includes('کفش') || lowerName.includes('shoes') || lowerName.includes('کتونی')) return 'Footprints';
    if (lowerName.includes('کیف') || lowerName.includes('bag')) return 'ShoppingBag';
    if (lowerName.includes('عینک') || lowerName.includes('glasses')) return 'Glasses';
    if (lowerName.includes('ساعت') || lowerName.includes('watch')) return 'Watch';
    return 'Shirt';
  }
  
  // Digital & Electronics
  if (lowerName.includes('گوشی') || lowerName.includes('موبایل') || lowerName.includes('تلفن') || lowerName.includes('smartphone') || lowerName.includes('phone') || lowerName.includes('تبلت') || lowerName.includes('tablet')) {
    return 'Smartphone';
  }
  if (lowerName.includes('لپتاپ') || lowerName.includes('لپ تاپ') || lowerName.includes('کامپیوتر') || lowerName.includes('laptop') || lowerName.includes('computer') || lowerName.includes('مانیتور') || lowerName.includes('monitor')) {
    return 'Laptop';
  }
  if (lowerName.includes('هدفون') || lowerName.includes('هندزفری') || lowerName.includes('اسپیکر') || lowerName.includes('صدا') || lowerName.includes('audio') || lowerName.includes('headphones') || lowerName.includes('speaker')) {
    return 'Headphones';
  }
  if (lowerName.includes('سخت افزار') || lowerName.includes('cpu') || lowerName.includes('رم') || lowerName.includes('حافظه') || lowerName.includes('کارت گرافیک')) {
    return 'Cpu';
  }
  if (lowerName.includes('دیجیتال') || lowerName.includes('الکترونیک') || lowerName.includes('تکنولوژی') || lowerName.includes('gadget') || lowerName.includes('گجت')) {
    return 'Tv';
  }
  
  // Home & Kitchen
  if (lowerName.includes('خانه') || lowerName.includes('آشپزخانه') || lowerName.includes('دکور') || lowerName.includes('مبل') || lowerName.includes('صندلی') || lowerName.includes('تخت') || lowerName.includes('فرش') || lowerName.includes('لوستر') || lowerName.includes('home') || lowerName.includes('kitchen') || lowerName.includes('furniture')) {
    if (lowerName.includes('مبل') || lowerName.includes('صندلی') || lowerName.includes('sofa') || lowerName.includes('chair')) return 'Sofa';
    if (lowerName.includes('تخت') || lowerName.includes('bed') || lowerName.includes('خواب')) return 'Bed';
    if (lowerName.includes('لامپ') || lowerName.includes('روشنایی') || lowerName.includes('lamp') || lowerName.includes('لوستر')) return 'Lamp';
    return 'Home';
  }
  
  // Food & Drinks
  if (lowerName.includes('غذا') || lowerName.includes('رستوران') || lowerName.includes('خوراکی') || lowerName.includes('نوشیدنی') || lowerName.includes('قهوه') || lowerName.includes('شکلات') || lowerName.includes('کافه') || lowerName.includes('food') || lowerName.includes('drink') || lowerName.includes('coffee')) {
    if (lowerName.includes('قهوه') || lowerName.includes('کاپوچینو') || lowerName.includes('چای') || lowerName.includes('coffee') || lowerName.includes('tea')) return 'Coffee';
    if (lowerName.includes('کیک') || lowerName.includes('شیرینی') || lowerName.includes('cake')) return 'Cake';
    if (lowerName.includes('پیتزا') || lowerName.includes('pizza')) return 'Pizza';
    return 'Utensils';
  }
  
  // Cosmetics & Beauty
  if (lowerName.includes('آرایشی') || lowerName.includes('بهداشتی') || lowerName.includes('زیبایی') || lowerName.includes('پوست') || lowerName.includes('مو') || lowerName.includes('عطر') || lowerName.includes('ادکلن') || lowerName.includes('cosmetic') || lowerName.includes('beauty') || lowerName.includes('perfume')) {
    return 'Sparkles';
  }
  
  // Tools & Industrial
  if (lowerName.includes('ابزار') || lowerName.includes('صنعتی') || lowerName.includes('پیچ') || lowerName.includes('آچار') || lowerName.includes('دریل') || lowerName.includes('تجهیزات') || lowerName.includes('tools') || lowerName.includes('wrench')) {
    return 'Wrench';
  }
  
  // Books & Stationery
  if (lowerName.includes('کتاب') || lowerName.includes('دفتر') || lowerName.includes('لوازم تحریر') || lowerName.includes('تحریر') || lowerName.includes('آموزش') || lowerName.includes('book') || lowerName.includes('stationery') || lowerName.includes('education')) {
    return 'BookOpen';
  }
  
  // Sports & Travel
  if (lowerName.includes('ورزش') || lowerName.includes('باشگاه') || lowerName.includes('سفر') || lowerName.includes('مسافرت') || lowerName.includes('کوهنوردی') || lowerName.includes('دوچرخه') || lowerName.includes('sport') || lowerName.includes('travel') || lowerName.includes('gym')) {
    if (lowerName.includes('دوچرخه') || lowerName.includes('bike')) return 'Bike';
    if (lowerName.includes('باشگاه') || lowerName.includes('دمبل') || lowerName.includes('dumbbell')) return 'Dumbbell';
    return 'Trophy';
  }
  
  // Gifts & Toys
  if (lowerName.includes('کادو') || lowerName.includes('هدیه') || lowerName.includes('اسباب بازی') || lowerName.includes('بازی') || lowerName.includes('gift') || lowerName.includes('toy')) {
    if (lowerName.includes('بازی') || lowerName.includes('game')) return 'Gamepad';
    return 'Gift';
  }
  
  // Pet Shop
  if (lowerName.includes('حیوانات') || lowerName.includes('پت') || lowerName.includes('سگ') || lowerName.includes('گربه') || lowerName.includes('pet') || lowerName.includes('dog') || lowerName.includes('cat')) {
    return 'Dog';
  }
  
  // Default fallback
  return 'Folder';
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'لیست محصولات ارسالی نامعتبر است.' }, { status: 400 });
    }

    const shopId = payload.shopId;

    // 1. Enforce package product limits
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId },
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
        where: { shopId }
      });

      if (currentProductCount + products.length > maxProducts) {
        return NextResponse.json({
          error: `شما به حد نصاب تعریف محصول پکیج خود (${maxProducts} کالا) رسیده‌اید. امکان درون‌ریزی ${products.length} محصول جدید وجود ندارد. لطفاً پکیج خود را ارتقا دهید.`
        }, { status: 403 });
      }
    }

    const importedProducts = [];

    // 2. Process each product
    for (const p of products) {
      let categoryId = null;

      // Handle Category creation/matching
      if (p.categoryName && p.categoryName.trim()) {
        const catName = p.categoryName.trim();
        let category = await prisma.category.findFirst({
          where: {
            shopId,
            name: catName
          }
        });

        if (!category) {
          let slug = slugify(catName);
          if (!slug) {
            slug = `cat-${Math.floor(Math.random() * 10000)}`;
          }

          // Ensure unique slug per shop
          const existingSlug = await prisma.category.findFirst({
            where: {
              shopId,
              slug
            }
          });

          if (existingSlug) {
            slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
          }

          category = await prisma.category.create({
            data: {
              shopId,
              name: catName,
              slug,
              icon: getRelevantIconForCategory(catName),
              isActive: true
            }
          });
        }

        categoryId = category.id;
      }

      // Create Product and Variants
      const product = await prisma.product.create({
        data: {
          shopId,
          title: p.title,
          brand: p.brand || null,
          description: p.description || null,
          fullDescription: p.fullDescription || null,
          price: parseFloat(p.price) || 0,
          discount: parseFloat(p.discount) || 0,
          stock: p.type === 'digital' ? 999999 : (parseInt(p.stock) || 0),
          type: p.type || 'physical',
          categoryId,
          isActive: true,
          features: p.features ? JSON.stringify(p.features) : null,
          specs: p.specs ? JSON.stringify(p.specs) : null,
          variants: p.variants && p.variants.length > 0 ? {
            create: p.variants.map((v: any) => ({
              shopId,
              name: v.name,
              price: parseFloat(v.price) || parseFloat(p.price) || 0,
              stock: parseInt(v.stock) || 0,
              colorCode: v.colorCode || null
            }))
          } : undefined
        },
        include: {
          variants: true
        }
      });

      importedProducts.push(product);
    }

    return NextResponse.json({
      success: true,
      message: `تعداد ${importedProducts.length} محصول با موفقیت درون‌ریزی شد.`,
      products: importedProducts
    });

  } catch (error: any) {
    console.error('Error confirming AI Import:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
