import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req, 'admin');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "Shop ID not found" }, { status: 400 });
    }

    const sets = await prisma.productSet.findMany({
      where: { shopId },
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Error fetching shoppable images:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    // Verify unique slug per shop
    const existing = await prisma.productSet.findFirst({
      where: { shopId, slug }
    });
    if (existing) {
      return NextResponse.json({ error: "این عنوان یا آدرس ساده قبلاً استفاده شده است" }, { status: 400 });
    }

    // Create set and associated items
    const set = await prisma.productSet.create({
      data: {
        shopId,
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

    return NextResponse.json(set);
  } catch (error) {
    console.error("Error creating shoppable image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
