import { jwtVerify } from 'jose';
import { getTenantShop } from './tenant';
import { prisma } from './prisma';
import { isAdminRole, hasPermission, type AdminPermission } from './admin-roles';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

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

  console.log(`verifyAuth token extracted for role ${requiredRole || 'any'}:`, token ? "FOUND" : "NOT FOUND");
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    
    // Super admins have access everywhere
    if (payload.role !== 'superadmin') {
      // Check shop context matching
      const host = request.headers.get('host') || '';
      const shop = await getTenantShop(host, true);
      console.log("verifyAuth check: host =", host, "shopId =", shop?.shopId, "payload.shopId =", payload.shopId);
      
      // If there's no shop found for the current domain,
      // or if the user's token belongs to a different shop
      if (!shop || payload.shopId !== shop.shopId) {
        console.log("verifyAuth check FAILED! shop =", !!shop, "mismatch =", payload.shopId !== shop?.shopId);
        return null;
      }
    }

    // Role check verification
    if (requiredRole) {
      if (requiredRole === 'admin' && !isAdminRole(payload.role as string) && payload.role !== 'superadmin') {
        console.log("verifyAuth check FAILED! Required admin but got", payload.role);
        return null;
      }
      if (requiredRole === 'customer' && payload.role !== 'customer') {
        console.log("verifyAuth check FAILED! Required customer but got", payload.role);
        return null;
      }
      if (requiredRole === 'superadmin' && payload.role !== 'superadmin') {
        console.log("verifyAuth check FAILED! Required superadmin but got", payload.role);
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
        console.log(`verifyAuth check FAILED! User with role ${payload.role} is blocked or not found in DB.`);
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
