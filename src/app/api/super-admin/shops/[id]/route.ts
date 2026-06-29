import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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

export async function PATCH(
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
    const { isApproved, isActive, customerClubEnabled, loyaltyPointsRate, loyaltyPointValue, ownerPassword, ownerPhone, ownerName, ownerEmail } = body;

    const shop = await prisma.shopSettings.findUnique({
      where: { id },
      allowCrossTenant: true
    } as any);

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const owner = await prisma.user.findFirst({
      where: { shopId: shop.shopId, role: 'admin' }
    });

    if (owner) {
      const ownerUpdateData: any = {};
      if (ownerPassword) {
        ownerUpdateData.password = await bcrypt.hash(ownerPassword, 10);
      }
      if (ownerPhone !== undefined) {
        // Normalize phone number
        let normalizedPhone = ownerPhone.trim();
        if (normalizedPhone.startsWith('+98')) {
          normalizedPhone = '0' + normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith('98') && normalizedPhone.length === 11) {
          normalizedPhone = '0' + normalizedPhone.substring(2);
        } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
          normalizedPhone = '0' + normalizedPhone;
        }
        ownerUpdateData.phone = normalizedPhone;
      }
      if (ownerName !== undefined) {
        ownerUpdateData.name = ownerName;
      }
      if (ownerEmail !== undefined) {
        ownerUpdateData.email = ownerEmail.toLowerCase().trim();
      }

      if (Object.keys(ownerUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: owner.id },
          data: ownerUpdateData,
          allowCrossTenant: true
        } as any);
      }
    }

    const dataToUpdate: any = {};
    if (isApproved !== undefined) dataToUpdate.isApproved = isApproved;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (customerClubEnabled !== undefined) dataToUpdate.customerClubEnabled = customerClubEnabled;
    if (loyaltyPointsRate !== undefined) dataToUpdate.loyaltyPointsRate = parseInt(loyaltyPointsRate);
    if (loyaltyPointValue !== undefined) dataToUpdate.loyaltyPointValue = parseInt(loyaltyPointValue);

    if (body.packageId !== undefined) {
      if (body.packageId === null) {
        dataToUpdate.packageId = null;
        dataToUpdate.packageExpiresAt = null;
      } else {
        const pkg = await prisma.package.findUnique({ where: { id: body.packageId } });
        if (!pkg) {
          return NextResponse.json({ error: 'Package not found' }, { status: 404 });
        }
        dataToUpdate.packageId = body.packageId;
        
        // Calculate expiration date
        if (body.packageExpiresAt) {
          dataToUpdate.packageExpiresAt = new Date(body.packageExpiresAt);
        } else {
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + pkg.months);
          dataToUpdate.packageExpiresAt = expiryDate;
        }

        // Auto-enforce features in settings
        try {
          const features = JSON.parse(pkg.features);
          
          if (!features.physicalProducts && features.digitalProducts) {
            dataToUpdate.productType = 'digital';
          } else if (features.physicalProducts && !features.digitalProducts) {
            dataToUpdate.productType = 'physical';
          }

          if (!features.specialDeals) dataToUpdate.specialDealsEnabled = false;
          if (!features.relatedProducts) dataToUpdate.relatedProductsEnabled = false;
          if (!features.zarinpal) dataToUpdate.zarinpalEnabled = false;
          if (!features.zibal) dataToUpdate.zibalEnabled = false;
          if (!features.cardToCard) dataToUpdate.cardToCardEnabled = false;
          if (!features.tipax) dataToUpdate.tipaxEnabled = false;
          if (!features.productSets) dataToUpdate.productSetsEnabled = false;
          if (!features.customerClub) dataToUpdate.customerClubEnabled = false;
          if (!features.seoTools) {
            dataToUpdate.sitemapEnabled = false;
            dataToUpdate.robotsEnabled = false;
          }
        } catch (e) {
          console.error("Error parsing package features for auto-enforcement:", e);
        }
      }
    }

    const updatedShop = await prisma.shopSettings.update({
      where: { id },
      data: dataToUpdate,
      include: { package: true },
      allowCrossTenant: true
    } as any);

    return NextResponse.json(updatedShop);
  } catch (error) {
    console.error('Error updating shop:', error);
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

    const shop = await prisma.shopSettings.findUnique({
      where: { id },
      allowCrossTenant: true
    } as any);

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const shopId = shop.shopId;

    // Delete all related records in a transaction to avoid foreign key or orphan data issues
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { shopId } }),
      prisma.order.deleteMany({ where: { shopId } }),
      prisma.cartItem.deleteMany({ where: { shopId } }),
      prisma.productVariant.deleteMany({ where: { shopId } }),
      prisma.productSetItem.deleteMany({ where: { shopId } }),
      prisma.productSet.deleteMany({ where: { shopId } }),
      prisma.productNotificationRequest.deleteMany({ where: { shopId } }),
      prisma.review.deleteMany({ where: { shopId } }),
      prisma.product.deleteMany({ where: { shopId } }),
      prisma.category.deleteMany({ where: { shopId } }),
      prisma.brand.deleteMany({ where: { shopId } }),
      prisma.menuItem.deleteMany({ where: { shopId } }),
      prisma.heroSlide.deleteMany({ where: { shopId } }),
      prisma.story.deleteMany({ where: { shopId } }),
      prisma.media.deleteMany({ where: { shopId } }),
      prisma.address.deleteMany({ where: { shopId } }),
      prisma.notification.deleteMany({ where: { shopId } }),
      prisma.ticketMessage.deleteMany({ where: { shopId } }),
      prisma.ticket.deleteMany({ where: { shopId } }),
      prisma.blogComment.deleteMany({ where: { shopId } }),
      prisma.blogPost.deleteMany({ where: { shopId } }),
      prisma.blogCategory.deleteMany({ where: { shopId } }),
      prisma.pageView.deleteMany({ where: { shopId } }),
      prisma.downloadToken.deleteMany({ where: { shopId } }),
      prisma.otp.deleteMany({ where: { shopId } }),
      prisma.systemTicket.deleteMany({ where: { shopId } }),
      prisma.discountCode.deleteMany({ where: { shopId } }),
      prisma.user.deleteMany({ where: { shopId } }),
      prisma.shopSettings.delete({ where: { id }, allowCrossTenant: true } as any)
    ]);

    return NextResponse.json({ success: true, message: 'Shop and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting shop:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
