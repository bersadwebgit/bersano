import { Prisma } from '@prisma/client';

// List of all models that have a shopId field, in lowercase for case-insensitive matching
const TENANT_MODELS_LOWERCASE = new Set([
  'story',
  'media',
  'user',
  'address',
  'shopsettings',
  'menuitem',
  'category',
  'product',
  'brand',
  'productvariant',
  'cartitem',
  'discountcode',
  'order',
  'orderitem',
  'heroslide',
  'review',
  'notification',
  'ticket',
  'ticketmessage',
  'pageview',
  'downloadtoken',
  'otp',
  'blogcategory',
  'blogpost',
  'blogcomment',
  'productset',
  'productsetitem',
  'productnotificationrequest',
  'systemticket',
]);

// Prisma operations that accept a 'where' filter clause
const OPERATIONS_WITH_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * Recursively checks if a where clause contains a non-undefined, non-null shopId.
 * This handles nested conditions inside AND, OR, and NOT.
 */
function hasShopIdInWhere(where: any): boolean {
  if (!where || typeof where !== 'object') {
    return false;
  }

  // Direct check
  if ('shopId' in where && where.shopId !== undefined && where.shopId !== null) {
    return true;
  }

  // Check AND array/object
  if (where.AND) {
    if (Array.isArray(where.AND)) {
      for (const condition of where.AND) {
        if (hasShopIdInWhere(condition)) return true;
      }
    } else if (hasShopIdInWhere(where.AND)) {
      return true;
    }
  }

  // Check OR array
  if (where.OR && Array.isArray(where.OR)) {
    for (const condition of where.OR) {
      if (hasShopIdInWhere(condition)) return true;
    }
  }

  // Check NOT array/object
  if (where.NOT) {
    if (Array.isArray(where.NOT)) {
      for (const condition of where.NOT) {
        if (hasShopIdInWhere(condition)) return true;
      }
    } else if (hasShopIdInWhere(where.NOT)) {
      return true;
    }
  }

  return false;
}

export const prismaTenantExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations<T, A>({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: A & { allowCrossTenant?: boolean };
          query: (args: A) => Promise<Prisma.Result<T, A, any>>;
        }) {
          // Destructure custom flag to prevent Prisma from throwing an "unknown argument" error
          const { allowCrossTenant, ...cleanArgs } = (args || {}) as any;

          // Check if this model is tenant-scoped and the operation uses a where clause
          const isTenantModel = TENANT_MODELS_LOWERCASE.has(model.toLowerCase());
          const isWhereOperation = OPERATIONS_WITH_WHERE.has(operation);

          if (isTenantModel && isWhereOperation && !allowCrossTenant) {
            const where = cleanArgs.where;
            if (!hasShopIdInWhere(where)) {
              throw new Error(
                `Multi-tenant isolation violation: Model '${model}' query (${operation}) is missing 'shopId' in the where clause. If this is intentional (e.g. super-admin/global queries), use { allowCrossTenant: true }.`
              );
            }
          }

          // Proceed with the cleaned arguments
          return query(cleanArgs as any);
        },
      },
    },
  });
});
