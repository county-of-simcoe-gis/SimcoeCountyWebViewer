import { NextRequest, NextResponse } from "next/server";
import { getWazeIrregularLayer } from "@/lib/services/waze";
import { isHostAllowed } from "@/lib/common";

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const result = await getWazeIrregularLayer();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Waze irregularities layer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
