import { jwtVerify } from 'jose';
import { getTenantShop } from './tenant';
import { prisma } from './prisma';
import { isAdminRole, hasPermission, type AdminPermission } from './admin-roles';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('JWT_SECRET environment variable is missing!');
}
const key = new TextEncoder().encode(JWT_SECRET || 'your-super-secret-key-change-in-production');

export async function verifyAuth(request: Request, requiredRole?: 'admin' | 'customer' | 'superadmin') {
  // Extract token from cookies based on requiredRole
  const cookiesStr = request.headers.get('cookie') || '';
  let token: string | undefined;

  if (requiredRole === 'admin') {
    token = cookiesStr.split(';').find(c => c.trim().startsWith('admin_token='))?.split('=')[1];
  } else if (requiredRole === 'customer') {
    token = cookiesStr.split(';').find(c => c.trim().startsWith('customer_token='))?.split('=')[1];
  } else if (requiredRole === 'superadmin') {
    token = cookiesStr.split(';').find(c => c.trim().startsWith('super_admin_token='))?.split('=')[1];
  } else {
    // fallback behavior
    token = cookiesStr.split(';').find(c => c.trim().startsWith('admin_token='))?.split('=')[1];
    if (!token) {
      token = cookiesStr.split(';').find(c => c.trim().startsWith('customer_token='))?.split('=')[1];
    }
    if (!token) {
      token = cookiesStr.split(';').find(c => c.trim().startsWith('super_admin_token='))?.split('=')[1];
    }
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    
    // Super admins have access everywhere
    if (payload.role !== 'superadmin') {
      // Check shop context matching
      const host = request.headers.get('host') || '';
      const shop = await getTenantShop(host, true);
      
      // If there's no shop found for the current domain,
      // or if the user's token belongs to a different shop
      if (!shop || payload.shopId !== shop.shopId) {
        return null;
      }
    }

    // Role check verification
    if (requiredRole) {
      if (requiredRole === 'admin' && !isAdminRole(payload.role as string) && payload.role !== 'superadmin') {
        return null;
      }
      if (requiredRole === 'customer' && payload.role !== 'customer') {
        return null;
      }
      if (requiredRole === 'superadmin' && payload.role !== 'superadmin') {
        return null;
      }
    }

    // Check if user is blocked
    if (payload.role !== 'superadmin') {
      const dbUser = await prisma.user.findUnique({
        where: { 
          id: payload.id as string,
          shopId: payload.shopId as string
        },
        select: { isBlocked: true }
      });
      if (!dbUser || dbUser.isBlocked) {
        return null;
      }
    }
    
    return payload as { id: string; email: string; role: string; shopId: string; [key: string]: any };
  } catch (e) {
    console.error("verifyAuth Error:", e);
    return null;
  }
}

export async function verifyAdminPermission(
  request: Request,
  permission: AdminPermission
) {
  const payload = await verifyAuth(request, 'admin');
  if (!payload) return null;
  if (!hasPermission(payload.role, permission)) return null;
  return payload;
}
