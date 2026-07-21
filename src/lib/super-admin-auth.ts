import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export interface SuperAdminPayload {
  role: string;
  id?: string;
  name?: string;
  email?: string;
  [k: string]: unknown;
}

/**
 * Verifies the super-admin session from the `super_admin_token` cookie.
 * Mirrors the local verifier used in super-admin/settings so we don't assume '@/lib/auth'.
 * Returns the JWT payload when valid, otherwise null.
 */
export async function verifySuperAdmin(): Promise<SuperAdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload as SuperAdminPayload;
  } catch {
    return null;
  }
}

/**
 * CSRF defense for cookie-authenticated mutations: require the request Origin
 * (or Referer) to match the current Host. Safe (idempotent) methods are exempt.
 * Returns true when the request is same-origin (or origin cannot be spoofed cross-site).
 */
export async function isSameOrigin(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const h = await headers();
  const host = h.get('host');
  if (!host) return false;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Fall back to Referer when Origin is absent.
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // No Origin/Referer on a state-changing request → reject (defense-in-depth).
  return false;
}

/**
 * Guard helper: returns { admin } on success or an object with an `error` Response
 * ready to be returned by the route. Enforces auth + CSRF for mutations.
 */
export async function guardSuperAdmin(
  request: Request,
): Promise<{ admin: SuperAdminPayload } | { response: Response }> {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return {
      response: new Response(JSON.stringify({ error: 'دسترسی غیرمجاز' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    };
  }
  const sameOrigin = await isSameOrigin(request);
  if (!sameOrigin) {
    return {
      response: new Response(JSON.stringify({ error: 'درخواست نامعتبر (CSRF)' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    };
  }
  return { admin };
}
