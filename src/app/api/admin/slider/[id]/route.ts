import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { Invalidate } from "@/lib/invalidate";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
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

    // Verify ownership
    const existingSlide = await prisma.heroSlide.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingSlide || existingSlide.shopId !== shopId) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    const slide = await prisma.heroSlide.update({
      where: { id: resolvedParams.id },
      data: {
        imageUrl,
        mobileImageUrl,
        title,
        subtitle,
        linkUrl,
        linkText,
        order,
        isActive,
        displayLocation,
      },
    });

    await Invalidate.heroSlides(shopId);

    return NextResponse.json(slide);
  } catch (error) {
    console.error("Error updating slide:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await verifyAuth(req, 'admin');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.shopId;
    if (!shopId) {
      return NextResponse.json({ error: "Shop ID not found" }, { status: 400 });
    }

    // Verify ownership
    const existingSlide = await prisma.heroSlide.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingSlide || existingSlide.shopId !== shopId) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    await prisma.heroSlide.delete({
      where: { id: resolvedParams.id },
    });

    await Invalidate.heroSlides(shopId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting slide:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
