import { prisma } from '../../prisma';
import { searchProducts } from '../../product-search';

export interface ContextOptions {
  shopId: string;
  prompt: string;
}

export async function buildShopContext(opts: ContextOptions): Promise<string> {
  const { shopId, prompt } = opts;
  const p = prompt.trim();

  let context = `تنظیمات و اطلاعات فروشگاه:\n`;

  const shopSettings = await prisma.shopSettings.findFirst({
    where: { shopId },
    select: { shopName: true, contactPhone: true },
  });

  if (shopSettings) {
    context += `- نام فروشگاه: ${shopSettings.shopName || 'ثبت نشده'}\n`;
    context += `- شماره تماس: ${shopSettings.contactPhone || 'ثبت نشده'}\n`;
  }

  const categories = await prisma.category.findMany({
    where: { shopId },
    select: { id: true, name: true, slug: true },
    take: 15,
  });

  if (categories.length > 0) {
    context += `\nدسته‌بندی‌های فروشگاه:\n`;
    for (const c of categories) {
      context += `- ${c.name} (شناسه: ${c.id}, اسلاگ: ${c.slug})\n`;
    }
  }

  if (/محصول|کالا|قیمت|موجودی|تخفیف/i.test(p)) {
    try {
      const products = await searchProducts({
        shopId,
        query: p,
        maxResults: 6,
        adminMode: true,
      });

      if (products.length > 0) {
        context += `\nمحصولات مرتبط یافت شده:\n`;
        for (const prod of products) {
          context += `- ${prod.title} (شناسه: ${prod.id}, قیمت: ${prod.price} تومان, موجودی: ${prod.stock}, تخفیف: ${prod.discount || 0}%)\n`;
        }
      }
    } catch (err) {
      console.error('[buildShopContext] Product search failed:', err);
    }
  }

  if (/سفارش|فاکتور|خرید/i.test(p)) {
    const orders = await prisma.order.findMany({
      where: { shopId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (orders.length > 0) {
      context += `\nسفارشات اخیر فروشگاه:\n`;
      for (const o of orders) {
        context += `- سفارش #${o.id} (شناسه: ${o.id}, وضعیت: ${o.status}, مبلغ کل: ${o.totalAmount} تومان)\n`;
      }
    }
  }

  return context;
}
