import { NextRequest, NextResponse } from "next/server";
import { getResults } from "@/lib/services/211";
import { isHostAllowed } from "@/lib/common";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ category: string; subCategory: string; age: string; isFrench: string }>;
  },
) {
  try {
    const host = request.headers.get("host");
    if (!isHostAllowed(host ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized Domain!" }, { status: 403 });
    }

    const { category, subCategory, age, isFrench: isFrenchParam } = await params;
    const isFrench = isFrenchParam === "true";
    const results = await getResults(category, subCategory, age, isFrench);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching 211 results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
