import { NextRequest, NextResponse } from "next/server";
import { getMTOLayer } from "@/lib/services/mto";
import { isHostAllowed } from "@/lib/common";

export async function GET(request: NextRequest, { params }: { params: Promise<{ layerName: string }> }) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { layerName } = await params;
    const result = await getMTOLayer(layerName);

    if (result === null) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching MTO layer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
