import { NextRequest, NextResponse } from "next/server";
import { getCategories } from "@/lib/services/211";
import { isHostAllowed } from "@/lib/common";

export async function GET(request: NextRequest, { params }: { params: Promise<{ isFrench: string }> }) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { isFrench: isFrenchParam } = await params;
    const isFrench = isFrenchParam === "true";
    const results = await getCategories(isFrench);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching 211 categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
