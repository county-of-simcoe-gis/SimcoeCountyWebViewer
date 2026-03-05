import { NextResponse } from "next/server";
import { searchById } from "@/lib/services/search";

/**
 * GET /api/public/search/[id]
 * Look up a single search item by location_id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await searchById(id);

    if (!result) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("SearchById error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
