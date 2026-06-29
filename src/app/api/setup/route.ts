import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const user = await prisma.user.create({
        data: {
          email: 'admin@shop.com',
          password: hashedPassword,
          name: 'مدیر اصلی',
          shopId: 'shop_1',
          role: 'admin'
        }
      });

      await prisma.shopSettings.upsert({
        where: { shopId: 'shop_1' },
        update: {},
        create: {
          shopId: 'shop_1',
          shopName: 'فروشگاه من',
          themeColor: '#2563eb',
          isApproved: true,
        }
      });

      return NextResponse.json({ message: 'Admin user created', user });
    }

    return NextResponse.json({ message: 'Users already exist' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}



