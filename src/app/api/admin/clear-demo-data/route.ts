import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { clearShopDemoData } from '@/lib/clear-demo-data';

export async function POST(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearShopDemoData(decoded.shopId, { resetSetupWizard: false });

    return NextResponse.json({
      success: true,
      message: 'اطلاعات تستی با موفقیت حذف شدند. محتوای واقعی شما دست‌نخورده باقی ماند.'
    });

  } catch (error) {
    console.error('Error clearing demo data:', error);
    return NextResponse.json(
      { error: 'خطایی در سرور رخ داد.' },
      { status: 500 }
    );
  }
}
