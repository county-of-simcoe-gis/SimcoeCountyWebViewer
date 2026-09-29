import { NextRequest, NextResponse } from "next/server";
import { getListingImages } from "@/lib/services/realestate";
import { isHostAllowed } from "@/lib/common";

export async function GET(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { listingId } = await params;
    const images = await getListingImages(listingId);

    return NextResponse.json(images);
  } catch (error) {
    console.error("Error fetching listing images:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
