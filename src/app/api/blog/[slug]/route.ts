import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const host = req.headers.get('host') || '';
    const shop = await getTenantShop(host);

    if (!shop || !shop.shopId) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { slug } = await params;

    let decodedSlug = slug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch (e) {
      console.error('Failed to decode blog slug in GET API:', e);
    }

    const adminUser = await verifyAuth(req, 'admin');
    const isAdmin = !!adminUser;

    // Fetch the post
    const post = await prisma.blogPost.findFirst({
      where: {
        shopId: shop.shopId,
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
      return NextResponse.json({ error: 'مطلب مورد نظر پیدا نشد' }, { status: 404 });
    }

    // Increment viewCount asynchronously (only for non-admins to avoid inflating views)
    if (!isAdmin) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      });
    }

    // Fetch comments (only approved ones unless admin)
    const comments = await prisma.blogComment.findMany({
      where: {
        shopId: shop.shopId,
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
          shopId: shop.shopId,
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

    // Fetch next and previous posts for the single post page navigation
    const [prevPost, nextPost] = await Promise.all([
      prisma.blogPost.findFirst({
        where: {
          shopId: shop.shopId,
          status: 'published',
          publishedAt: { lte: new Date() },
          createdAt: { lt: post.createdAt }
        },
        orderBy: { createdAt: 'desc' },
        select: { title: true, slug: true }
      }),
      prisma.blogPost.findFirst({
        where: {
          shopId: shop.shopId,
          status: 'published',
          publishedAt: { lte: new Date() },
          createdAt: { gt: post.createdAt }
        },
        orderBy: { createdAt: 'asc' },
        select: { title: true, slug: true }
      })
    ]);

    return NextResponse.json({
      post: {
        ...post,
        viewCount: post.viewCount + (isAdmin ? 0 : 1) // Reflect the incremented count in response
      },
      comments,
      relatedPosts,
      navigation: {
        prevPost,
        nextPost
      }
    });
  } catch (error) {
    console.error('[ERROR] [BlogSinglePostGet]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a comment (by visitors, goes into pending state)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const host = req.headers.get('host') || '';
    const shop = await getTenantShop(host);

    if (!shop || !shop.shopId) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { slug } = await params;
    const { name, email, content, parentId } = await req.json();

    if (!name || !content) {
      return NextResponse.json({ error: 'تمامی فیلدهای نام و متن نظر الزامی هستند' }, { status: 400 });
    }

    let finalEmail = email ? email.trim().toLowerCase() : '';

    if (!finalEmail) {
      // Check if logged in customer or admin
      const tokenUser = await verifyAuth(req, 'customer') || await verifyAuth(req, 'admin');
      if (tokenUser && tokenUser.email) {
        finalEmail = tokenUser.email;
      } else {
        // Fallback for anonymous visitors if email is left blank
        finalEmail = `guest-${Date.now()}@example.com`;
      }
    }

    let decodedSlug = slug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch (e) {
      console.error('Failed to decode blog slug in POST API:', e);
    }

    // Find the post
    const post = await prisma.blogPost.findFirst({
      where: {
        shopId: shop.shopId,
        slug: decodedSlug.trim().toLowerCase(),
        status: 'published',
        publishedAt: { lte: new Date() }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'مطلب پیدا نشد' }, { status: 404 });
    }

    if (!post.allowComments) {
      return NextResponse.json({ error: 'ثبت نظر برای این مطلب غیرفعال شده است' }, { status: 400 });
    }

    // Create the comment in pending status
    const comment = await prisma.blogComment.create({
      data: {
        shopId: shop.shopId,
        postId: post.id,
        parentId: parentId || null,
        name: name.trim(),
        email: finalEmail,
        content: content.trim(),
        status: 'pending', // Requires admin approval
      }
    });

    return NextResponse.json({
      success: true,
      message: 'نظر شما با موفقیت ثبت شد و پس از تأیید نمایش داده خواهد شد.',
      comment
    });
  } catch (error) {
    console.error('[ERROR] [BlogCommentPostVisitor]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
