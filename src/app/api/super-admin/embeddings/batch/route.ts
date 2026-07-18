import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { startBackgroundEmbedding, getEmbeddingProgress } from '@/lib/product-embedding';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const superAdmin = await verifySuperAdmin();
    if (!superAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { shopId, batchSize = 20 } = body;

    const progress = getEmbeddingProgress();
    if (progress.isProcessing) {
      return NextResponse.json(
        { error: 'یک فرآیند پردازش در حال حاضر در حال اجراست. لطفاً تا پایان آن صبور باشید.' },
        { status: 409 }
      );
    }

    if (shopId) {
      // Process single shop
      const shop = await prisma.shopSettings.findUnique({
        where: { shopId },
        select: { shopId: true },
        allowCrossTenant: true,
      } as any);

      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }
    }

    // Trigger background process (non-blocking)
    startBackgroundEmbedding(shopId, batchSize).catch((err) => {
      console.error('[Background Embedding] Unhandled error:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'پردازش دسته‌ای در پس‌زمینه آغاز شد.',
    });
  } catch (error: any) {
    console.error('[SuperAdmin Batch Embed] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const superAdmin = await verifySuperAdmin();
    if (!superAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get statistics of embedded vs non-embedded products
    const totalProducts = (await prisma.product.count({
      allowCrossTenant: true,
    } as any)) as number;
    const embeddedProducts = (await prisma.product.count({
      where: {
        embeddingUpdatedAt: { not: null },
      },
      allowCrossTenant: true,
    } as any)) as number;

    const pendingProducts = totalProducts - embeddedProducts;
    const progress = getEmbeddingProgress();

    return NextResponse.json({
      totalProducts,
      embeddedProducts,
      pendingProducts,
      progress,
    });
  } catch (error: any) {
    console.error('[SuperAdmin Batch Embed GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message },
      { status: 500 }
    );
  }
}
