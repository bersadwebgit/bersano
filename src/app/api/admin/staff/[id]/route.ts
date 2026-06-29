import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLES } from '@/lib/admin-roles';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId || payload.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();
    const { name, email, phone, password, role, isBlocked } = data;

    // Find the staff member first
    const staffMember = await prisma.user.findFirst({
      where: {
        id,
        shopId: payload.shopId,
        role: { in: ADMIN_ROLES },
      },
    });

    if (!staffMember) {
      return NextResponse.json({ error: 'همکار یافت نشد' }, { status: 404 });
    }

    // Prevent self-blocking or self-role-changing
    if (staffMember.id === payload.id) {
      if (isBlocked === true) {
        return NextResponse.json({ error: 'شما نمی‌توانید حساب خود را مسدود کنید' }, { status: 400 });
      }
      if (role && role !== 'admin') {
        return NextResponse.json({ error: 'شما نمی‌توانید نقش خود را تغییر دهید' }, { status: 400 });
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

    if (role !== undefined) {
      if (!ADMIN_ROLES.includes(role)) {
        return NextResponse.json({ error: 'نقش انتخاب شده نامعتبر است' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (email !== undefined && email.toLowerCase() !== staffMember.email.toLowerCase()) {
      // Check if email already exists in this shop
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          shopId: payload.shopId,
          id: { not: id },
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'کاربری با این ایمیل در فروشگاه شما از قبل وجود دارد' }, { status: 400 });
      }
      updateData.email = email.toLowerCase();
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedStaff = await prisma.user.update({
      where: {
        id,
        shopId: payload.shopId,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, staff: updatedStaff });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId || payload.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === payload.id) {
      return NextResponse.json({ error: 'شما نمی‌توانید حساب خود را حذف کنید' }, { status: 400 });
    }

    // Find the staff member first
    const staffMember = await prisma.user.findFirst({
      where: {
        id,
        shopId: payload.shopId,
        role: { in: ADMIN_ROLES },
      },
    });

    if (!staffMember) {
      return NextResponse.json({ error: 'همکار یافت نشد' }, { status: 404 });
    }

    await prisma.user.delete({
      where: {
        id,
        shopId: payload.shopId,
      },
    });

    return NextResponse.json({ success: true, message: 'همکار با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
