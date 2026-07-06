import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import DOMPurify from 'isomorphic-dompurify';
import { verifyPlatformSession } from '@/lib/platform-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyPlatformSession(['superadmin', 'content_manager', 'seo_manager']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.platformBlogPost.findUnique({
      where: { id },
      include: {
        category: true,
        tags: {
          include: { tag: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 444 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching central post:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SEO Managers can edit SEO metadata fields. Content Managers and Superadmins can edit everything.
  const session = await verifyPlatformSession(['superadmin', 'content_manager', 'seo_manager']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const existingPost = await prisma.platformBlogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 444 });
    }

    // Role check: SEO Manager can only modify SEO/Metadata/GEO fields
    const isSeoOnly = session.role === 'seo_manager';

    const data: any = {};

    // Standard fields (blocked for SEO Manager)
    if (!isSeoOnly) {
      if (body.title) data.title = body.title;
      if (body.slug) {
        const slugNormalized = body.slug.trim().toLowerCase().replace(/\s+/g, '-');
        if (slugNormalized !== existingPost.slug) {
          const slugExists = await prisma.platformBlogPost.findFirst({
            where: { slug: slugNormalized, NOT: { id } },
          });
          if (slugExists) {
            return NextResponse.json({ error: 'این اسلاگ قبلاً برای مقاله دیگری استفاده شده است.' }, { status: 400 });
          }
          data.slug = slugNormalized;
        }
      }
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.content !== undefined) {
        data.content = DOMPurify.sanitize(body.content);
      }
      if (body.coverImage !== undefined) data.coverImage = body.coverImage;
      if (body.status) {
        data.status = body.status;
        if (body.status === 'published' && !existingPost.publishedAt) {
          data.publishedAt = new Date();
        }
      }
      if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
      if (body.author) data.author = body.author;
    }

    // SEO/GEO fields (allowed for both SEO Manager and Content Manager/Superadmin)
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;
    if (body.focusKeyword !== undefined) data.focusKeyword = body.focusKeyword;
    if (body.secondaryKeywords !== undefined) data.secondaryKeywords = body.secondaryKeywords;
    if (body.geoSummary !== undefined) data.geoSummary = body.geoSummary;
    if (body.keyTakeaways !== undefined) data.keyTakeaways = body.keyTakeaways;
    if (body.entityList !== undefined) data.entityList = body.entityList;
    if (body.topicClusters !== undefined) data.topicClusters = body.topicClusters;
    if (body.faqSection !== undefined) data.faqSection = body.faqSection ? String(body.faqSection) : null;
    if (body.schemaType !== undefined) data.schemaType = body.schemaType || 'Article';
    if (body.structuredData !== undefined) data.structuredData = body.structuredData;
    if (body.internalLinks !== undefined) data.internalLinks = body.internalLinks;
    if (body.externalReferences !== undefined) data.externalReferences = body.externalReferences;
    if (body.noindex !== undefined) data.noindex = body.noindex;
    if (body.nofollow !== undefined) data.nofollow = body.nofollow;
    if (body.ogTitle !== undefined) data.ogTitle = body.ogTitle;
    if (body.ogDescription !== undefined) data.ogDescription = body.ogDescription;
    if (body.ogImage !== undefined) data.ogImage = body.ogImage;
    if (body.twitterTitle !== undefined) data.twitterTitle = body.twitterTitle;
    if (body.twitterDescription !== undefined) data.twitterDescription = body.twitterDescription;
    if (body.twitterImage !== undefined) data.twitterImage = body.twitterImage;

    const updatedPost = await prisma.platformBlogPost.update({
      where: { id },
      data,
    });

    // Handle tag updating (blocked for SEO Manager)
    if (!isSeoOnly && body.tags && Array.isArray(body.tags)) {
      // Clear old tag relations
      await prisma.platformBlogPostTag.deleteMany({
        where: { postId: id },
      });

      // Insert new tag relations
      for (const tagId of body.tags) {
        await prisma.platformBlogPostTag.create({
          data: {
            postId: id,
            tagId,
          }
        }).catch(err => console.error('Error adding post tag relation on update:', err));
      }
    }

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Error updating central blog post:', error);
    return NextResponse.json({ error: 'خطای سرور در ویرایش مقاله' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only content manager and superadmin can delete posts
  const session = await verifyPlatformSession(['superadmin', 'content_manager']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingPost = await prisma.platformBlogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 444 });
    }

    await prisma.platformBlogPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting central post:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف مقاله' }, { status: 500 });
  }
}
