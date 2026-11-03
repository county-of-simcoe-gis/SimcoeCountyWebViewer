import { NextRequest, NextResponse } from "next/server";
import { isHostAllowed } from "@/lib/common";
import { getPropertyReportPdf } from "@/lib/reports/powerbi";

/**
 * GET /api/public/reports/property/pdf/:arn
 * Legacy: /api_v2/public/reports/property/pdf/:arn
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arn: string }> }) {
  try {
    if (!isHostAllowed(request.headers.get("host") ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { arn } = await params;
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(arn)) {
      return NextResponse.json({ error: "Invalid ARN" }, { status: 400 });
    }

    const pdf = await getPropertyReportPdf(arn);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": "attachment; filename=PropertyReport.pdf",
      },
    });
  } catch (error) {
    console.error("[PropertyReportPdf] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
