import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

const demoWhere = (shopId: string) => ({ shopId, isDemo: true });

/**
 * Marks legacy demo content (created before isDemo flag) so it can be safely removed.
 */
async function backfillLegacyDemoFlags(shopId: string, tx: TransactionClient) {
  await tx.user.updateMany({
    where: {
      shopId,
      role: 'customer',
      email: { endsWith: '@example.com' },
    },
    data: { isDemo: true },
  });

  await tx.product.updateMany({
    where: {
      shopId,
      OR: [
        { id: `demo-product-${shopId}` },
        { id: { startsWith: 'demo-product-' } },
      ],
    },
    data: { isDemo: true },
  });

  const settings = await tx.shopSettings.findUnique({
    where: { shopId },
    select: { hasDemoData: true },
  });

  if (!settings?.hasDemoData) {
    return;
  }

  const realContentExists = await tx.product.count({
    where: { shopId, isDemo: false },
  }) > 0 || await tx.blogPost.count({
    where: { shopId, isDemo: false },
  }) > 0 || await tx.story.count({
    where: { shopId, isDemo: false },
  }) > 0;

  if (!realContentExists) {
    // Shop still has only seeded preview content — treat all of it as demo.
    await tx.review.updateMany({ where: { shopId }, data: { isDemo: true } });
    await tx.product.updateMany({ where: { shopId }, data: { isDemo: true } });
    await tx.category.updateMany({ where: { shopId }, data: { isDemo: true } });
    await tx.blogPost.updateMany({ where: { shopId }, data: { isDemo: true } });
    await tx.blogCategory.updateMany({ where: { shopId }, data: { isDemo: true } });
    await tx.heroSlide.updateMany({ where: { shopId }, data: { isDemo: true } });
    await tx.story.updateMany({ where: { shopId }, data: { isDemo: true } });
    return;
  }

  const demoUserIds = (await tx.user.findMany({
    where: { shopId, isDemo: true },
    select: { id: true },
  })).map((user) => user.id);

  if (demoUserIds.length > 0) {
    await tx.product.updateMany({
      where: {
        shopId,
        isDemo: false,
        reviews: { some: { userId: { in: demoUserIds } } },
        orderItems: { none: {} },
      },
      data: { isDemo: true },
    });
    await tx.review.updateMany({
      where: { shopId, userId: { in: demoUserIds } },
      data: { isDemo: true },
    });
  }

  const oldestRealContent = await tx.product.findFirst({
    where: { shopId, isDemo: false },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  const legacyCutoff = oldestRealContent?.createdAt;
  if (!legacyCutoff) {
    return;
  }

  await tx.product.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff } },
    data: { isDemo: true },
  });
  await tx.category.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff }, products: { every: { isDemo: true } } },
    data: { isDemo: true },
  });
  await tx.blogPost.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff } },
    data: { isDemo: true },
  });
  await tx.blogCategory.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff }, posts: { every: { isDemo: true } } },
    data: { isDemo: true },
  });
  await tx.heroSlide.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff } },
    data: { isDemo: true },
  });
  await tx.story.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff } },
    data: { isDemo: true },
  });
  await tx.review.updateMany({
    where: { shopId, isDemo: false, createdAt: { lt: legacyCutoff } },
    data: { isDemo: true },
  });
}

async function clearShopDemoDataInTransaction(
  shopId: string,
  tx: TransactionClient,
  options?: { resetSetupWizard?: boolean }
) {
  await backfillLegacyDemoFlags(shopId, tx);

  const demoProducts = await tx.product.findMany({
    where: demoWhere(shopId),
    select: { id: true },
  });
  const demoProductIds = demoProducts.map((product) => product.id);

  if (demoProductIds.length > 0) {
    await tx.cartItem.deleteMany({
      where: { shopId, productId: { in: demoProductIds } },
    });
    await tx.productNotificationRequest.deleteMany({
      where: { shopId, productId: { in: demoProductIds } },
    });
    await tx.orderItem.deleteMany({
      where: { shopId, productId: { in: demoProductIds } },
    });
    await tx.productSetItem.deleteMany({
      where: { shopId, productId: { in: demoProductIds } },
    });
  }

  await tx.review.deleteMany({ where: demoWhere(shopId) });

  await tx.productVariant.deleteMany({
    where: {
      shopId,
      product: { isDemo: true },
    },
  });

  await tx.product.deleteMany({ where: demoWhere(shopId) });

  await tx.category.deleteMany({
    where: {
      shopId,
      isDemo: true,
      products: { none: {} },
    },
  });

  const demoBlogPosts = await tx.blogPost.findMany({
    where: demoWhere(shopId),
    select: { id: true },
  });
  const demoBlogPostIds = demoBlogPosts.map((post) => post.id);

  if (demoBlogPostIds.length > 0) {
    await tx.blogComment.deleteMany({
      where: { shopId, postId: { in: demoBlogPostIds } },
    });
  }

  await tx.blogPost.deleteMany({ where: demoWhere(shopId) });

  await tx.blogCategory.deleteMany({
    where: {
      shopId,
      isDemo: true,
      posts: { none: {} },
    },
  });

  await tx.heroSlide.deleteMany({ where: demoWhere(shopId) });
  await tx.story.deleteMany({ where: demoWhere(shopId) });

  await tx.user.deleteMany({
    where: { shopId, role: 'customer', isDemo: true },
  });

  await tx.shopSettings.update({
    where: { shopId },
    data: {
      hasDemoData: false,
      ...(options?.resetSetupWizard ? { setupWizardCompleted: false } : {}),
    },
  });
}

export async function clearShopDemoData(
  shopId: string,
  options?: { resetSetupWizard?: boolean }
) {
  await prisma.$transaction(async (tx) => {
    await clearShopDemoDataInTransaction(shopId, tx, options);
  });
}

export async function clearShopDemoDataWithTx(
  shopId: string,
  tx: TransactionClient,
  options?: { resetSetupWizard?: boolean }
) {
  await clearShopDemoDataInTransaction(shopId, tx, options);
}

export async function syncDemoDataFlag(shopId: string, tx?: TransactionClient) {
  const client = tx ?? prisma;

  const remainingDemoContent = await client.product.count({
    where: demoWhere(shopId),
  }) + await client.story.count({
    where: demoWhere(shopId),
  }) + await client.blogPost.count({
    where: demoWhere(shopId),
  }) + await client.heroSlide.count({
    where: demoWhere(shopId),
  });

  if (remainingDemoContent === 0) {
    await client.shopSettings.update({
      where: { shopId },
      data: { hasDemoData: false },
    });
  }
}
