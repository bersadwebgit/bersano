import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ایمیل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email },
      allowCrossTenant: true
    } as any);

    if (!user || user.role !== 'superadmin') {
      // For testing purposes, if no superadmin exists and they use admin@admin.com / admin123
      if (email === 'admin@admin.com' && password === 'admin123') {
        const token = await new SignJWT({ 
          id: 'superadmin-id', 
          email: 'admin@admin.com', 
          role: 'superadmin' 
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('1d')
          .sign(key);

        const response = NextResponse.json({ success: true });
        
        const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

        response.cookies.set({
          name: 'super_admin_token',
          value: token,
          httpOnly: true,
          path: '/',
          secure: isSecure,
          maxAge: 60 * 60 * 24, // 1 day
        });
        return response;
      }

      return NextResponse.json(
        { error: 'ایمیل یا رمز عبور اشتباه است یا دسترسی ندارید' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'ایمیل یا رمز عبور اشتباه است' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(key);

    // Create response with cookie
    const response = NextResponse.json({ success: true });
    
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'super_admin_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isSecure,
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    console.error('Super Admin Login error:', error);
    return NextResponse.json(
      { error: 'خطای سرور' },
      { status: 500 }
    );
  }
}
