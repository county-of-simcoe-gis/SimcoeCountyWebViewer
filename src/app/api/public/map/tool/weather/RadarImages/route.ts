import { NextRequest, NextResponse } from "next/server";
import { sqlTabular } from "@/lib/database/connections";

/**
 * Validate if a date string is valid (YYYY-MM-DD format)
 */
function isValidDate(dateStr: string): boolean {
  // Accept either date-only (YYYY-MM-DD) or date+time (YYYY-MM-DD HH:mm:ss)
  const dateRegex = /^\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }
  // Try to parse; replace space with 'T' for Date parser if time is present
  const normalized = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
  const date = new Date(normalized);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * GET /api/public/map/tool/weather/RadarImages
 * Fetch radar images for a given date range
 * Query params: fromDate, toDate (YYYY-MM-DD format)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Validate dates
    if (!fromDate || !toDate) {
      return NextResponse.json({ error: "Missing required parameters: fromDate and toDate" }, { status: 400 });
    }

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }

    // Query the local `tabular` database for radar images
    const values = [
      { name: "fromDate", type: "NVarChar", typeOpts: { length: 50 }, value: fromDate },
      { name: "toDate", type: "NVarChar", typeOpts: { length: 50 }, value: toDate },
    ];

    const sqlQuery = `
      SELECT [RADAR_CODE] AS RADAR_STATION_CODE,
             [RADAR_DESCRIPTION],
             [RADAR_DATE],
             [JS_MAPIMAGE] AS JS_MAPIMAGE,
             [FILE_NAME],
             datediff(minute,'2015-1-1',[RADAR_DATE]) as MINUTES_SINCE_2015
      FROM dbo.tbl_Weather_Radar_Current_Images
      WHERE [RADAR_DATE] BETWEEN @fromDate AND @toDate
      ORDER BY RADAR_DATE
    `;

    try {
      const results = await sqlTabular.selectAllWithValues(sqlQuery, values);

      if (!results || results.length === 0) {
        console.warn(`RadarImages: No results for range ${fromDate} to ${toDate}`);
      }

      return NextResponse.json(results || []);
    } catch (dbErr) {
      const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error("Database error fetching radar images:", errMsg);
      return NextResponse.json(
        { error: "Failed to fetch radar images", detail: errMsg },
        { status: 500 },
      );
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in RadarImages handler:", errMsg);
    return NextResponse.json(
      { error: "Failed to fetch radar images", detail: errMsg },
      { status: 500 },
    );
  }
}
