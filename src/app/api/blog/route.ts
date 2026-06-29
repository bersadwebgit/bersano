import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host') || '';
    const shop = await getTenantShop(host);

    if (!shop || !shop.shopId) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'latest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '6');
    const skip = (page - 1) * limit;

    const where: any = {
      shopId: shop.shopId,
      status: 'published',
      publishedAt: {
        lte: new Date(),
      }
    };

    // Filter by Category Slug
    if (categorySlug) {
      where.category = {
        slug: categorySlug.trim().toLowerCase(),
      };
    }

    // Filter by Tag
    if (tag) {
      where.tags = {
        contains: `"${tag}"`, // Since it's stored as JSON string ["tag1", "tag2"]
        mode: 'insensitive'
      };
    }

    // Search query
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { publishedAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { publishedAt: 'asc' };
    } else if (sort === 'popular') {
      orderBy = { viewCount: 'desc' };
    }

    // Fetch posts
    const [posts, totalCount] = await Promise.all([
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
      prisma.blogPost.count({ where })
    ]);

    // Fetch popular posts (top 5 viewed)
    const popularPosts = await prisma.blogPost.findMany({
      where: {
        shopId: shop.shopId,
        status: 'published',
        publishedAt: { lte: new Date() }
      },
      orderBy: { viewCount: 'desc' },
      take: 5,
      include: {
        category: true,
        author: { select: { name: true } },
        _count: { select: { comments: { where: { status: 'approved' } } } }
      }
    });

    // Fetch categories with published post counts
    const categories = await prisma.blogCategory.findMany({
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
    });

    // Compile popular tags
    // Retrieve all published posts tags
    const allPostsWithTags = await prisma.blogPost.findMany({
      where: {
        shopId: shop.shopId,
        status: 'published',
        publishedAt: { lte: new Date() }
      },
      select: { tags: true }
    });

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

    // Sort tags by frequency
    const popularTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return NextResponse.json({
      posts,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      popularPosts,
      categories,
      popularTags,
    });
  } catch (error) {
    console.error('[ERROR] [BlogPublicGet]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
