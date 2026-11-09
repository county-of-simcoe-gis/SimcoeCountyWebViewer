import { NextRequest, NextResponse } from "next/server";
import { isHostAllowed } from "@/lib/common";
import { getEconomicDevelopmentReportMlsPdf } from "@/lib/reports/powerbi";

/**
 * GET /api/public/reports/economic-development/mls/:mls
 * Legacy: /api_v2/public/reports/EconomicDevelopment/MLS/:mls
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ mls: string }> }) {
  try {
    if (!isHostAllowed(request.headers.get("host") ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { mls } = await params;
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(mls)) {
      return NextResponse.json({ error: "Invalid MLS number" }, { status: 400 });
    }

    const pdf = await getEconomicDevelopmentReportMlsPdf(mls);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": "attachment; filename=EconomicDevelopmentReport.pdf",
      },
    });
  } catch (error) {
    console.error("[EconomicDevelopmentReport] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
