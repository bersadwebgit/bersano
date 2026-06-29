import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET() {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, months, price, features } = body;

    if (!name || months === undefined || price === undefined || !features) {
      return NextResponse.json({ error: 'لطفا تمام فیلدهای ضروری را پر کنید.' }, { status: 400 });
    }

    const newPackage = await prisma.package.create({
      data: {
        name,
        months: parseInt(months),
        price: parseFloat(price),
        features: typeof features === 'string' ? features : JSON.stringify(features),
      }
    });

    return NextResponse.json({ success: true, package: newPackage });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json({ error: 'خطای سرور در ایجاد پکیج' }, { status: 500 });
  }
}
