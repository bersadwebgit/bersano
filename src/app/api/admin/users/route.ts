import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    console.log('[DEBUG] GET /api/admin/users - payload:', payload);
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { shopId: payload.shopId, role: 'customer' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        isBlocked: true,
        isWholesaler: true,
        creditLimit: true,
        creditBalance: true,
        wholesaleGroup: true,
        addresses: true,
        loyaltyPoints: true,
        group: true,
        orders: {
          include: {
            items: {
              include: {
                product: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('[DEBUG] GET /api/admin/users - found users count:', users.length);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { name, email, phone, password } = data;

    if (!email || !password) {
      return NextResponse.json({ error: 'ایمیل و رمز عبور الزامی است' }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { 
        email,
        shopId: payload.shopId
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'کاربری با این ایمیل در فروشگاه شما از قبل وجود دارد' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        shopId: payload.shopId,
        email,
        password: hashedPassword,
        name: name || null,
        role: 'customer',
        isBlocked: false,
        addresses: phone ? {
          create: {
            shopId: payload.shopId,
            title: 'آدرس اصلی',
            phone,
            state: 'ثبت نشده',
            city: 'ثبت نشده',
            address: 'ثبت نشده',
          }
        } : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isBlocked: true,
        isWholesaler: true,
        creditLimit: true,
        creditBalance: true,
        wholesaleGroup: true,
        addresses: true,
        loyaltyPoints: true,
        group: true,
        orders: {
          include: {
            items: {
              include: {
                product: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
