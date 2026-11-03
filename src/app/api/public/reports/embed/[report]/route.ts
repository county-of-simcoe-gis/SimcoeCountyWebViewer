import { NextRequest, NextResponse } from "next/server";
import { getEmbedToken, setReportParameters } from "@/lib/reports/powerbiEmbed";
import { isHostAllowed } from "@/lib/common";

/**
 * GET /api/public/reports/embed/:report
 * Returns the PowerBI embed configuration (embed URL and short-lived token) for the report.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ report: string }> }): Promise<NextResponse> {
  try {
    if (!isHostAllowed(request.headers.get("host") ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { report } = await params;
    return NextResponse.json(await getEmbedToken(report));
  } catch (error) {
    console.error("Error in reports embed token handler:", error);
    return NextResponse.json({ error: "Failed to retrieve embed token" }, { status: 500 });
  }
}

/**
 * POST /api/public/reports/embed/:report
 * Store PowerBI report parameters and return a batchId (UUID).
 * The front-end uses the batchId to open the PowerBI report viewer.
 *
 * Body: { params: [{ name: string, value: string, type: string }] }
 * Returns: batchId string (UUID)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ report: string }> }): Promise<NextResponse> {
  try {
    const { report } = await params;

    const body = await request.json();
    const reportParams = body?.params;

    if (!Array.isArray(reportParams) || reportParams.length === 0) {
      return NextResponse.json({ error: "Missing or empty params array" }, { status: 400 });
    }

    const batchId = await setReportParameters(report, reportParams);

    // Return the batchId as a plain JSON string (matches old API response format)
    return NextResponse.json(batchId);
  } catch (error) {
    console.error("Error in reports embed handler:", error);
    return NextResponse.json({ error: "Failed to set report parameters" }, { status: 500 });
  }
}
