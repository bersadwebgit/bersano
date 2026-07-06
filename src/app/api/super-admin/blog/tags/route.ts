import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPlatformSession } from '@/lib/platform-auth';

export async function GET() {
  const session = await verifyPlatformSession(['superadmin', 'content_manager', 'seo_manager']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tags = await prisma.platformBlogTag.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching central tags:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await verifyPlatformSession(['superadmin', 'content_manager']);
  if (!session) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'نام برچسب الزامی است' }, { status: 400 });
    }

    const tag = await prisma.platformBlogTag.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    console.error('Error creating central tag:', error);
    return NextResponse.json({ error: 'خطا در ثبت برچسب؛ احتمالاً تکراری است.' }, { status: 400 });
  }
}
