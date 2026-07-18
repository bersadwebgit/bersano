import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import {
  canAccessAdminPage,
  getApiPermission,
  getDefaultAdminPath,
  hasPermission,
  isAdminRole,
} from '@/lib/admin-roles';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('JWT_SECRET environment variable is missing!');
}
const key = new TextEncoder().encode(JWT_SECRET || 'your-super-secret-key-change-in-production');

export async function middleware(request: NextRequest) {
  const response = await handleMiddleware(request);
  if (response) {
    const { pathname } = request.nextUrl;
    const isDynamicRoute = 
      pathname.startsWith('/admin') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/super-admin');

    if (isDynamicRoute) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
  }
  return response;
}

async function handleMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Protect /super-admin routes
  if (pathname.startsWith('/super-admin')) {
    if (pathname === '/super-admin/login') {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const token = request.cookies.get('super_admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/super-admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, key);
      if (payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/super-admin/login', request.url));
      }
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      const response = NextResponse.redirect(new URL('/super-admin/login', request.url));
      response.cookies.delete('super_admin_token');
      return response;
    }
  }

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Skip protection for login page
    if (pathname === '/admin/login') {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, key);
      const role = payload.role as string;

      if (!isAdminRole(role) && role !== 'superadmin') {
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        response.cookies.delete('admin_token');
        return response;
      }

      if (pathname === '/admin' || pathname === '/admin/') {
        return NextResponse.redirect(new URL(getDefaultAdminPath(role), request.url));
      }

      if (!canAccessAdminPage(role, pathname)) {
        return NextResponse.redirect(new URL(getDefaultAdminPath(role), request.url));
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // Protect /api/admin routes with role-based permissions
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, key);
      const role = payload.role as string;

      if (!isAdminRole(role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const permission = getApiPermission(pathname, request.method);
      if (permission && !hasPermission(role, permission)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Redirect logged-in users away from login/register pages
  if (pathname === '/login' || pathname === '/register') {
    const customerToken = request.cookies.get('customer_token')?.value;
    
    if (customerToken) {
      try {
        await jwtVerify(customerToken, key);
        return NextResponse.redirect(new URL('/profile', request.url));
      } catch (error) {
        // Token is invalid, let them proceed to login/register
      }
    }
  }

  // Protect /profile and /checkout routes
  if (pathname.startsWith('/profile') || pathname.startsWith('/checkout')) {
    const customerToken = request.cookies.get('customer_token')?.value;
    
    if (!customerToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(customerToken, key);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('customer_token');
      return response;
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
