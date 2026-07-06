import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export interface PlatformSession {
  id: string;
  email: string;
  role: 'superadmin' | 'sales' | 'content_manager' | 'seo_manager';
  name: string;
  isCollaborator: boolean;
}

export async function verifyPlatformSession(
  allowedRoles?: Array<'superadmin' | 'sales' | 'content_manager' | 'seo_manager'>
): Promise<PlatformSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, key);
    const role = payload.role as any;

    if (!role) return null;

    // Super Admin always has full access
    if (role === 'superadmin') {
      return payload as any;
    }

    // If allowedRoles is specified, check if collaborator's role is in the allowed list
    if (allowedRoles && !allowedRoles.includes(role)) {
      return null;
    }

    return payload as any;
  } catch (error) {
    return null;
  }
}

/**
 * Check if the given role has access to specific resources based on Feature requirements:
 * 1. Sales:
 *    - access to leads/customers/sales-related platform tools if available
 *    - no access to sensitive system settings
 *    - no access to AI model keys
 *    - no access to billing/package control
 *    - no access to blog
 * 2. Content Manager:
 *    - platform blog posts, platform content pages, article drafts, media, AI article generation
 *    - no access to sensitive settings, database configs, keys or billing
 * 3. SEO Manager:
 *    - SEO fields, GEO fields, schema/structured data fields, article optimization tools, search metadata, content briefs
 *    - no access to secrets/system keys or actual raw content publishing (can write metadata)
 * 4. Super Admin:
 *    - full access
 */
export function hasPlatformPermission(
  role: 'superadmin' | 'sales' | 'content_manager' | 'seo_manager',
  action: 'manage_collaborators' | 'manage_settings' | 'manage_billing' | 'manage_blog_content' | 'manage_blog_seo' | 'use_ai_tools'
): boolean {
  if (role === 'superadmin') return true;

  switch (action) {
    case 'manage_collaborators':
    case 'manage_settings':
    case 'manage_billing':
      return false; // Only superadmin

    case 'manage_blog_content':
      return role === 'content_manager'; // Content Manager can edit posts

    case 'manage_blog_seo':
      return role === 'content_manager' || role === 'seo_manager'; // Both can edit SEO fields

    case 'use_ai_tools':
      return role === 'content_manager' || role === 'seo_manager'; // Content and SEO managers can generate AI

    default:
      return false;
  }
}
