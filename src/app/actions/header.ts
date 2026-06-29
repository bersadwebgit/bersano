'use server';

import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';
import { DEFAULT_HEADER_CONFIG, parseHeaderConfig, type HeaderConfig } from '@/types/header';

export async function getMenuItems() {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  return prisma.menuItem.findMany({
    where: { shopId: shop.shopId },
    orderBy: { order: 'asc' },
  });
}

export async function createMenuItem(data: { title: string; url: string; color?: string | null; icon?: string | null; order?: number; isActive?: boolean }) {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  const result = await prisma.menuItem.create({
    data: {
      ...data,
      shopId: shop.shopId,
    },
  });

  revalidatePath('/');
  revalidatePath('/admin/header');
  return result;
}

export async function updateMenuItem(id: string, data: { title?: string; url?: string; color?: string | null; icon?: string | null; order?: number; isActive?: boolean }) {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  const result = await prisma.menuItem.update({
    where: { id, shopId: shop.shopId },
    data,
  });

  revalidatePath('/');
  revalidatePath('/admin/header');
  return result;
}

export async function deleteMenuItem(id: string) {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  await prisma.menuItem.delete({
    where: { id, shopId: shop.shopId },
  });

  revalidatePath('/');
  revalidatePath('/admin/header');
}

export async function updateMenuItemsOrder(items: { id: string; order: number }[]) {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  // Use a transaction to update all orders
  await prisma.$transaction(
    items.map((item) =>
      prisma.menuItem.update({
        where: { id: item.id, shopId: shop.shopId },
        data: { order: item.order },
      })
    )
  );

  revalidatePath('/');
  revalidatePath('/admin/header');
}

export async function getHeaderConfig() {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  const settings = await prisma.shopSettings.findUnique({
    where: { shopId: shop.shopId },
    select: { headerConfig: true }
  });

  return parseHeaderConfig(settings?.headerConfig);
}

export async function updateHeaderConfig(config: HeaderConfig) {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  await prisma.shopSettings.update({
    where: { shopId: shop.shopId },
    data: { headerConfig: JSON.stringify(config) }
  });

  revalidatePath('/');
  revalidatePath('/admin/header');
}