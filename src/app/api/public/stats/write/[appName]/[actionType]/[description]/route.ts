import { NextRequest, NextResponse } from "next/server";
import { pgTabular } from "@/lib/database/connections";

/**
 * GET /api/public/stats/write/:appName/:actionType/:description
 * Insert an app usage stat into PostgreSQL.
 * Fire-and-forget telemetry — mirrors the old api_v2 endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appName: string; actionType: string; description: string }> }
): Promise<NextResponse> {
  try {
    const { appName, actionType, description } = await params;
    const userName = request.nextUrl.searchParams.get("user_name") || null;

    // Extract client IP from proxy headers (same priority as old API)
    let ip = request.headers.get("x-real-ip");
    if (!ip) ip = request.headers.get("proxy-ip");
    if (!ip) ip = request.headers.get("x-forwarded-for");
    if (!ip) ip = "unknown";
    // x-forwarded-for may contain comma-separated list; take the first
    if (ip.includes(",")) ip = ip.split(",")[0].trim();

    // Format date as SQL-compatible string (matches old common.getSqlDateString)
    const now = new Date();
    const dtString = now.toISOString().replace("T", " ").replace("Z", "");

    const insertSql = `INSERT INTO public.tbl_app_stats (app_name, action_type, action_description, action_date, ip, user_name)
      VALUES ($1, $2, $3, $4, $5, $6);`;
    const values = [appName, actionType, description, dtString, ip, userName];

    await pgTabular.selectAllWithValues(insertSql, values);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error writing app stat:", error);
    return new NextResponse("OK", { status: 200 }); // Still return OK — stats are best-effort
  }
}
