import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// Helper to escape CSV values
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val).replace(/"/g, '""');
  }
  return String(val).replace(/"/g, '""');
}

// Convert data to CSV string
function convertToCSV(data: any[], headers: string[], keys: (string | ((item: any) => any))[]): string {
  const csvRows: string[] = [];
  
  // Add headers with UTF-8 BOM for Excel compatibility
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const item of data) {
    const values = keys.map(key => {
      const val = typeof key === 'function' ? key(item) : item[key];
      return `"${escapeCSVValue(val)}"`;
    });
    csvRows.push(values.join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF) to ensure Excel opens Persian characters correctly
  return '\uFEFF' + csvRows.join('\r\n');
}

// Helper to sanitize ShopSettings for export
function sanitizeSettingsForExport(settings: any): any {
  if (!settings) return null;
  const {
    id,
    shopId,
    subdomain,
    customDomain,
    isApproved,
    isActive,
    packageId,
    packageExpiresAt,
    bgRemovalCount,
    aiMemory,
    createdAt,
    updatedAt,
    // Sensitive gateway/integration credentials
    zarinpalMerchantId,
    zibalMerchantId,
    digipayClientId,
    digipayClientSecret,
    digipayUsername,
    digipayPassword,
    tipaxUsername,
    tipaxPassword,
    tipaxApiKey,
    mahakApiKey,
    mahakServerUrl,
    mahakUsername,
    mahakPassword,
    baleIntegrationToken,
    baleChatId,
    telegramIntegrationToken,
    telegramChatId,
    smsConfig,
    ...safeSettings
  } = settings;

  return {
    ...safeSettings,
    zarinpalMerchantId: "",
    zibalMerchantId: "",
    digipayClientId: "",
    digipayClientSecret: "",
    digipayUsername: "",
    digipayPassword: "",
    tipaxUsername: "",
    tipaxPassword: "",
    tipaxApiKey: "",
    mahakApiKey: "",
    mahakServerUrl: "",
    mahakUsername: "",
    mahakPassword: "",
    baleIntegrationToken: "",
    baleChatId: "",
    telegramIntegrationToken: "",
    telegramChatId: "",
    smsConfig: JSON.stringify({ enabled: false, provider: "", credentials: {}, patterns: {}, adminPhone: "" })
  };
}

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'products'; // products, categories, settings, full
    const format = searchParams.get('format') || 'json'; // json, csv

    const shopId = payload.shopId;

    // Fetch shop settings for metadata
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId },
    });
    const siteName = shopSettings?.shopName || 'My Shop';

    if (type === 'products') {
      const products = await prisma.product.findMany({
        where: { shopId },
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'csv') {
        const headers = [
          'شناسه',
          'عنوان',
          'نوع',
          'شناسه دسته‌بندی',
          'قیمت',
          'تخفیف',
          'آدرس تصویر',
          'موجودی',
          'توضیحات کوتاه',
          'توضیحات کامل',
          'برند',
          'عنوان سئو',
          'توضیحات سئو',
          'فعال',
          'پیشنهاد ویژه',
          'تاریخ پایان پیشنهاد ویژه',
          'سوالات متداول',
          'ویژگی‌ها',
          'مشخصات فنی',
          'گالری تصاویر',
          'آدرس فایل دانلودی',
          'محدودیت دانلود',
          'انقضای لینک دانلود به روز',
          'محدودیت آی‌پی دانلود',
          'فرمت فایل',
          'حجم فایل',
          'آدرس پیش‌نمایش',
          'نیازمندی‌های فنی',
          'فایل‌های دانلودی چندگانه',
          'تنوع‌ها'
        ];

        const keys = [
          'id',
          'title',
          'type',
          'categoryId',
          'price',
          'discount',
          'imageUrl',
          'stock',
          'description',
          'fullDescription',
          'brand',
          'seoTitle',
          'seoDescription',
          (p: any) => p.isActive ? 'true' : 'false',
          (p: any) => p.isSpecial ? 'true' : 'false',
          (p: any) => p.specialEndsAt ? p.specialEndsAt.toISOString() : '',
          'faqs',
          'features',
          'specs',
          'galleryUrls',
          'fileUrl',
          'downloadLimit',
          'downloadExpiryDays',
          (p: any) => p.downloadIpRestriction ? 'true' : 'false',
          'fileFormat',
          'fileSize',
          'previewUrl',
          'techSpecs',
          'downloadFiles',
          (p: any) => p.variants ? p.variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            colorCode: v.colorCode,
            imageUrl: v.imageUrl,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            optionsJson: v.optionsJson
          })) : []
        ];

        const csvContent = convertToCSV(products, headers, keys);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="products_${shopId}_${Date.now()}.csv"`,
          },
        });
      } else {
        // JSON format (v3.0 canonical)
        const exportData = {
          version: '3.0',
          app: 'shop_final',
          type: 'products',
          exportedAt: new Date().toISOString(),
          source: {
            shopId,
            siteName,
          },
          sections: {
            products: products.length,
          },
          data: {
            products,
          },
        };
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="products_${shopId}_${Date.now()}.json"`,
          },
        });
      }
    }

    if (type === 'categories') {
      const categories = await prisma.category.findMany({
        where: { shopId },
        orderBy: { name: 'asc' },
      });

      if (format === 'csv') {
        const headers = [
          'شناسه',
          'نام دسته‌بندی',
          'اسلاگ (نام انگلیسی در آدرس)',
          'توضیحات',
          'آدرس تصویر',
          'شناسه دسته‌بندی والد',
          'فعال'
        ];

        const keys = [
          'id',
          'name',
          'slug',
          'description',
          'imageUrl',
          'parentId',
          (c: any) => c.isActive ? 'true' : 'false'
        ];

        const csvContent = convertToCSV(categories, headers, keys);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="categories_${shopId}_${Date.now()}.csv"`,
          },
        });
      } else {
        // JSON format (v3.0 canonical)
        const exportData = {
          version: '3.0',
          app: 'shop_final',
          type: 'categories',
          exportedAt: new Date().toISOString(),
          source: {
            shopId,
            siteName,
          },
          sections: {
            categories: categories.length,
          },
          data: {
            categories,
          },
        };
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="categories_${shopId}_${Date.now()}.json"`,
          },
        });
      }
    }

    if (type === 'settings') {
      const sanitizedSettings = sanitizeSettingsForExport(shopSettings);

      // JSON format (v3.0 canonical)
      const exportData = {
        version: '3.0',
        app: 'shop_final',
        type: 'settings',
        exportedAt: new Date().toISOString(),
        source: {
          shopId,
          siteName,
        },
        sections: {
          settings: true,
        },
        data: {
          settings: sanitizedSettings,
        },
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="settings_${shopId}_${Date.now()}.json"`,
        },
      });
    }

    if (type === 'full') {
      const [
        products,
        categories,
        brands,
        sliders,
        menus,
        discounts,
        blogCategories,
        blogPosts,
        productSets,
        stories,
        media,
      ] = await Promise.all([
        prisma.product.findMany({
          where: { shopId },
          include: { variants: true },
        }),
        prisma.category.findMany({
          where: { shopId },
        }),
        prisma.brand.findMany({
          where: { shopId },
        }),
        prisma.heroSlide.findMany({
          where: { shopId },
        }),
        prisma.menuItem.findMany({
          where: { shopId },
          orderBy: { order: 'asc' },
        }),
        prisma.discountCode.findMany({
          where: { shopId },
        }),
        prisma.blogCategory.findMany({
          where: { shopId },
        }),
        prisma.blogPost.findMany({
          where: { shopId },
        }),
        prisma.productSet.findMany({
          where: { shopId },
          include: { items: true },
        }),
        prisma.story.findMany({
          where: { shopId },
        }),
        prisma.media.findMany({
          where: { shopId },
        }),
      ]);

      const sanitizedSettings = sanitizeSettingsForExport(shopSettings);

      const fullBackup = {
        version: '3.0',
        app: 'shop_final',
        type: 'full',
        exportedAt: new Date().toISOString(),
        source: {
          shopId,
          siteName,
        },
        sections: {
          settings: !!sanitizedSettings,
          categories: categories.length,
          brands: brands.length,
          products: products.length,
          sliders: sliders.length,
          menus: menus.length,
          discounts: discounts.length,
          blogCategories: blogCategories.length,
          blogPosts: blogPosts.length,
          productSets: productSets.length,
          stories: stories.length,
          media: media.length,
        },
        data: {
          settings: sanitizedSettings,
          categories,
          brands,
          products,
          sliders,
          menus,
          discounts,
          blogCategories,
          blogPosts,
          productSets,
          stories,
          media,
        },
      };

      return new NextResponse(JSON.stringify(fullBackup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="full_backup_${shopId}_${Date.now()}.json"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
