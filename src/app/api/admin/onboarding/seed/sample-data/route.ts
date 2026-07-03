import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteSampleData } from '@/lib/ai/store-seed/save-seed';

export async function DELETE(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const shopId = decoded.shopId;

    await deleteSampleData(shopId);

    return NextResponse.json({ success: true, message: 'داده‌های نمونه با موفقیت حذف شدند.' });
  } catch (error: any) {
    console.error('[API Delete Sample Data] Error:', error);
    return NextResponse.json({ error: error?.message || 'خطایی در حذف داده‌های نمونه رخ داد.' }, { status: 500 });
  }
}
