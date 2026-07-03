import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSeedJobStatus } from '@/lib/ai/store-seed/profile';
import { saveSeedData } from '@/lib/ai/store-seed/save-seed';

export async function POST(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const shopId = decoded.shopId;
    const body = await request.json();
    const { jobId, shopName, themeColor, contactPhone, contactEmail, address } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'شناسه کار نامعتبر است.' }, { status: 400 });
    }

    // 1. Fetch seed job status
    const job = await getSeedJobStatus(shopId);
    if (!job || job.id !== jobId) {
      return NextResponse.json({ error: 'کار تولید پیش‌نمایش یافت نشد.' }, { status: 404 });
    }

    let previewData: any;
    try {
      previewData = typeof job.previewJson === 'string' ? JSON.parse(job.previewJson) : job.previewJson;
    } catch {
      return NextResponse.json({ error: 'داده‌های پیش‌نمایش خراب هستند.' }, { status: 400 });
    }

    if (!previewData || !previewData.blueprint) {
      return NextResponse.json({ error: 'پیش‌نمایش معتبری یافت نشد.' }, { status: 400 });
    }

    // 2. Save seed data inside transaction
    const result = await saveSeedData(
      shopId,
      job.id,
      previewData.blueprint,
      previewData.categories,
      previewData.products,
      previewData.articles,
      previewData.homepage,
      {
        shopName: shopName || previewData.blueprint.businessType,
        themeColor: themeColor || '#2563eb',
        contactPhone,
        contactEmail,
        address
      }
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[API Save] Error:', error);
    return NextResponse.json({ error: error?.message || 'خطایی در ذخیره‌سازی داده‌های اولیه رخ داد.' }, { status: 500 });
  }
}
