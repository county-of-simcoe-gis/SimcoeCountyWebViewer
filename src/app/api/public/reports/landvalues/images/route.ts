import { NextRequest, NextResponse } from "next/server";
import { getLandValuesReportImageUrl, parseDimension, proxyImage } from "@/lib/reports/reportImages";

/**
 * GET /api/public/reports/landvalues/images
 * Legacy: /api_v2/public/report/landvalues/images
 *
 * Query: value (PIN or ARN), reporttype (PIN | MAIN), width, height, token (ArcGIS token)
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const fieldValue = params.get("value") || "434602000705701";
    const reportType = params.get("reporttype") || "PIN";
    const width = parseDimension(params.get("width"), 766);
    const height = parseDimension(params.get("height"), 651);
    const token = params.get("token") || "";

    if (width === null || height === null) {
      return NextResponse.json({ error: "Invalid width or height" }, { status: 400 });
    }

    const imageUrl = await getLandValuesReportImageUrl({ fieldValue, reportType, width, height, token });
    if (!imageUrl) {
      return new NextResponse(null, { status: 404 });
    }

    return await proxyImage(imageUrl);
  } catch (error) {
    console.error("[LandValuesImages] Error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
