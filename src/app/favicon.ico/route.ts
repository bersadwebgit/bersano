import { getTenantShop } from '@/lib/tenant';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const shop = await getTenantShop(undefined, true);
  
  if (shop?.faviconUrl) {
    // If the faviconUrl is already an absolute URL, redirect to it
    if (shop.faviconUrl.startsWith('http://') || shop.faviconUrl.startsWith('https://')) {
      return NextResponse.redirect(shop.faviconUrl);
    }
    
    // Otherwise, redirect to the relative URL on the same host
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return NextResponse.redirect(`${protocol}://${host}${shop.faviconUrl}`);
  }
  
  // If no favicon is configured, return a 404 so the browser doesn't show the default Next.js favicon
  return new NextResponse(null, { status: 404 });
}
