import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFooterConfig, updateFooterConfig } from '@/app/actions/footer';

export async function GET(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getFooterConfig();
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error in footer GET api:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body;
    if (!config) {
      return NextResponse.json({ error: 'تنظیمات فوتر یافت نشد.' }, { status: 400 });
    }

    await updateFooterConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Error in footer PUT api:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
