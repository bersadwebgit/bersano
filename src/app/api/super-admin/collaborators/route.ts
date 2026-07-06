import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyPlatformSession } from '@/lib/platform-auth';

// Only allow superadmin role to list/create platform collaborators
export async function GET(request: Request) {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'علاوه بر ورود به پنل، دسترسی به این بخش فقط برای سوپر ادمین مجاز است' }, { status: 401 });
  }

  try {
    const collaborators = await prisma.platformCollaborator.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Expose collaborators but do not return password hashes
    const safeCollaborators = collaborators.map(({ password, ...rest }) => rest);

    return NextResponse.json(safeCollaborators);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت لیست همکاران' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role, isActive, notes } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'پر کردن نام، ایمیل، رمز عبور و نقش الزامی است' }, { status: 400 });
    }

    const emailNormalized = email.trim().toLowerCase();

    // Check if email already exists in PlatformCollaborator
    const existingCollab = await prisma.platformCollaborator.findUnique({
      where: { email: emailNormalized },
    });

    if (existingCollab) {
      return NextResponse.json({ error: 'این ایمیل قبلا به عنوان همکار پلتفرم ثبت شده است' }, { status: 400 });
    }

    // Check if email already exists in User table as superadmin to prevent collisions
    const existingUser = await prisma.user.findFirst({
      where: { email: emailNormalized, role: 'superadmin' },
      allowCrossTenant: true
    } as any);

    if (existingUser) {
      return NextResponse.json({ error: 'این ایمیل به عنوان سوپر ادمین اصلی در سیستم ثبت شده است' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const collaborator = await prisma.platformCollaborator.create({
      data: {
        name,
        email: emailNormalized,
        password: hashedPassword,
        role,
        isActive: isActive !== undefined ? isActive : true,
        notes,
      },
    });

    const { password: _, ...safeCollab } = collaborator;
    return NextResponse.json(safeCollab, { status: 201 });
  } catch (error) {
    console.error('Error creating collaborator:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت همکار جدید' }, { status: 500 });
  }
}
