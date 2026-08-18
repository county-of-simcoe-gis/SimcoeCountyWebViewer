import { NextRequest, NextResponse } from "next/server";
import { setReportParameters } from "@/lib/secure/reports/powerbiEmbed";

/**
 * POST /api/public/reports/embed/:report
 * Store PowerBI report parameters and return a batchId (UUID).
 * The front-end uses the batchId to open the PowerBI report viewer.
 *
 * Body: { params: [{ name: string, value: string, type: string }] }
 * Returns: batchId string (UUID)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ report: string }> }
): Promise<NextResponse> {
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
