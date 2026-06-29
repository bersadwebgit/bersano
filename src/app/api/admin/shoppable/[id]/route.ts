import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyAuth(req, 'admin');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "Shop ID not found" }, { status: 400 });
    }

    const set = await prisma.productSet.findFirst({
      where: { id, shopId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                discount: true,
                imageUrl: true,
                stock: true,
                isActive: true,
                variants: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                    colorCode: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!set) {
      return NextResponse.json({ error: "Shoppable image not found" }, { status: 404 });
    }

    return NextResponse.json(set);
  } catch (error) {
    console.error("Error fetching single shoppable image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyAuth(req, 'admin');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "Shop ID not found" }, { status: 400 });
    }

    const body = await req.json();
    const { name, slug, imageUrl, order, isActive, discount, items } = body;

    if (!name || !slug || !imageUrl) {
      return NextResponse.json({ error: "Name, slug, and image URL are required" }, { status: 400 });
    }

    // Verify unique slug (excluding current shoppable image)
    const existing = await prisma.productSet.findFirst({
      where: {
        shopId,
        slug,
        NOT: { id }
      }
    });
    if (existing) {
      return NextResponse.json({ error: "این عنوان یا آدرس ساده قبلاً استفاده شده است" }, { status: 400 });
    }

    // Update shoppable details and rebuild its items array in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing items for this shoppable image
      await tx.productSetItem.deleteMany({
        where: { setId: id, shopId }
      });

      // 2. Update the main ProductSet
      const updatedSet = await tx.productSet.update({
        where: { id, shopId },
        data: {
          name,
          slug,
          imageUrl,
          order: order !== undefined ? Number(order) : 0,
          isActive: isActive ?? true,
          discount: discount !== undefined ? Number(discount) : 0,
          items: items && Array.isArray(items) ? {
            create: items.map((item: any) => ({
              shopId,
              productId: item.productId,
              x: parseFloat(item.x),
              y: parseFloat(item.y),
            }))
          } : undefined
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return updatedSet;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating shoppable image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyAuth(req, 'admin');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "Shop ID not found" }, { status: 400 });
    }

    await prisma.productSet.delete({
      where: { id, shopId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shoppable image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
