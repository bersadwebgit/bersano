import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import BottomNav from '@/components/layout/BottomNav';
import ShoppableClient from './ShoppableClient';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const shop = await getTenantShop();
  if (!shop) {
    return { title: 'صفحه خرید تعاملی یافت نشد' };
  }

  if (!shop.productSetsEnabled) {
    return { title: 'صفحه خرید تعاملی یافت نشد' };
  }

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  const set = await prisma.productSet.findFirst({
    where: {
      shopId: shop.shopId,
      slug: decodedSlug,
      isActive: true
    },
    select: {
      name: true,
      imageUrl: true
    }
  });

  if (!set) {
    return { title: 'تصویر خریدنی پیدا نشد' };
  }

  const pageTitle = `${set.name} | خرید تعاملی تصویری ${shop.shopName}`;
  const pageDesc = `خرید هوشمند و مستقیم محصولات از روی تصویر ${set.name} در فروشگاه ${shop.shopName}. روی تگ‌های تصویر کلیک کنید و سریع به سبد خرید خود بیافزایید.`;

  return {
    title: pageTitle,
    description: pageDesc,
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      images: set.imageUrl ? [{ url: set.imageUrl }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: set.imageUrl ? [set.imageUrl] : [],
    }
  };
}

export default async function ShoppableImagePage({ params }: { params: Promise<{ slug: string }> }) {
  const shop = await getTenantShop();
  
  if (!shop || !shop.productSetsEnabled) {
    return notFound();
  }

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  // Optimized parallel queries using lightweight SELECT projections to boost page render speed under 100ms
  const [categories, menuItems, set] = await Promise.all([
    prisma.category.findMany({
      where: { shopId: shop.shopId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        parentId: true,
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            parentId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.menuItem.findMany({
      where: { shopId: shop.shopId, isActive: true },
      select: {
        id: true,
        title: true,
        url: true,
        color: true,
        icon: true
      },
      orderBy: { order: 'asc' }
    }),
    prisma.productSet.findFirst({
      where: {
        shopId: shop.shopId,
        slug: decodedSlug,
        isActive: true,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: {
                  where: {
                    stock: { gt: 0 }
                  }
                }
              }
            }
          }
        }
      }
    })
  ]);

  if (!set) {
    return notFound();
  }

  let headerConfig = undefined;
  const footerConfig = await getFooterConfig();
  if (shop.headerConfig) {
    try {
      headerConfig = JSON.parse(shop.headerConfig);
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-24 lg:pb-0" dir="rtl">
      {/* Header */}
      <Header 
        shopName={shop.shopName} 
        logoUrl={shop.logoUrl} 
        menuItems={menuItems.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
          color: item.color,
          icon: item.icon
        }))}
        categories={categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          parentId: cat.parentId,
          children: cat.children?.map(child => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            parentId: child.parentId
          }))
        }))}
        config={headerConfig}
      />

      {/* Interactive Shoppable Client-Side Application */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ShoppableClient initialSet={JSON.parse(JSON.stringify(set))} />
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      {/* Bottom Nav for Mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
