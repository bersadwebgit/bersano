import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, months, price, features } = body;

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        months: months !== undefined ? parseInt(months) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        features: features !== undefined ? (typeof features === 'string' ? features : JSON.stringify(features)) : undefined,
      }
    });

    // Synchronize features to all shops currently assigned to this package
    if (features !== undefined) {
      try {
        const parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
        
        // Find all shops linked to this package
        const linkedShops = await prisma.shopSettings.findMany({
          where: { packageId: id }
        });

        for (const shop of linkedShops) {
          const updateData: any = {};

          // Sync productType based on package features
          if (parsedFeatures.physicalProducts && parsedFeatures.digitalProducts) {
            updateData.productType = 'both';
          } else if (parsedFeatures.physicalProducts && !parsedFeatures.digitalProducts) {
            updateData.productType = 'physical';
          } else if (!parsedFeatures.physicalProducts && parsedFeatures.digitalProducts) {
            updateData.productType = 'digital';
          }

          // Force-disable features that were newly disabled in the package
          if (!parsedFeatures.specialDeals) updateData.specialDealsEnabled = false;
          if (!parsedFeatures.relatedProducts) updateData.relatedProductsEnabled = false;
          if (!parsedFeatures.productSets) updateData.productSetsEnabled = false;
          if (!parsedFeatures.zarinpal) updateData.zarinpalEnabled = false;
          if (!parsedFeatures.zibal) updateData.zibalEnabled = false;
          if (!parsedFeatures.cardToCard) updateData.cardToCardEnabled = false;
          if (!parsedFeatures.tipax) updateData.tipaxEnabled = false;
          if (!parsedFeatures.customerClub) updateData.customerClubEnabled = false;
          if (!parsedFeatures.seoTools) {
            updateData.sitemapEnabled = false;
            updateData.robotsEnabled = false;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.shopSettings.update({
              where: { id: shop.id },
              data: updateData
            });
          }
        }
      } catch (e) {
        console.error("Error syncing package features to linked shops:", e);
      }
    }

    return NextResponse.json({ success: true, package: updatedPackage });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if any shops are using this package
    const linkedShops = await prisma.shopSettings.count({
      where: { packageId: id }
    });

    if (linkedShops > 0) {
      return NextResponse.json({ error: 'این پکیج به برخی فروشگاه‌ها تخصیص داده شده است و امکان حذف آن وجود ندارد. ابتدا پکیج آن فروشگاه‌ها را تغییر دهید.' }, { status: 400 });
    }

    await prisma.package.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
