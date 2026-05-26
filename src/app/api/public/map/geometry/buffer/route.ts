import { NextRequest, NextResponse } from "next/server";
import { pgWeblive } from "@/lib/database/connections";

/**
 * POST /api/public/map/geometry/buffer
 * Compute a buffered geometry using PostGIS ST_Buffer.
 *
 * Body: { geoJSON: string|object, distance: number, srid: string|number }
 * Returns: { geojson: string } — the buffered geometry as GeoJSON
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { geoJSON, distance, srid } = body;

    if (!geoJSON || distance === undefined || !srid) {
      return NextResponse.json(
        { error: "Missing required parameters: geoJSON, distance, srid" },
        { status: 400 }
      );
    }

    // Ensure geoJSON is a string for PostGIS
    const geoJSONStr = typeof geoJSON === "object" ? JSON.stringify(geoJSON) : geoJSON;

    const sql = `SELECT ST_AsGeoJSON(ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($1), $2), $3)) AS geojson`;
    const values = [geoJSONStr, parseInt(String(srid)), parseFloat(String(distance))];

    const result = await pgWeblive.selectFirstWithValues<{ geojson: string }>(sql, values);

    if (!result) {
      return NextResponse.json({ error: "No result from buffer operation" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in geometry buffer handler:", error);
    return NextResponse.json({ error: "Failed to compute buffer" }, { status: 500 });
  }
}
