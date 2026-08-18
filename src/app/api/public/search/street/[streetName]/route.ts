import { NextResponse } from "next/server";
import { getStreets } from "@/lib/services/streetAddresses";

/**
 * GET /api/public/search/street/[streetName]
 * Look up streets by partial name match.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streetName: string }> }
) {
  try {
    const { streetName } = await params;
    const result = await getStreets(streetName);

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "No Streets Found" }, { status: 200 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GetStreets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
