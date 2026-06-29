import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import BottomNav from '@/components/layout/BottomNav';
import BlogListClient from './BlogListClient';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop();
  if (!shop) {
    return { title: 'وبلاگ یافت نشد' };
  }

  const headersList = await headers();
  const host = headersList.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const canonicalUrl = `${protocol}://${host}/blog`;

  const pageTitle = `وبلاگ ${shop.shopName} | مطالب آموزشی و مقالات`;
  const pageDesc = shop.description || 'لیست مقالات، مقالات جدید، راهنماها و مطالب وبلاگ';

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: canonicalUrl,
      siteName: shop.shopName,
      images: shop.logoUrl ? [{ url: shop.logoUrl, alt: shop.shopName }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: shop.logoUrl ? [shop.logoUrl] : [],
    }
  };
}

interface BlogListPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function BlogListPage({ searchParams }: BlogListPageProps) {
  const shop = await getTenantShop();
  
  if (!shop) {
    return notFound();
  }

  // Await searchParams for Next.js 15+ compatibility
  const resolvedSearchParams = await searchParams;
  const activeCategory = resolvedSearchParams.category || 'all';
  const activeTag = resolvedSearchParams.tag || 'all';
  const activeSearch = resolvedSearchParams.search || '';
  const activePage = parseInt(resolvedSearchParams.page || '1');
  const activeSort = resolvedSearchParams.sort || 'latest';
  const limit = 6;
  const skip = (activePage - 1) * limit;

  // Build database query filters
  const where: any = {
    shopId: shop.shopId,
    status: 'published',
    publishedAt: {
      lte: new Date(),
    }
  };

  // Filter by Category Slug
  if (activeCategory !== 'all') {
    where.category = {
      slug: activeCategory.trim().toLowerCase(),
    };
  }

  // Filter by Tag
  if (activeTag !== 'all') {
    where.tags = {
      contains: `"${activeTag}"`,
      mode: 'insensitive',
    };
  }

  // Search query
  if (activeSearch.trim()) {
    where.OR = [
      { title: { contains: activeSearch, mode: 'insensitive' } },
      { content: { contains: activeSearch, mode: 'insensitive' } },
      { summary: { contains: activeSearch, mode: 'insensitive' } },
    ];
  }

  // Setup sorting order
  let orderBy: any = { publishedAt: 'desc' };
  if (activeSort === 'oldest') {
    orderBy = { publishedAt: 'asc' };
  } else if (activeSort === 'popular') {
    orderBy = { viewCount: 'desc' };
  }

  // Fetch blog data on the server
  const [posts, totalCount, popularPosts, categories, allPostsWithTags] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: true,
        author: {
          select: {
            name: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: { comments: { where: { status: 'approved' } } }
        }
      }
    }),
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where: {
        shopId: shop.shopId,
        status: 'published',
        publishedAt: { lte: new Date() }
      },
      orderBy: { viewCount: 'desc' },
      take: 5,
      include: {
        category: true,
        author: {
          select: {
            name: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: { comments: { where: { status: 'approved' } } }
        }
      }
    }),
    prisma.blogCategory.findMany({
      where: { shopId: shop.shopId },
      include: {
        _count: {
          select: {
            posts: {
              where: {
                status: 'published',
                publishedAt: { lte: new Date() }
              }
            }
          }
        }
      }
    }),
    prisma.blogPost.findMany({
      where: {
        shopId: shop.shopId,
        status: 'published',
        publishedAt: { lte: new Date() }
      },
      select: { tags: true }
    })
  ]);

  // Compile popular tags
  const tagCounts: Record<string, number> = {};
  allPostsWithTags.forEach(p => {
    try {
      const parsedTags = JSON.parse(p.tags || '[]');
      if (Array.isArray(parsedTags)) {
        parsedTags.forEach((t: string) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    } catch (e) {}
  });

  const popularTags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Fetch header layout items (product categories and menu items)
  const [productCategories, menuItems] = await Promise.all([
    prisma.category.findMany({
      where: { shopId: shop.shopId, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.menuItem.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { order: 'asc' }
    })
  ]);

  let headerConfig = undefined;
  const footerConfig = await getFooterConfig();
  if (shop.headerConfig) {
    try {
      headerConfig = JSON.parse(shop.headerConfig);
    } catch (e) {
      // ignore
    }
  }

  // Structure pagination info
  const pagination = {
    total: totalCount,
    page: activePage,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1
  };

  // Construct Canonical URL
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const canonicalUrl = `${protocol}://${host}/blog`;

  // Structured Data Schema for Blog (JSON-LD)
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${canonicalUrl}#blog`,
    'url': canonicalUrl,
    'name': `وبلاگ ${shop.shopName}`,
    'description': shop.description || 'مطالب آموزشی و مقالات وبلاگ فروشگاه',
    'publisher': {
      '@type': 'Organization',
      'name': shop.shopName,
      'logo': shop.logoUrl ? {
        '@type': 'ImageObject',
        'url': shop.logoUrl,
      } : undefined,
    },
    'blogPost': posts.map(p => ({
      '@type': 'BlogPosting',
      'headline': p.title,
      'description': p.summary || p.seoDescription || p.title,
      'image': p.featuredImage ? [p.featuredImage] : [],
      'datePublished': p.publishedAt.toISOString(),
      'url': `${protocol}://${host}/blog/${p.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0" dir="rtl">
      {/* Schema.org / JSON-LD for Blog Listing Page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

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
        categories={productCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          parentId: cat.parentId,
          children: cat.children?.map(child => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
          }))
        }))}
        config={headerConfig}
      />

      {/* Main Blog Client Component with SSR Initial Data */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <BlogListClient
          shopName={shop.shopName}
          initialPosts={posts.map(p => ({
            ...p,
            publishedAt: p.publishedAt.toISOString(),
            author: p.author ? {
              name: p.author.name || 'مدیر سایت',
              avatarUrl: p.author.avatarUrl
            } : null
          }))}
          initialPagination={pagination}
          initialPopularPosts={popularPosts.map(p => ({
            ...p,
            publishedAt: p.publishedAt.toISOString(),
            author: p.author ? {
              name: p.author.name || 'مدیر سایت',
              avatarUrl: p.author.avatarUrl
            } : null
          }))}
          initialCategories={categories}
          initialPopularTags={popularTags}
          activeCategory={activeCategory}
          activeTag={activeTag}
          activeSearch={activeSearch}
          activePage={activePage}
          activeSort={activeSort}
        />
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      {/* Bottom Nav for Mobile */}
      <BottomNav />
    </div>
  );
}
