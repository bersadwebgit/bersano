import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantShop } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const body = await req.json();
    const { setId, type } = body; // type is 'view' | 'tag_click' | 'add_to_cart'

    if (!setId || !type) {
      return NextResponse.json({ error: "Image ID and tracking type are required" }, { status: 400 });
    }

    let updateData = {};
    if (type === "view") {
      updateData = { views: { increment: 1 } };
    } else if (type === "tag_click") {
      updateData = { tagClicks: { increment: 1 } };
    } else if (type === "add_to_cart") {
      updateData = { addToCarts: { increment: 1 } };
    } else {
      return NextResponse.json({ error: "Invalid tracking type" }, { status: 400 });
    }

    await prisma.productSet.update({
      where: { id: setId, shopId: shop.shopId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking shoppable image metric:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
