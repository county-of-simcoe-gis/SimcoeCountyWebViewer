import { NextRequest, NextResponse } from "next/server";
import { getEmbedToken, setReportParameters } from "@/lib/reports/powerbiEmbed";
import { isHostAllowed } from "@/lib/common";

const PUBLIC_POST_REPORTS = ["Public_Embedded"];
const MAX_PARAMS = 20;

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
    if (!isHostAllowed(request.headers.get("host") ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { report } = await params;

    // Secured reports store their own parameters via /api/secure routes; anonymous callers may only seed the public report.
    if (!PUBLIC_POST_REPORTS.includes(report)) {
      return NextResponse.json({ error: "Report not allowed" }, { status: 403 });
    }

    const body = await request.json();
    const reportParams = body?.params;

    if (!Array.isArray(reportParams) || reportParams.length === 0 || reportParams.length > MAX_PARAMS) {
      return NextResponse.json({ error: "Missing or invalid params array" }, { status: 400 });
    }

    const valid = reportParams.every(
      (p) =>
        p &&
        typeof p.name === "string" &&
        p.name.length <= 50 &&
        typeof p.type === "string" &&
        p.type.length <= 50 &&
        (typeof p.value === "string" || typeof p.value === "number") &&
        String(p.value).length <= 1000,
    );
    if (!valid) {
      return NextResponse.json({ error: "Invalid params entry" }, { status: 400 });
    }

    const batchId = await setReportParameters(report, reportParams);

    // Return the batchId as a plain JSON string (matches old API response format)
    return NextResponse.json(batchId);
  } catch (error) {
    console.error("Error in reports embed handler:", error);
    return NextResponse.json({ error: "Failed to set report parameters" }, { status: 500 });
  }
}
