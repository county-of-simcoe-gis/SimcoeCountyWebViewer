import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/services/search";

/**
 * GET /api/public/search?q=&type=&limit=&muni=
 * Main search endpoint — property, address, geocode, and OSM search.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const type = searchParams.get("type") || undefined;
    const muni = searchParams.get("muni") || undefined;

    const result = await search(keywords, type, muni, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
