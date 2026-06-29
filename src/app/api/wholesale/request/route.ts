import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await verifyAuth(req, 'customer');
    if (!tokenUser || !tokenUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const request = await prisma.wholesaleRequest.findFirst({
      where: {
        userId: tokenUser.id,
        shopId: tokenUser.shopId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ request });
  } catch (error) {
    console.error('Error fetching wholesale request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await verifyAuth(req, 'customer');
    if (!tokenUser || !tokenUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { companyName, businessType, phone, description } = data;

    if (!companyName || !businessType || !phone) {
      return NextResponse.json({ error: 'پر کردن فیلدهای ستاره‌دار الزامی است' }, { status: 400 });
    }

    // Check for existing pending or approved request
    const existingRequest = await prisma.wholesaleRequest.findFirst({
      where: {
        userId: tokenUser.id,
        shopId: tokenUser.shopId,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: existingRequest.status === 'pending' 
          ? 'درخواست شما در حال بررسی است.' 
          : 'شما در حال حاضر عضو همکاران عمده هستید.' 
      }, { status: 400 });
    }

    const newRequest = await prisma.wholesaleRequest.create({
      data: {
        userId: tokenUser.id,
        shopId: tokenUser.shopId,
        companyName,
        businessType,
        phone,
        description: description || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating wholesale request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
