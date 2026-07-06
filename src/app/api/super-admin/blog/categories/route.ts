import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPlatformSession } from '@/lib/platform-auth';

export async function GET() {
  const session = await verifyPlatformSession(['superadmin', 'content_manager', 'seo_manager']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await prisma.platformBlogCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching central categories:', error);
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
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'نام و اسلاگ الزامی هستند' }, { status: 400 });
    }

    const category = await prisma.platformBlogCategory.create({
      data: {
        name,
        slug: slug.trim().toLowerCase(),
        description,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Error creating central category:', error);
    return NextResponse.json({ error: 'خطا در ثبت دسته‌بندی؛ احتمالاً اسلاگ تکراری است.' }, { status: 400 });
  }
}
