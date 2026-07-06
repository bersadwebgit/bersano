import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCachedProductDetail, getCachedCategories, getCachedMenuItems, getCachedBrands } from '@/lib/cached-queries';
import { logPerf } from '@/lib/perf-logger';
import ProductOverview from '@/components/store/ProductOverview';
import ProductTabs from '@/components/store/ProductTabs';
import { getTenantShop } from '@/lib/tenant';
import { notFound, permanentRedirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import BottomNav from '@/components/layout/BottomNav';
import RelatedProductsStories from '@/components/store/RelatedProductsStories';
import ScrollReveal from '@/components/store/ScrollReveal';
import type { Metadata } from 'next';
import { injectContextualLinks, generateBreadcrumbSchema, generateDiscussionSchema } from '@/lib/seo-geo';
import { headers } from 'next/headers';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const shop = await getTenantShop();
  if (!shop) {
    return {};
  }

  try {
    const product = await prisma.product.findFirst({
      where: { 
        id,
        shopId: shop.shopId
      },
      include: {
        variants: true
      }
    });

    if (!product) {
      return {
        title: `محصول یافت نشد | ${shop.shopName}`
      };
    }

    // Extract variant names (e.g., colors or sizes)
    let variantsStr = '';
    if (product.variants && product.variants.length > 0) {
      const variantNames = product.variants.map((v: any) => v.name.trim()).filter(Boolean);
      if (variantNames.length > 0) {
        variantsStr = variantNames.join('، ');
      }
    }

    // Clean and truncate description for SEO
    const plainDesc = product.description || 
      (product.fullDescription ? product.fullDescription.replace(/<[^>]*>/g, '').substring(0, 160) : '') || 
      `خرید آنلاین ${product.title} در فروشگاه ${shop.shopName}`;
    
    let metaTitle = product.seoTitle || `${product.title} | خرید و قیمت در ${shop.shopName}`;
    
    const formattedPrice = product.price && product.price > 0
      ? `${Number(product.price).toLocaleString('fa-IR')} تومان`
      : 'رایگان';
    
    // Replace placeholders if present in the custom seoTitle
    if (product.seoTitle) {
      metaTitle = product.seoTitle
        .replace(/{title}/g, product.title)
        .replace(/{brand}/g, product.brand || '')
        .replace(/{color}/g, variantsStr)
        .replace(/{variant}/g, variantsStr)
        .replace(/{specs}/g, variantsStr)
        .replace(/{price}/g, formattedPrice)
        .replace(/{shopName}/g, shop.shopName);
    } else if (variantsStr) {
      // If no custom seoTitle is set, automatically append variants to the default title
      metaTitle = `${product.title} در رنگ‌ها و طرح‌های ${variantsStr} | خرید و قیمت در ${shop.shopName}`;
    }

    let metaDescription = product.seoDescription || plainDesc;
    if (product.seoDescription) {
      metaDescription = product.seoDescription
        .replace(/{title}/g, product.title)
        .replace(/{brand}/g, product.brand || '')
        .replace(/{color}/g, variantsStr)
        .replace(/{variant}/g, variantsStr)
        .replace(/{specs}/g, variantsStr)
        .replace(/{price}/g, formattedPrice)
        .replace(/{shopName}/g, shop.shopName);
    }

    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const canonicalUrl = `${protocol}://${host}/product/${id}`;

    return {
      title: metaTitle,
      description: metaDescription,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: metaTitle,
        description: metaDescription,
        url: canonicalUrl,
        type: 'website',
        images: product.imageUrl ? [{ url: product.imageUrl, alt: product.title }] : [],
        siteName: shop.shopName,
      },
      twitter: {
        card: 'summary_large_image',
        title: metaTitle,
        description: metaDescription,
        images: product.imageUrl ? [product.imageUrl] : [],
      },
      robots: {
        index: true,
        follow: true,
      }
    };
  } catch (error) {
    console.error('[ERROR] [generateMetadata]:', error);
    return {
      title: shop.shopName
    };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const startProduct = performance.now();
  const { id } = await params;

  const shop = await getTenantShop();
  logPerf('product.tenant_resolve', startProduct);
  if (!shop) {
    return notFound();
  }

  const startData = performance.now();

  // Find product making sure it belongs to the current tenant
  let product: any = null;
  let categories: any[] = [];
  let menuItems: any[] = [];
  let settings: any = null;
  let headerConfig = undefined;
  let relatedProducts: any[] = [];
  let dbBrands: any[] = [];
  let footerConfig: any = null;

  try {
    const [fetchedProduct, fetchedCategories, fetchedMenuItems, fetchedSettings, fetchedBrands] = await Promise.all([
      getCachedProductDetail(shop.shopId, id),
      getCachedCategories(shop.shopId),
      getCachedMenuItems(shop.shopId),
      prisma.shopSettings.findUnique({
        where: { shopId: shop.shopId },
        select: { headerConfig: true, relatedProductsEnabled: true, customHomeConfig: true }
      }),
      getCachedBrands(shop.shopId)
    ]);

    product = fetchedProduct;
    categories = fetchedCategories;
    menuItems = fetchedMenuItems;
    settings = fetchedSettings;
    dbBrands = fetchedBrands;

    footerConfig = await getFooterConfig();

    if (product) {
      const relatedCategoryIds = [
        product.categoryId,
        ...(product.categories ? product.categories.map((c: any) => c.id) : [])
      ].filter(Boolean) as string[];

      const productListSelect = {
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
      };

      const hasRealProducts = await prisma.product.count({
        where: { shopId: shop.shopId, isDemo: false, isSampleData: false }
      }) > 0;

      // Fetch related products (same category, different product)
      const fetchedRelated = await prisma.product.findMany({
        where: {
          shopId: shop.shopId,
          isActive: true,
          id: { not: product.id },
          ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {}),
          OR: [
            { categoryId: { in: relatedCategoryIds } },
            { categories: { some: { id: { in: relatedCategoryIds } } } }
          ]
        },
        select: productListSelect,
        take: 8,
        orderBy: { createdAt: 'desc' }
      });

      relatedProducts = fetchedRelated;

      // If we don't have enough related products in the same category, get other products from the shop
      if (relatedProducts.length < 4) {
        const excludeIds = [product.id, ...relatedProducts.map((p: any) => p.id)];
        const extraProducts = await prisma.product.findMany({
          where: {
            shopId: shop.shopId,
            isActive: true,
            id: { notIn: excludeIds },
            ...(hasRealProducts ? { isDemo: false, isSampleData: false } : {})
          },
          select: productListSelect,
          take: 8 - relatedProducts.length,
          orderBy: { createdAt: 'desc' }
        });
        relatedProducts = [...relatedProducts, ...extraProducts];
      }
    }
    
    if (settings?.headerConfig) {
      try {
        headerConfig = JSON.parse(settings.headerConfig);
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    console.error('[ERROR] [ProductPage]: Error loading product data:', error);
  }
  logPerf('product.data_load', startData);

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

  if (!product) {
    // Smart SEO Redirection
    const decodedId = decodeURIComponent(id);
    const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId) || 
                   /^[0-9a-fA-F]{24}$/.test(decodedId) || 
                   (decodedId.startsWith('c') && decodedId.length >= 20);

    if (!isDbId) {
      const keywords = decodedId.split(/[-_\s]+/).filter(w => w.length > 1);
      const matchedProduct = await prisma.product.findFirst({
        where: {
          shopId: shop.shopId,
          isActive: true,
          OR: [
            { title: { contains: decodedId, mode: 'insensitive' } },
            ...(keywords.map(keyword => ({
              title: { contains: keyword, mode: 'insensitive' }
            })))
          ]
        },
        select: { id: true }
      });

      if (matchedProduct) {
        permanentRedirect(`/product/${matchedProduct.id}`);
      }

      // Check category
      const matchedCategory = await prisma.category.findFirst({
        where: {
          shopId: shop.shopId,
          isActive: true,
          OR: [
            { name: { contains: decodedId, mode: 'insensitive' } },
            { slug: { contains: decodedId, mode: 'insensitive' } }
          ]
        },
        select: { slug: true }
      });

      if (matchedCategory) {
        permanentRedirect(`/category/${matchedCategory.slug}`);
      }

      // If it's a friendly URL, redirect to shop search
      if (decodedId.trim().length > 2) {
        permanentRedirect(`/shop?search=${encodeURIComponent(decodedId)}`);
      }
    }

    return notFound();
  }

  // Fetch contextual products and posts to automatically build semantic SILO interlinking (GEO + SEO)
  let keywordLinks: { text: string; url: string; title: string }[] = [];
  try {
    const [otherProducts, recentBlogPosts] = await Promise.all([
      prisma.product.findMany({
        where: { shopId: shop.shopId, isActive: true, NOT: { id: product.id } },
        take: 12,
        select: { id: true, title: true }
      }),
      prisma.blogPost.findMany({
        where: { shopId: shop.shopId, status: 'published' },
        take: 8,
        select: { slug: true, title: true }
      })
    ]);

    keywordLinks = [
      ...otherProducts.map(p => ({
        text: p.title,
        url: `/product/${p.id}`,
        title: `مشاهده و خرید ${p.title}`
      })),
      ...recentBlogPosts.map(bp => ({
        text: bp.title,
        url: `/blog/${bp.slug}`,
        title: bp.title
      }))
    ];
  } catch (err) {
    console.error('Failed to compile product interlinking keyword pool:', err);
  }

  // Auto-inject links into full product description
  const currentUrl = `/product/${product.id}`;
  if (product.fullDescription) {
    product.fullDescription = injectContextualLinks(product.fullDescription, keywordLinks, currentUrl, 3);
  }

  // Inject links into product reviews to mimic organic semantic mentions (highly valued by GEO)
  if (product.reviews && product.reviews.length > 0) {
    product.reviews = product.reviews.map((rev: any) => ({
      ...rev,
      comment: injectContextualLinks(rev.comment, keywordLinks, '', 1) // max 1 link per product review to look natural
    }));
  }

  // Generate automated product Schema (SEO Structured Data)
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  let aggregateRating = undefined;
  if (product.reviews && product.reviews.length > 0) {
    const ratingCount = product.reviews.length;
    const ratingSum = product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
    const ratingValue = (ratingSum / ratingCount).toFixed(1);
    aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': ratingValue,
      'reviewCount': ratingCount,
      'bestRating': '5',
      'worstRating': '1',
    };
  }

  const brandData = product.brand ? {
    '@type': 'Brand',
    'name': product.brand,
  } : {
    '@type': 'Brand',
    'name': shop.shopName,
  };

  const productPrice = product.discount 
    ? product.price - product.discount 
    : product.price;

  let jsonLdContent = '';
  if (product.schemaMarkup) {
    try {
      // Ensure it's valid JSON before rendering
      JSON.parse(product.schemaMarkup);
      jsonLdContent = product.schemaMarkup;
    } catch (e) {
      console.error('Invalid custom schema markup JSON:', e);
    }
  }

  if (!jsonLdContent) {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.title,
      'image': product.imageUrl ? [product.imageUrl] : [],
      'description': product.description || (product.fullDescription ? product.fullDescription.replace(/<[^>]*>/g, '').substring(0, 300) : ''),
      'sku': product.id,
      'brand': brandData,
      'offers': {
        '@type': 'Offer',
        'url': `${protocol}://${host}/product/${product.id}`,
        'priceCurrency': shop.currency || 'IRT',
        'price': productPrice,
        'priceValidUntil': '2030-12-31',
        'itemCondition': 'https://schema.org/NewCondition',
        'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      ...(aggregateRating ? { aggregateRating } : {}),
    };
    jsonLdContent = JSON.stringify(jsonLd);
  }

  // Generate Breadcrumbs Schema (highly effective for search indexing and AI navigation)
  const breadcrumbItems = [
    { name: 'خانه', url: '/' },
    ...(product.category ? [{ name: product.category.name, url: `/category/${product.category.slug}` }] : []),
    { name: product.title, url: `/product/${product.id}` }
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(host, breadcrumbItems);

  // Generate Review Discussion Schema for products if user reviews exist
  const discussionSchema = generateDiscussionSchema(
    `https://${host}/product/${product.id}`,
    product.title,
    product.reviews.map((r: any) => ({
      name: r.user?.name || 'خریدار سایت',
      content: r.comment,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()
    }))
  );

  logPerf('product.total', startProduct);

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 dark:bg-gray-900 md:dark:bg-black font-sans pb-28 md:pb-12">
      {jsonLdContent && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdContent }}
        />
      )}

      {/* Schema.org / JSON-LD for Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Schema.org / JSON-LD for Reviews as Discussion Group postings for GEO optimization */}
      {discussionSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(discussionSchema) }}
        />
      )}
      <div className="hidden md:block">
        <Header 
          shopName={shop.shopName} 
          logoUrl={shop.logoUrl} 
          menuItems={menuItems.map((item: any) => ({
            id: item.id,
            title: item.title,
            url: item.url,
            color: item.color,
            icon: item.icon
          }))}
          categories={categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            parentId: cat.parentId,
            children: cat.children
          }))}
          config={headerConfig}
        />
      </div>

      <main className="md:max-w-6xl md:mx-auto md:px-8 mt-0 md:mt-8">
        <ProductOverview product={product} brands={finalBrands} shopName={shop.shopName} />

        {/* Product Full Details & Reviews */}
        <ScrollReveal animation="fade-in-up" delay={100}>
          <div id="product-details-section" className="px-4 md:px-0 mt-8">
            <ProductTabs 
              productId={product.id}
              fullDescription={product.fullDescription}
              specs={product.specs}
              faqs={product.faqs}
              reviews={product.reviews.map((r: any) => ({
                ...r,
                createdAt: r.createdAt.toISOString()
              }))}
            />
          </div>
        </ScrollReveal>

        {/* Related Products Section (Mobile Carousel, styled as Stories) */}
        {settings?.relatedProductsEnabled !== false && (
          <ScrollReveal animation="fade-in-up" delay={150}>
            <div className="mt-12">
              <RelatedProductsStories products={relatedProducts} />
            </div>
          </ScrollReveal>
        )}
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      {/* Bottom Navigation (Hidden on Desktop) */}
      <div className="lg:hidden hidden">
        <BottomNav />
      </div>
    </div>
  );
}
