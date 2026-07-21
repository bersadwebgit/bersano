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

    // Find user or collaborator
    let isCollaborator = false;
    let userId = '';
    let userEmail = '';
    let userRole = '';
    let userName = '';
    let userPasswordHash = '';

    const user = await prisma.user.findFirst({
      where: { email },
      allowCrossTenant: true
    } as any);

    if (user && user.role === 'superadmin') {
      userId = user.id;
      userEmail = user.email;
      userRole = user.role;
      userName = user.name || 'سوپر ادمین';
      userPasswordHash = user.password;
    } else {
      // Look up in PlatformCollaborator
      const collaborator = await prisma.platformCollaborator.findUnique({
        where: { email }
      });
      if (collaborator && collaborator.isActive) {
        userId = collaborator.id;
        userEmail = collaborator.email;
        userRole = collaborator.role; // 'superadmin', 'sales', 'content_manager', 'seo_manager'
        userName = collaborator.name;
        userPasswordHash = collaborator.password;
        isCollaborator = true;
      }
    }

    if (!userRole) {
      return NextResponse.json(
        { error: 'ایمیل یا رمز عبور اشتباه است یا دسترسی ندارید' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, userPasswordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'ایمیل یا رمز عبور اشتباه است' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await new SignJWT({ 
      id: userId, 
      email: userEmail, 
      role: userRole,
      name: userName,
      isCollaborator
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(key);

    // Create response with cookie
    const response = NextResponse.json({ success: true, role: userRole, name: userName });
    
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'super_admin_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isSecure,
      sameSite: 'lax',
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
