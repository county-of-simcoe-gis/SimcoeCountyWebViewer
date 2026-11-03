import { NextRequest, NextResponse } from "next/server";
import { isHostAllowed } from "@/lib/common";
import { getParcelImageUrl, parseDimension, proxyImage } from "@/lib/reports/reportImages";

/**
 * GET /api/public/reports/parcel/image/:arn/:overview/:width/:height
 * Legacy: /api_v2/public/reports/parcel/image/:arn/:overview/:width/:height
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arn: string; overview: string; width: string; height: string }> }) {
  try {
    if (!isHostAllowed(request.headers.get("host") ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { arn, overview, width, height } = await params;
    const w = parseDimension(width, 0);
    const h = parseDimension(height, 0);
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(arn) || w === null || h === null || !w || !h) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const imageUrl = await getParcelImageUrl(arn, overview === "true", w, h);
    if (!imageUrl) {
      return new NextResponse(null, { status: 404 });
    }

    return await proxyImage(imageUrl, "image/jpeg");
  } catch (error) {
    console.error("[ParcelImage] Error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
