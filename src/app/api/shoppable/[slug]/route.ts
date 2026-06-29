import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantShop } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (!shop.productSetsEnabled) {
      return NextResponse.json({ error: "Module disabled" }, { status: 403 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

    const set = await prisma.productSet.findFirst({
      where: {
        shopId: shop.shopId,
        slug: decodedSlug,
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
      }
    });

    if (!set) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json(set);
  } catch (error) {
    console.error("Error fetching single shoppable image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
