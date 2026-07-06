import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { getCachedCategories, getCachedMenuItems } from '@/lib/cached-queries';
import { logPerf } from '@/lib/perf-logger';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import BottomNav from '@/components/layout/BottomNav';
import BlogListClient from './BlogListClient';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop();
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const canonicalUrl = `${protocol}://${host}/blog`;

  if (!shop) {
    const pageTitle = 'وبلاگ رسمی پلتفرم برسانا | مقالات راه‌اندازی کسب‌وکار و سئو';
    const pageDesc = 'لیست مقالات تخصصی، بریف‌های تولید محتوا، ترفندهای تجارت الکترونیک، سئو و بازاریابی در پلتفرم فروشگاه‌ساز برسانا';
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
        siteName: 'برسانا',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: pageTitle,
        description: pageDesc,
      }
    };
  }

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
  const startBlog = performance.now();
  const shop = await getTenantShop();
  logPerf('blog.tenant_resolve', startBlog);
  
  if (!shop) {
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
      status: 'published',
    };

    if (activeCategory !== 'all') {
      where.category = {
        slug: activeCategory.trim().toLowerCase(),
      };
    }

    if (activeTag !== 'all') {
      where.tags = {
        some: {
          tag: {
            name: {
              equals: activeTag,
              mode: 'insensitive'
            }
          }
        }
      };
    }

    if (activeSearch.trim()) {
      where.OR = [
        { title: { contains: activeSearch, mode: 'insensitive' } },
        { content: { contains: activeSearch, mode: 'insensitive' } },
        { excerpt: { contains: activeSearch, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { publishedAt: 'desc' };
    if (activeSort === 'oldest') {
      orderBy = { publishedAt: 'asc' };
    }

    // Query PlatformBlogPost and PlatformBlogCategory
    const [posts, totalCount, popularPosts, categories, allTags] = await Promise.all([
      prisma.platformBlogPost.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          tags: {
            include: { tag: true }
          }
        }
      }),
      prisma.platformBlogPost.count({ where }),
      prisma.platformBlogPost.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: {
          category: true,
          tags: {
            include: { tag: true }
          }
        }
      }),
      prisma.platformBlogCategory.findMany({
        include: {
          _count: {
            select: { posts: { where: { status: 'published' } } }
          }
        }
      }),
      prisma.platformBlogTag.findMany({
        take: 15,
        include: {
          _count: {
            select: { posts: true }
          }
        }
      })
    ]);

    // Format posts to match BlogListClient interface
    const formatPost = (p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.excerpt,
      content: p.content,
      featuredImage: p.coverImage,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : p.createdAt.toISOString(),
      viewCount: p.readingTime * 12,
      tags: JSON.stringify((p.tags || []).map((t: any) => t.tag.name)),
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
      author: { name: p.author || 'سوپر ادمین', avatarUrl: null },
      _count: { comments: 0 }
    });

    const formattedPosts = posts.map(formatPost);
    const formattedPopularPosts = popularPosts.map(formatPost);
    const formattedCategories = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      _count: { posts: c._count.posts }
    }));
    const formattedTags = allTags.map(t => ({
      name: t.name,
      count: t._count.posts
    }));

    const pagination = {
      total: totalCount,
      page: activePage,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };

    const headersList = await headers();
    const host = headersList.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const canonicalUrl = `${protocol}://${host}/blog`;

    const jsonLdSchema = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${canonicalUrl}#blog`,
      'url': canonicalUrl,
      'name': 'وبلاگ رسمی پلتفرم برسانا',
      'description': 'مقالات تخصصی راه‌اندازی کسب‌وکار، سئو و تجارت الکترونیک پلتفرم فروشگاه‌ساز برسانا',
      'publisher': {
        '@type': 'Organization',
        'name': 'برسانا',
      },
      'blogPost': formattedPosts.map(p => ({
        '@type': 'BlogPosting',
        'headline': p.title,
        'description': p.summary || p.title,
        'image': p.featuredImage ? [p.featuredImage] : [],
        'datePublished': p.publishedAt,
        'url': `${protocol}://${host}/blog/${p.slug}`,
      })),
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0" dir="rtl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />

        {/* Central Website Header */}
        <div className="bg-white border-b border-slate-100 shadow-3xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-black text-lg text-slate-900">برسانا</span>
              <span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">فروشگاه‌ساز</span>
            </Link>
            <div className="flex items-center gap-6 text-xs font-bold text-slate-600">
              <Link href="/" className="hover:text-slate-900">صفحه اصلی</Link>
              <Link href="/blog" className="text-slate-900 font-extrabold border-b-2 border-slate-900 pb-1">وبلاگ</Link>
              <Link href="/super-admin" className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl hover:bg-slate-800 transition-all">ورود همکاران</Link>
            </div>
          </div>
        </div>

        {/* Blog Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <BlogListClient
            shopName="برسانا"
            initialPosts={formattedPosts}
            initialPagination={pagination}
            initialPopularPosts={formattedPopularPosts}
            initialCategories={formattedCategories}
            initialPopularTags={formattedTags}
            activeCategory={activeCategory}
            activeTag={activeTag}
            activeSearch={activeSearch}
            activePage={activePage}
            activeSort={activeSort}
          />
        </main>

        {/* Central Website Footer */}
        <footer className="bg-slate-950 text-slate-400 py-12 mt-20 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="text-white font-black text-sm">پلتفرم فروشگاه‌ساز برسانا</h4>
              <p className="text-xs leading-relaxed max-w-sm">
                برسانا کامل‌ترین پلتفرم چندمستأجری برای ساخت و مدیریت فروشگاه‌های اینترنتی با هوش مصنوعی و سئو پیشرفته در ایران است.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-white font-black text-sm">لینک‌های مفید</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/" className="hover:text-white">صفحه اصلی</Link></li>
                <li><Link href="/blog" className="hover:text-white">وبلاگ پلتفرم</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-white font-black text-sm">پشتیبانی پلتفرم</h4>
              <p className="text-xs leading-relaxed">
                در صورت بروز هرگونه مشکل سیستمی یا سوال در مورد اشتراک‌ها، می‌توانید با واحد پشتیبانی سوپر ادمین برسانا در ارتباط باشید.
              </p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-900 mt-10 pt-6 text-center text-xs">
            کلیه حقوق این سایت متعلق به پلتفرم فروشگاه‌ساز برسانا می‌باشد. © ۲۰۲۶
          </div>
        </footer>
      </div>
    );
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

  const startData = performance.now();
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
  logPerf('blog.data_load', startData);

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
    getCachedCategories(shop.shopId),
    getCachedMenuItems(shop.shopId)
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

  logPerf('blog.total', startBlog);

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
