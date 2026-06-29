import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function POST(request: Request) {
  try {
    const host = request.headers.get('host') || '';
    const shop = await getTenantShop(host);

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { url, referrer, visitorId } = await request.json();

    // Skip tracking for admin/super-admin paths or internal APIs
    const pathname = new URL(url, `http://${host}`).pathname;
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/super-admin') ||
      pathname.startsWith('/api')
    ) {
      return NextResponse.json({ skipped: true });
    }

    // Classify source
    let source = 'Direct';
    const referrerLower = referrer ? referrer.toLowerCase() : '';
    const urlObj = new URL(url, `http://${host}`);
    const utmSource = urlObj.searchParams.get('utm_source')?.toLowerCase();
    const refParam = urlObj.searchParams.get('ref')?.toLowerCase();

    // Check UTM or ref param first
    if (utmSource === 'instagram' || refParam === 'instagram' || referrerLower.includes('instagram.com')) {
      source = 'Instagram';
    } else if (utmSource === 'telegram' || refParam === 'telegram' || referrerLower.includes('t.me') || referrerLower.includes('telegram.org')) {
      source = 'Telegram';
    } else if (utmSource === 'google' || referrerLower.includes('google.com') || referrerLower.includes('google.')) {
      source = 'Google';
    } else if (referrer && !referrerLower.includes(host.toLowerCase())) {
      // If there is an external referrer
      source = 'Other';
    } else {
      source = 'Direct';
    }

    // Save PageView
    await prisma.pageView.create({
      data: {
        shopId: shop.shopId,
        url: pathname,
        referrer: referrer || null,
        source,
        ip: visitorId || request.headers.get('x-forwarded-for') || null,
      },
    });

    return NextResponse.json({ success: true, source });
  } catch (error) {
    console.error('[ERROR] [TrackService]: Failed to save page view:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
