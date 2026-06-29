import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound, permanentRedirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import BottomNav from '@/components/layout/BottomNav';
import BlogPostClient from './BlogPostClient';
import type { Metadata } from 'next';
import { cache } from 'react';
import { headers } from 'next/headers';
import { verifyAuth } from '@/lib/auth';
import { injectContextualLinks, generateBreadcrumbSchema, generateDiscussionSchema } from '@/lib/seo-geo';

// Cached function to fetch blog post data to avoid duplicate queries
const getBlogPostData = cache(async (slug: string, shopId: string, isAdmin: boolean = false) => {
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {
    console.error('Failed to decode blog slug:', e);
  }

  const post = await prisma.blogPost.findFirst({
    where: {
      shopId: shopId,
      slug: decodedSlug.trim().toLowerCase(),
      ...(isAdmin ? {} : {
        status: 'published',
        publishedAt: { lte: new Date() }
      })
    },
    include: {
      category: true,
      author: {
        select: {
          name: true,
          avatarUrl: true,
        }
      }
    }
  });

  if (!post) {
    return null;
  }

  // Increment viewCount asynchronously on the server side (only for non-admins to avoid inflating views)
  if (!isAdmin) {
    try {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      });
    } catch (err) {
      console.error('Failed to increment viewCount:', err);
    }
  }

  // Fetch comments (only approved ones unless admin)
  const comments = await prisma.blogComment.findMany({
    where: {
      shopId: shopId,
      postId: post.id,
      ...(isAdmin ? {} : { status: 'approved' })
    },
    orderBy: { createdAt: 'asc' },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  // Fetch related posts (same category, excluding current post, up to 3)
  let relatedPosts: any[] = [];
  if (post.categoryId) {
    relatedPosts = await prisma.blogPost.findMany({
      where: {
        shopId: shopId,
        categoryId: post.categoryId,
        status: 'published',
        publishedAt: { lte: new Date() },
        NOT: { id: post.id }
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: {
        author: { select: { name: true } }
      }
    });
  }

  // Fetch next and previous posts
  const [prevPost, nextPost] = await Promise.all([
    prisma.blogPost.findFirst({
      where: {
        shopId: shopId,
        status: 'published',
        publishedAt: { lte: new Date() },
        createdAt: { lt: post.createdAt }
      },
      orderBy: { createdAt: 'desc' },
      select: { title: true, slug: true }
    }),
    prisma.blogPost.findFirst({
      where: {
        shopId: shopId,
        status: 'published',
        publishedAt: { lte: new Date() },
        createdAt: { gt: post.createdAt }
      },
      orderBy: { createdAt: 'asc' },
      select: { title: true, slug: true }
    })
  ]);

  // Fetch dynamically related products (Silo/Tree-Structured internal linking for SEO + GEO)
  let relatedProducts: any[] = [];
  try {
    let tagsList: string[] = [];
    try {
      tagsList = JSON.parse(post.tags || '[]');
    } catch (e) {}

    // Keywords are sourced from tags, category name, and words in post title
    const searchKeywords = Array.from(new Set([
      ...(post.category?.name ? [post.category.name] : []),
      ...tagsList,
      ...post.title.split(' ').filter(w => w.length > 3)
    ])).slice(0, 5); // Take top 5 keywords for query efficiency

    if (searchKeywords.length > 0) {
      relatedProducts = await prisma.product.findMany({
        where: {
          shopId: shopId,
          isActive: true,
          OR: searchKeywords.map(keyword => ({
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
              { brand: { contains: keyword, mode: 'insensitive' } }
            ]
          }))
        },
        take: 4,
        select: {
          id: true,
          title: true,
          price: true,
          discount: true,
          imageUrl: true,
          stock: true,
          description: true,
          brand: true
        }
      });
    }
  } catch (err) {
    console.error('Failed to fetch related products for blog post:', err);
  }

  // Fetch other items from shop to generate contextual internal links
  let keywordLinks: { text: string; url: string; title: string }[] = [];
  try {
    const [allProductsForLinking, otherPostsForLinking] = await Promise.all([
      prisma.product.findMany({
        where: { shopId: shopId, isActive: true },
        take: 12,
        select: { id: true, title: true }
      }),
      prisma.blogPost.findMany({
        where: { shopId: shopId, status: 'published', NOT: { id: post.id } },
        take: 8,
        select: { slug: true, title: true }
      })
    ]);

    keywordLinks = [
      ...allProductsForLinking.map(p => ({
        text: p.title,
        url: `/product/${p.id}`,
        title: `مشاهده و خرید ${p.title}`
      })),
      ...otherPostsForLinking.map(bp => ({
        text: bp.title,
        url: `/blog/${bp.slug}`,
        title: bp.title
      }))
    ];
  } catch (err) {
    console.error('Failed to compile keyword linking metadata:', err);
  }

  // Auto-inject contextual links into the blog content itself!
  const currentUrl = `/blog/${post.slug}`;
  const linkedContent = injectContextualLinks(post.content, keywordLinks, currentUrl, 4);

  // Auto-inject contextual links inside approved user comments!
  const linkedComments = comments.map(c => ({
    ...c,
    content: injectContextualLinks(c.content, keywordLinks, '', 2) // Limit to 2 links per comment max
  }));

  return {
    post: {
      ...post,
      content: linkedContent, // Use the dynamically linked content
      viewCount: post.viewCount + (isAdmin ? 0 : 1),
      isPreview: post.status !== 'published' || post.publishedAt > new Date()
    },
    comments: linkedComments,
    relatedPosts,
    relatedProducts, // Send related products to client component!
    navigation: {
      prevPost,
      nextPost
    }
  };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const shop = await getTenantShop();
  if (!shop) {
    return { title: 'مطلب یافت نشد' };
  }

  const { slug } = await params;
  const headersList = await headers();
  const mockReq = new Request(`http://${headersList.get('host') || 'localhost'}`, {
    headers: headersList
  });
  const adminUser = await verifyAuth(mockReq, 'admin');
  const isAdmin = !!adminUser;

  const data = await getBlogPostData(slug, shop.shopId, isAdmin);

  if (!data || !data.post) {
    return { title: 'مطلب پیدا نشد' };
  }

  const post = data.post;
  const pageTitle = `${post.seoTitle || post.title} | وبلاگ ${shop.shopName}`;
  const pageDesc = post.seoDescription || post.summary || 'مشاهده مقاله در وبلاگ فروشگاه';
  const pageImage = post.featuredImage || '';

  const host = headersList.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const canonicalUrl = `${protocol}://${host}/blog/${post.slug}`;

  let tagsList: string[] = [];
  try {
    tagsList = JSON.parse(post.tags || '[]');
  } catch (e) {}

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
      images: pageImage ? [{ url: pageImage, alt: post.title }] : [],
      type: 'article',
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author?.name || post.authorName || 'مدیر سایت'],
      tags: tagsList,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: pageImage ? [pageImage] : [],
    }
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const shop = await getTenantShop();
  
  if (!shop) {
    return notFound();
  }

  const { slug } = await params;
  const headersList = await headers();
  const mockReq = new Request(`http://${headersList.get('host') || 'localhost'}`, {
    headers: headersList
  });
  const adminUser = await verifyAuth(mockReq, 'admin');
  const isAdmin = !!adminUser;

  const postData = await getBlogPostData(slug, shop.shopId, isAdmin);

  if (!postData || !postData.post) {
    const decodedSlug = decodeURIComponent(slug);
    const keywords = decodedSlug.split(/[-_\s]+/).filter(w => w.length > 1);

    const matchedPost = await prisma.blogPost.findFirst({
      where: {
        shopId: shop.shopId,
        status: 'published',
        OR: [
          { title: { contains: decodedSlug, mode: 'insensitive' } },
          { slug: { contains: decodedSlug, mode: 'insensitive' } },
          ...(keywords.map(keyword => ({
            title: { contains: keyword, mode: 'insensitive' }
          })))
        ]
      },
      select: { slug: true }
    });

    if (matchedPost) {
      permanentRedirect(`/blog/${matchedPost.slug}`);
    }

    // Try to search shop products
    const matchedProduct = await prisma.product.findFirst({
      where: {
        shopId: shop.shopId,
        isActive: true,
        title: { contains: decodedSlug, mode: 'insensitive' }
      },
      select: { id: true }
    });

    if (matchedProduct) {
      permanentRedirect(`/product/${matchedProduct.id}`);
    }

    if (decodedSlug.trim().length > 2) {
      permanentRedirect(`/blog?search=${encodeURIComponent(decodedSlug)}`);
    }

    return notFound();
  }

  // Fetch header layout items and product categories
  const [categories, menuItems] = await Promise.all([
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

  // Construct Canonical URL
  const host = headersList.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const canonicalUrl = `${protocol}://${host}/blog/${postData.post.slug}`;

  // Serialize server dates for client component consumption
  const serializedPostData = {
    post: {
      ...postData.post,
      publishedAt: postData.post.publishedAt.toISOString(),
      createdAt: postData.post.createdAt.toISOString(),
      updatedAt: postData.post.updatedAt.toISOString(),
      author: postData.post.author ? {
        name: postData.post.author.name || 'مدیر سایت',
        avatarUrl: postData.post.author.avatarUrl
      } : null,
    },
    comments: postData.comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    })),
    relatedPosts: postData.relatedPosts.map(rp => ({
      ...rp,
      publishedAt: rp.publishedAt.toISOString(),
      createdAt: rp.createdAt.toISOString(),
      updatedAt: rp.updatedAt.toISOString(),
    })),
    relatedProducts: postData.relatedProducts ? postData.relatedProducts.map(rp => ({
      ...rp,
      price: Number(rp.price),
      discount: rp.discount ? Number(rp.discount) : 0
    })) : [],
    navigation: postData.navigation
  };

  // Structured Data Schema for Articles (JSON-LD)
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    'headline': postData.post.title,
    'description': postData.post.seoDescription || postData.post.summary || postData.post.title,
    'image': postData.post.featuredImage ? [postData.post.featuredImage] : [],
    'datePublished': postData.post.publishedAt.toISOString(),
    'dateModified': postData.post.updatedAt.toISOString(),
    'author': {
      '@type': 'Person',
      'name': postData.post.author?.name || postData.post.authorName || 'مدیر سایت',
    },
    'publisher': {
      '@type': 'Organization',
      'name': shop.shopName,
      'logo': shop.logoUrl ? {
        '@type': 'ImageObject',
        'url': shop.logoUrl,
      } : undefined,
    },
  };

  // Parse FAQs for FAQPage JSON-LD schema
  let faqSchema: any = null;
  try {
    const parsedFaqs = JSON.parse(postData.post.faqs || '[]');
    if (Array.isArray(parsedFaqs) && parsedFaqs.length > 0) {
      faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': parsedFaqs.map((faq: any) => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      };
    }
  } catch (e) {
    console.error('Failed to parse blog post faqs for schema:', e);
  }

  // Build Breadcrumb List Schema
  const breadcrumbItems = [
    { name: 'خانه', url: '/' },
    { name: 'وبلاگ', url: '/blog' },
    ...(postData.post.category ? [{ name: postData.post.category.name, url: `/blog?category=${postData.post.category.slug}` }] : []),
    { name: postData.post.title, url: `/blog/${postData.post.slug}` }
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(host || 'localhost:3000', breadcrumbItems);

  // Build Discussion Forum Schema if comments exist
  const discussionSchema = generateDiscussionSchema(
    canonicalUrl,
    postData.post.title,
    postData.comments.map(c => ({
      name: c.name,
      content: c.content,
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : (c.createdAt as any).toISOString()
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-20 lg:pb-0" dir="rtl">
      {/* Schema.org / JSON-LD for Articles */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      {/* Schema.org / JSON-LD for Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Schema.org / JSON-LD for Discussion Forum */}
      {discussionSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(discussionSchema) }}
        />
      )}

      {/* Schema.org / JSON-LD for FAQs */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

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
          }))
        }))}
        config={headerConfig}
      />

      {/* Main Single Blog Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <BlogPostClient slug={slug} initialData={serializedPostData} />
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />

      {/* Bottom Nav for Mobile */}
      <BottomNav />
    </div>
  );
}
