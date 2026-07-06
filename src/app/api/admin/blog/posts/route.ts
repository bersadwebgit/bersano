import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { clearShopDemoDataWithTx } from '@/lib/clear-demo-data';
import { Invalidate } from '@/lib/invalidate';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { validateUrl } from '@/lib/validate-url';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const authorId = searchParams.get('authorId');
    const search = searchParams.get('search');

    const where: any = {
      shopId: payload.shopId,
    };

    if (status) {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (authorId) {
      where.authorId = authorId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('[ERROR] [BlogPostsAdminGet]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    if (data.content) data.content = sanitizeHtml(data.content);
    if (data.summary) data.summary = sanitizeHtml(data.summary);

    if (data.featuredImage && !(await validateUrl(data.featuredImage))) {
      data.featuredImage = null;
    }
    if (data.ogImage && !(await validateUrl(data.ogImage))) {
      data.ogImage = null;
    }

    const {
      title,
      slug,
      content,
      summary,
      featuredImage,
      status,
      publishedAt,
      authorId,
      authorName,
      categoryId,
      tags,
      seoTitle,
      seoDescription,
      seoSlug,
      ogImage,
      allowComments,
      faqs
    } = data;

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'عنوان، اسلاگ و محتوای پست الزامی هستند' }, { status: 400 });
    }

    // Check slug uniqueness in this shop and generate a unique one if needed
    let baseSlug = slug.trim().toLowerCase();
    let uniqueSlug = baseSlug;
    let isUnique = false;
    let slugAttempt = 0;

    while (!isUnique) {
      const existing = await prisma.blogPost.findFirst({
        where: {
          shopId: payload.shopId,
          slug: uniqueSlug,
        }
      });

      if (!existing) {
        isUnique = true;
      } else {
        slugAttempt++;
        uniqueSlug = `${baseSlug}-${slugAttempt}`;
      }
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]);
    const faqsJson = Array.isArray(faqs) ? JSON.stringify(faqs) : JSON.stringify([]);

    // Check if the author exists in the User table to avoid foreign key violations
    let targetAuthorId = authorId || payload.id || null;
    if (targetAuthorId) {
      const userExists = await prisma.user.findFirst({
        where: {
          id: targetAuthorId,
          shopId: payload.shopId,
        }
      });
      if (!userExists) {
        targetAuthorId = null;
      }
    }

    // Check if the category exists in the BlogCategory table to avoid foreign key violations
    let targetCategoryId = categoryId === '' ? null : (categoryId || null);
    if (targetCategoryId) {
      const categoryExists = await prisma.blogCategory.findFirst({
        where: { id: targetCategoryId, shopId: payload.shopId }
      });
      if (!categoryExists) {
        targetCategoryId = null;
      }
    }

    // If shop has demo data, clear only demo items before creating a real blog post
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: payload.shopId as string }
    });

    if (shopSettings?.hasDemoData) {
      try {
        await prisma.$transaction(async (tx) => {
          await clearShopDemoDataWithTx(payload.shopId as string, tx);
        });
        // Invalidate the entire shop cache to ensure all deleted demo items (stories, slides, products) disappear immediately
        await Invalidate.shop(payload.shopId as string);
      } catch (clearErr) {
        console.error('Failed to clear demo data on blog post creation:', clearErr);
      }
    }

    // If no image is provided, generate a minimal SVG placeholder
    let finalFeaturedImage = featuredImage || null;
    if (!finalFeaturedImage) {
      const { generateMinimalImage } = require('@/lib/minimal-image');
      let categoryName = undefined;
      if (targetCategoryId) {
        const category = await prisma.blogCategory.findUnique({ where: { id: targetCategoryId } });
        if (category) categoryName = category.name;
      }
      finalFeaturedImage = generateMinimalImage(title.trim(), 'article', categoryName, shopSettings?.themeColor || undefined);
    }

    const post = await prisma.blogPost.create({
      data: {
        shopId: payload.shopId,
        title: title.trim(),
        slug: uniqueSlug,
        content,
        summary: summary || null,
        featuredImage: finalFeaturedImage,
        status: status || 'draft',
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        authorId: targetAuthorId,
        authorName: authorName || null,
        categoryId: targetCategoryId,
        tags: tagsJson,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoSlug: seoSlug || null,
        ogImage: ogImage || null,
        allowComments: allowComments !== undefined ? !!allowComments : true,
        faqs: faqsJson,
      }
    });

    await Invalidate.blogPost(payload.shopId as string, post.slug);

    return NextResponse.json({ post });
  } catch (error) {
    console.error('[ERROR] [BlogPostsAdminPost]:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
