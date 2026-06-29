import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shop = await getTenantShop();
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body; // 'like', 'dislike', 'remove_like', 'remove_dislike', 'switch_to_like', 'switch_to_dislike'

    const review = await prisma.review.findUnique({
      where: { id, shopId: shop.shopId }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    let likesUpdate = 0;
    let dislikesUpdate = 0;

    switch (action) {
      case 'like':
        likesUpdate = 1;
        break;
      case 'dislike':
        dislikesUpdate = 1;
        break;
      case 'remove_like':
        likesUpdate = -1;
        break;
      case 'remove_dislike':
        dislikesUpdate = -1;
        break;
      case 'switch_to_like':
        likesUpdate = 1;
        dislikesUpdate = -1;
        break;
      case 'switch_to_dislike':
        likesUpdate = -1;
        dislikesUpdate = 1;
        break;
    }

    // Ensure we don't go below 0
    const newLikes = Math.max(0, review.likes + likesUpdate);
    const newDislikes = Math.max(0, review.dislikes + dislikesUpdate);

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        likes: newLikes,
        dislikes: newDislikes
      }
    });

    return NextResponse.json({ success: true, likes: updatedReview.likes, dislikes: updatedReview.dislikes });
  } catch (error) {
    console.error('Error updating review interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
