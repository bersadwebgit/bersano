import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import DOMPurify from 'isomorphic-dompurify';
import { verifyPlatformSession } from '@/lib/platform-auth';

export async function GET() {
  const session = await verifyPlatformSession(['superadmin', 'content_manager', 'seo_manager']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const posts = await prisma.platformBlogPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        tags: {
          include: { tag: true }
        }
      }
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching central posts:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت مقالات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Only content manager and superadmin can write posts
  const session = await verifyPlatformSession(['superadmin', 'content_manager']);
  if (!session) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز؛ فقط مدیر محتوا یا سوپر ادمین امکان ایجاد مقاله دارند' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      title, slug, excerpt, content, coverImage, status, categoryId, author,
      metaTitle, metaDescription, focusKeyword, secondaryKeywords,
      geoSummary, keyTakeaways, entityList, topicClusters, faqSection,
      schemaType, structuredData, internalLinks, externalReferences,
      noindex, nofollow, ogTitle, ogDescription, ogImage,
      twitterTitle, twitterDescription, twitterImage, tags
    } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'پر کردن عنوان، اسلاگ و محتوای مقاله الزامی است' }, { status: 400 });
    }

    // HTML sanitization to prevent XSS
    const sanitizedContent = DOMPurify.sanitize(content);

    const slugNormalized = slug.trim().toLowerCase().replace(/\s+/g, '-');

    // Verify slug uniqueness
    const existingPost = await prisma.platformBlogPost.findUnique({
      where: { slug: slugNormalized },
    });

    if (existingPost) {
      return NextResponse.json({ error: 'این اسلاگ قبلاً ثبت شده است. لطفاً یک اسلاگ یکتا انتخاب کنید.' }, { status: 400 });
    }

    const createdPost = await prisma.platformBlogPost.create({
      data: {
        title,
        slug: slugNormalized,
        excerpt,
        content: sanitizedContent,
        coverImage,
        status: status || 'draft',
        categoryId: categoryId || null,
        author: author || session.name,
        publishedAt: status === 'published' ? new Date() : null,
        metaTitle,
        metaDescription,
        focusKeyword,
        secondaryKeywords,
        geoSummary,
        keyTakeaways,
        entityList,
        topicClusters,
        faqSection: faqSection ? String(faqSection) : null,
        schemaType: schemaType || 'Article',
        structuredData,
        internalLinks,
        externalReferences,
        noindex: noindex || false,
        nofollow: nofollow || false,
        ogTitle,
        ogDescription,
        ogImage,
        twitterTitle,
        twitterDescription,
        twitterImage,
      }
    });

    // Create Tag relations if specified
    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
        await prisma.platformBlogPostTag.create({
          data: {
            postId: createdPost.id,
            tagId,
          }
        }).catch(err => console.error('Error adding post tag relation:', err));
      }
    }

    return NextResponse.json(createdPost, { status: 201 });
  } catch (error) {
    console.error('Error creating central blog post:', error);
    return NextResponse.json({ error: 'خطای سرور در ایجاد مقاله' }, { status: 500 });
  }
}
