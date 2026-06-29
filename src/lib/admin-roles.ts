export type AdminRole = 'admin' | 'product_manager' | 'sales_manager' | 'sales_product_manager';

export const ADMIN_ROLES: AdminRole[] = ['admin', 'product_manager', 'sales_manager', 'sales_product_manager'];

export const ADMIN_ROLE_LABELS: Record<AdminRole | string, string> = {
  admin: 'مدیر کل',
  product_manager: 'مدیر محصول',
  sales_manager: 'مدیر فروش',
  sales_product_manager: 'مدیر فروش و محصول',
};

export type AdminPermission =
  | 'products'
  | 'orders'
  | 'reports'
  | 'reviews'
  | 'blog'
  | 'design'
  | 'support'
  | 'users'
  | 'settings'
  | 'system';

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  admin: [
    'products',
    'orders',
    'reports',
    'reviews',
    'blog',
    'design',
    'support',
    'users',
    'settings',
    'system',
  ],
  product_manager: ['products'],
  sales_manager: ['orders', 'reports'],
  sales_product_manager: ['products', 'orders', 'reports'],
};

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export function hasPermission(role: string, permission: AdminPermission): boolean {
  if (role === 'superadmin') return true; // Super admins have all permissions
  const permissions = ROLE_PERMISSIONS[role as AdminRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function getDefaultAdminPath(role: string): string {
  if (role === 'product_manager') {
    return '/admin/products';
  }
  return '/admin/dashboard';
}

export function canAccessAdminPage(role: string, pathname: string): boolean {
  if (role === 'superadmin') return true;
  if (!isAdminRole(role)) return false;

  // Profile, Agent, Chat and Accounting is accessible by all admins
  if (pathname.startsWith('/admin/profile') || pathname.startsWith('/admin/agent') || pathname.startsWith('/admin/accounting') || pathname.startsWith('/admin/chat')) return true;

  // Map pathnames to permissions
  if (pathname.startsWith('/admin/dashboard')) {
    return hasPermission(role, 'reports');
  }
  if (pathname.startsWith('/admin/products') || pathname.startsWith('/admin/categories') || pathname.startsWith('/admin/shoppable')) {
    return hasPermission(role, 'products');
  }
  if (pathname.startsWith('/admin/orders') || pathname.startsWith('/admin/downloads') || pathname.startsWith('/admin/discounts')) {
    return hasPermission(role, 'orders');
  }
  if (pathname.startsWith('/admin/reviews')) {
    return hasPermission(role, 'reviews');
  }
  if (pathname.startsWith('/admin/blog')) {
    return hasPermission(role, 'blog');
  }
  if (
    pathname.startsWith('/admin/settings/custom-home') ||
    pathname.startsWith('/admin/header') ||
    pathname.startsWith('/admin/footer') ||
    pathname.startsWith('/admin/slider') ||
    pathname.startsWith('/admin/stories') ||
    pathname.startsWith('/admin/media')
  ) {
    return hasPermission(role, 'design') || (pathname.startsWith('/admin/media') && hasPermission(role, 'products'));
  }
  if (pathname.startsWith('/admin/tickets')) {
    return hasPermission(role, 'support');
  }
  if (pathname.startsWith('/admin/users')) {
    return hasPermission(role, 'users');
  }
  if (pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/import-export')) {
    return hasPermission(role, 'settings');
  }
  if (pathname.startsWith('/admin/staff')) {
    return hasPermission(role, 'settings');
  }
  if (pathname.startsWith('/admin/system-tickets')) {
    return hasPermission(role, 'system');
  }

  return false;
}

export function getApiPermission(pathname: string, method: string): AdminPermission | null {
  // Map API endpoints to permissions
  if (pathname.startsWith('/api/admin/products') || pathname.startsWith('/api/admin/categories') || pathname.startsWith('/api/admin/shoppable') || pathname.startsWith('/api/admin/brands')) {
    return 'products';
  }
  if (pathname.startsWith('/api/admin/orders') || pathname.startsWith('/api/downloads') || pathname.startsWith('/api/admin/discounts')) {
    return 'orders';
  }
  if (pathname.startsWith('/api/admin/dashboard')) {
    return 'reports';
  }
  if (pathname.startsWith('/api/admin/reviews')) {
    return 'reviews';
  }
  if (pathname.startsWith('/api/admin/blog')) {
    return 'blog';
  }
  if (pathname.startsWith('/api/admin/slider') || pathname.startsWith('/api/admin/stories') || pathname.startsWith('/api/media')) {
    return 'design';
  }
  if (pathname.startsWith('/api/admin/tickets')) {
    return 'support';
  }
  if (pathname.startsWith('/api/admin/users')) {
    return 'users';
  }
  if (pathname.startsWith('/api/admin/settings') || pathname.startsWith('/api/admin/staff') || pathname.startsWith('/api/admin/import-export')) {
    return 'settings';
  }
  if (pathname.startsWith('/api/admin/system-tickets')) {
    return 'system';
  }

  return null;
}
