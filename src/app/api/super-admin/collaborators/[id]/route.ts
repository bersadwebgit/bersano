import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyPlatformSession } from '@/lib/platform-auth';

// Only superadmin can edit/delete platform collaborators
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, email, password, role, isActive, notes } = body;

    const existingCollab = await prisma.platformCollaborator.findUnique({
      where: { id },
    });

    if (!existingCollab) {
      return NextResponse.json({ error: 'همکار یافت نشد' }, { status: 444 });
    }

    const data: any = {};
    if (name) data.name = name;
    if (email) {
      const emailNormalized = email.trim().toLowerCase();
      if (emailNormalized !== existingCollab.email) {
        const emailExists = await prisma.platformCollaborator.findFirst({
          where: { email: emailNormalized, NOT: { id } },
        });
        if (emailExists) {
          return NextResponse.json({ error: 'این ایمیل توسط همکار دیگری ثبت شده است' }, { status: 400 });
        }
        data.email = emailNormalized;
      }
    }
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password, 10);
    }
    if (role) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (notes !== undefined) data.notes = notes;

    const updatedCollab = await prisma.platformCollaborator.update({
      where: { id },
      data,
    });

    const { password: _, ...safeCollab } = updatedCollab;
    return NextResponse.json(safeCollab);
  } catch (error) {
    console.error('Error updating collaborator:', error);
    return NextResponse.json({ error: 'خطای سرور در ویرایش اطلاعات همکار' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingCollab = await prisma.platformCollaborator.findUnique({
      where: { id },
    });

    if (!existingCollab) {
      return NextResponse.json({ error: 'همکار یافت نشد' }, { status: 444 });
    }

    await prisma.platformCollaborator.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف همکار' }, { status: 500 });
  }
}
