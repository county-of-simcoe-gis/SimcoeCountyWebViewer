import { NextRequest, NextResponse } from "next/server";
import { getSubCategories } from "@/lib/services/211";
import { isHostAllowed } from "@/lib/common";

export async function GET(request: NextRequest, { params }: { params: Promise<{ category: string; isFrench: string }> }) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { category, isFrench: isFrenchParam } = await params;
    const isFrench = isFrenchParam === "true";
    const results = await getSubCategories(category, isFrench);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching 211 sub-categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
