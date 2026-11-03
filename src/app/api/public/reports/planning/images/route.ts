import { NextRequest, NextResponse } from "next/server";
import { getPlanningReportImageUrl, parseDimension, proxyImage } from "@/lib/reports/reportImages";

/**
 * GET /api/public/reports/planning/images
 * Legacy: /api_v2/public/report/planning/images
 *
 * Query: value (ARN), reporttype, bufferdistance, width, height, token (ArcGIS token)
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const fieldValue = params.get("value") || "434602000705701";
    const reportType = params.get("reporttype") || "WETLAND";
    const bufDistance = parseInt(params.get("bufferdistance") || "0", 10) || 0;
    const width = parseDimension(params.get("width"), 300);
    const height = parseDimension(params.get("height"), 300);
    const token = params.get("token") || "";

    if (width === null || height === null) {
      return NextResponse.json({ error: "Invalid width or height" }, { status: 400 });
    }
    if (bufDistance < 0 || bufDistance > 100000) {
      return NextResponse.json({ error: "Invalid bufferdistance" }, { status: 400 });
    }

    const imageUrl = await getPlanningReportImageUrl({ fieldValue, reportType, bufDistance, width, height, token });
    if (!imageUrl) {
      return new NextResponse(null, { status: 404 });
    }

    return await proxyImage(imageUrl);
  } catch (error) {
    console.error("[PlanningImages] Error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
