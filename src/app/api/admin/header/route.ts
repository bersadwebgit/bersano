import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getHeaderConfig, updateHeaderConfig, getMenuItems } from '@/app/actions/header';

export async function GET(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [config, menuItems] = await Promise.all([
      getHeaderConfig(),
      getMenuItems(),
    ]);

    return NextResponse.json({ config, menuItems });
  } catch (error: any) {
    console.error('Error in header GET api:', error);
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
      return NextResponse.json({ error: 'تنظیمات هدر یافت نشد.' }, { status: 400 });
    }

    await updateHeaderConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Error in header PUT api:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
