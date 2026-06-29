'use server';

import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';
import { DEFAULT_FOOTER_CONFIG, parseFooterConfig, type FooterConfig } from '@/types/footer';

export async function getFooterConfig() {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  try {
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { footerConfig: true },
    });
    return parseFooterConfig(settings?.footerConfig);
  } catch (error) {
    console.error('Failed to fetch footer config:', error);
    return DEFAULT_FOOTER_CONFIG;
  }
}

export async function updateFooterConfig(config: FooterConfig) {
  const shop = await getTenantShop();
  if (!shop) throw new Error('Shop not found');

  try {
    await prisma.shopSettings.update({
      where: { shopId: shop.shopId },
      data: { footerConfig: JSON.stringify(config) },
    });
  } catch (error) {
    console.error('Failed to update footer config:', error);
    throw error;
  }

  revalidatePath('/');
  revalidatePath('/admin/footer');
}
