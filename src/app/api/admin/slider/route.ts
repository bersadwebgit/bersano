import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { Invalidate } from "@/lib/invalidate";

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

    const slides = await prisma.heroSlide.findMany({
      where: { shopId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(slides);
  } catch (error) {
    console.error("Error fetching slides:", error);
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
    const { imageUrl, mobileImageUrl, title, subtitle, linkUrl, linkText, order, isActive, displayLocation } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const slide = await prisma.heroSlide.create({
      data: {
        shopId,
        imageUrl,
        mobileImageUrl,
        title,
        subtitle,
        linkUrl,
        linkText,
        order: order || 0,
        isActive: isActive ?? true,
        displayLocation: displayLocation || "both",
      },
    });

    await Invalidate.heroSlides(shopId);

    return NextResponse.json(slide);
  } catch (error) {
    console.error("Error creating slide:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
