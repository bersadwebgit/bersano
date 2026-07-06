import StoreContainer from '@/components/store/StoreContainer';
import { SidebarSkeleton, ProductGridSkeleton } from '@/components/store/Skeletons';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import CategorySeoSection from '@/components/store/CategorySeoSection';
import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { getCachedCategories, getCachedMenuItems, getCachedBrands } from '@/lib/cached-queries';
import { logPerf } from '@/lib/perf-logger';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers, cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shop = await getTenantShop();
  if (!shop) return { title: "فروشگاه یافت نشد" };

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const category = await prisma.category.findFirst({
    where: { slug: decodedSlug, shopId: shop.shopId }
  });

  if (!category) return { title: "دسته‌بندی یافت نشد" };

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const canonicalUrl = `${protocol}://${host}/category/${slug}`;

  return {
    title: category.seoTitle || `${category.name} | ${shop.shopName}`,
    description: category.seoDescription || category.description || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: category.seoTitle || `${category.name} | ${shop.shopName}`,
      description: category.seoDescription || category.description || undefined,
      url: canonicalUrl,
    }
  };
}

export default async function CategoryPage({ params }: Props) {
  const startCategory = performance.now();
  const shop = await getTenantShop();
  logPerf('category.tenant_resolve', startCategory);
  
  if (!shop) {
    return notFound();
  }

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  let isWholesaler = false;
  if (customerToken) {
    try {
      const verified = await jwtVerify(customerToken, key);
      const payload = verified.payload;
      const user = await prisma.user.findFirst({
        where: { id: payload.id as string, shopId: shop.shopId }
      });
      isWholesaler = !!user?.isWholesaler;
    } catch (err) {}
  }

  const category = await prisma.category.findFirst({
    where: { slug: decodedSlug, shopId: shop.shopId }
  });

  if (!category) {
    const decodedSlug = decodeURIComponent(slug);
    const keywords = decodedSlug.split(/[-_\s]+/).filter(w => w.length > 1);

    const matchedCategory = await prisma.category.findFirst({
      where: {
        shopId: shop.shopId,
        isActive: true,
        OR: [
          { name: { contains: decodedSlug, mode: 'insensitive' } },
          { slug: { contains: decodedSlug, mode: 'insensitive' } },
          ...(keywords.map(keyword => ({
            name: { contains: keyword, mode: 'insensitive' }
          })))
        ]
      },
      select: { slug: true }
    });

    if (matchedCategory) {
      permanentRedirect(`/category/${matchedCategory.slug}`);
    }

    if (decodedSlug.trim().length > 2) {
      permanentRedirect(`/shop?search=${encodeURIComponent(decodedSlug)}`);
    }

    return notFound();
  }

  // Get all subcategory IDs if any
  const subCategories = await prisma.category.findMany({
    where: { parentId: category.id, shopId: shop.shopId, isActive: true },
    select: { id: true }
  });
  const categoryIds = [category.id, ...subCategories.map(c => c.id)];

  const hasRealProducts = await prisma.product.count({
    where: { shopId: shop.shopId, isDemo: false, isSampleData: false }
  }) > 0;

  const startData = performance.now();
  const [products, categories, menuItems, settings, dbBrands] = await Promise.all([
    prisma.product.findMany({
      where: { 
        shopId: shop.shopId, 
        isActive: true,
        ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {}),
        OR: [
          { categoryId: { in: categoryIds } },
          { categories: { some: { id: { in: categoryIds } } } }
        ]
      },
      select: {
        id: true,
        title: true,
        type: true,
        categoryId: true,
        description: true,
        price: true,
        discount: true,
        imageUrl: true,
        stock: true,
        isSpecial: true,
        specialEndsAt: true,
        isActive: true,
        brand: true,
        createdAt: true,
        isWholesaleOnly: true,
        wholesalePrice: true,
        wholesaleUnit: true,
        moq: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 40
    }),
    getCachedCategories(shop.shopId),
    getCachedMenuItems(shop.shopId),
    prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { headerConfig: true, customHomeConfig: true, wholesaleEnabled: true }
    }),
    getCachedBrands(shop.shopId)
  ]);
  logPerf('category.data_load', startData);

  let headerConfig = undefined;
  const footerConfig = await getFooterConfig();
  let brands = [];
  if (settings?.headerConfig) {
    try {
      headerConfig = JSON.parse(settings.headerConfig);
    } catch (e) {
      // ignore
    }
  }

  let finalBrands = [];
  if (settings?.customHomeConfig) {
    try {
      const parsed = JSON.parse(settings.customHomeConfig);
      finalBrands = parsed.brands || [];
    } catch (e) {
      // ignore
    }
  }

  // Override with database brands if available
  if (dbBrands && dbBrands.length > 0) {
    finalBrands = dbBrands.map(b => ({ id: b.id, name: b.name, logoUrl: b.logoUrl || '' }));
  }

  logPerf('category.total', startCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0">
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

      <div className="max-w-7xl mx-auto w-full pt-4">
        <Suspense fallback={
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 pt-4">
            <div className="hidden lg:block">
              <SidebarSkeleton />
            </div>
            <div className="flex-1">
              <ProductGridSkeleton count={8} />
            </div>
          </div>
        }>
          <StoreContainer 
            initialProducts={products} 
            initialCategories={categories} 
            currentCategory={category} 
            brands={finalBrands}
            isWholesaler={isWholesaler}
            wholesaleEnabled={!!settings?.wholesaleEnabled}
          />
        </Suspense>
      </div>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
