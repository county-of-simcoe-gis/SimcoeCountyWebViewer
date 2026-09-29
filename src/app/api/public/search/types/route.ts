import { NextResponse } from "next/server";
import { getSearchTypes } from "@/lib/services/search";

/**
 * GET /api/public/search/types
 * Return distinct search types from the database.
 */
export async function GET() {
  try {
    const types = await getSearchTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("GetSearchTypes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
