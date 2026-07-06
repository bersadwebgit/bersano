import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateBusinessBlueprint } from '@/lib/ai/store-seed/blueprint';
import { getOrCreateSeedProfile } from '@/lib/ai/store-seed/profile';

export async function POST(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const shopId = decoded.shopId;
    const body = await request.json();

    const profile = await getOrCreateSeedProfile(shopId, body);

    const blueprint = await generateBusinessBlueprint(shopId, {
      shopName: body.shopName || 'فروشگاه من',
      description: body.shortDescription || '',
      businessField: body.businessField || 'general',
      productType: body.productType || 'digital',
      shortDescription: body.shortDescription || '',
      targetAudience: body.targetAudience || '',
      brandTone: body.brandTone || '',
      activityLocation: body.activityLocation || ''
    });

    return NextResponse.json({ success: true, blueprint });
  } catch (error: any) {
    console.error('[API Blueprint] Error:', error);
    return NextResponse.json({ error: error?.message || 'خطایی در تولید بلوپرینت رخ داد.' }, { status: 500 });
  }
}
