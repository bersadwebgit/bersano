import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantShop } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check if shoppable images are globally enabled
    if (!shop.productSetsEnabled) {
      return NextResponse.json([]); // return empty if globally disabled
    }

    const sets = await prisma.productSet.findMany({
      where: {
        shopId: shop.shopId,
        isActive: true,
      },
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
      orderBy: { order: "asc" },
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Error fetching shop shoppable images:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
