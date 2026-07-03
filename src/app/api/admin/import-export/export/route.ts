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
            stock: v.stock
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
        // JSON format
        return new NextResponse(JSON.stringify(products, null, 2), {
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
        return new NextResponse(JSON.stringify(categories, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="categories_${shopId}_${Date.now()}.json"`,
          },
        });
      }
    }

    if (type === 'settings') {
      const settings = await prisma.shopSettings.findUnique({
        where: { shopId },
      });

      return new NextResponse(JSON.stringify(settings, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="settings_${shopId}_${Date.now()}.json"`,
        },
      });
    }

    if (type === 'full') {
      const products = await prisma.product.findMany({
        where: { shopId },
        include: { variants: true },
      });

      const categories = await prisma.category.findMany({
        where: { shopId },
      });

      const settings = await prisma.shopSettings.findUnique({
        where: { shopId },
      });

      const brands = await prisma.brand.findMany({
        where: { shopId },
      });

      const sliders = await prisma.heroSlide.findMany({
        where: { shopId },
      });

      const fullBackup = {
        version: '1.0',
        shopId,
        exportedAt: new Date().toISOString(),
        settings,
        categories,
        products,
        brands,
        sliders,
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
