import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { Invalidate } from '@/lib/invalidate';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.blogPost.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'پست پیدا نشد' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('[ERROR] [BlogPostAdminGetId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

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

    const post = await prisma.blogPost.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'پست پیدا نشد' }, { status: 404 });
    }

    // Check slug uniqueness (if changed) and generate a unique one if needed
    let baseSlug = slug.trim().toLowerCase();
    let uniqueSlug = baseSlug;
    let isUnique = false;
    let slugAttempt = 0;

    while (!isUnique) {
      const existing = await prisma.blogPost.findFirst({
        where: {
          shopId: payload.shopId,
          slug: uniqueSlug,
          NOT: { id }
        }
      });

      if (!existing) {
        isUnique = true;
      } else {
        slugAttempt++;
        uniqueSlug = `${baseSlug}-${slugAttempt}`;
      }
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? tags : JSON.stringify([]));
    const faqsJson = Array.isArray(faqs) ? JSON.stringify(faqs) : (typeof faqs === 'string' ? faqs : JSON.stringify([]));

    // Check if the author exists in the User table to avoid foreign key violations
    let targetAuthorId = authorId || post.authorId || payload.id || null;
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

    // If no image is provided, generate a minimal SVG placeholder
    let finalFeaturedImage = featuredImage !== undefined ? featuredImage : post.featuredImage;
    if (!finalFeaturedImage && title) {
      const { generateMinimalImage } = require('@/lib/minimal-image');
      let categoryName = undefined;
      const catId = targetCategoryId !== undefined ? targetCategoryId : post.categoryId;
      if (catId) {
        const category = await prisma.blogCategory.findUnique({ where: { id: catId } });
        if (category) categoryName = category.name;
      }
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: payload.shopId as string }
      });
      finalFeaturedImage = generateMinimalImage(title.trim(), 'article', categoryName, shopSettings?.themeColor || undefined);
    }

    const updatedPost = await prisma.blogPost.update({
      where: {
        id,
        shopId: payload.shopId,
      },
      data: {
        title: title.trim(),
        slug: uniqueSlug,
        content,
        summary: summary || null,
        featuredImage: finalFeaturedImage,
        status: status || 'draft',
        publishedAt: publishedAt ? new Date(publishedAt) : post.publishedAt,
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

    await Invalidate.blogPost(payload.shopId as string, updatedPost.slug);

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error('[ERROR] [BlogPostAdminPutId]:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.blogPost.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'پست پیدا نشد' }, { status: 404 });
    }

    await prisma.blogPost.delete({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    await Invalidate.blogPost(payload.shopId as string, post.slug);

    return NextResponse.json({ success: true, message: 'پست با موفقیت حذف شد' });
  } catch (error) {
    console.error('[ERROR] [BlogPostAdminDeleteId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
