import { NextRequest, NextResponse } from "next/server";
import { getWazeLayer } from "@/lib/services/waze";
import { isHostAllowed } from "@/lib/common";

export async function GET(request: NextRequest, { params }: { params: Promise<{ category: string; type: string }> }) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { category, type } = await params;
    const result = await getWazeLayer(category, type);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Waze alert layer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
