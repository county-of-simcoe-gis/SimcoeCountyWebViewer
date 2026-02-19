/**
 * Condo Children API Route
 * GET /api/public/reports/condo-children/[arn]
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlTabular } from "@/lib/database/connections";

export interface CondoChild {
  ARN: string;
  Address?: string;
  UnitNumber?: string;
  PropertyType?: string;
  [key: string]: unknown;
}

/**
 * GET handler for condo children
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arn: string }> }) {
  const { arn } = await params;

  if (!arn) {
    return NextResponse.json({ error: "ARN parameter is required" }, { status: 400 });
  }

  // Check if ARN is a condo parent (20 characters)
  if (arn.length !== 20) {
    return NextResponse.json({ error: "Invalid condo parent ARN. Must be 20 characters." }, { status: 400 });
  }

  try {
    // Get locations from query parameter (optional)
    const url = new URL(request.url);
    const locations = url.searchParams.get("locations") || "COUNTY OF SIMCOE";

    const values = [
      { name: "condoArn", type: "NVarChar", typeOpts: { length: 250 }, value: arn },
      { name: "locations", type: "NVarChar", typeOpts: { length: 500 }, value: locations },
    ];

    // Execute stored procedure to get condo children
    const children = await sqlTabular.selectAllWithValues<CondoChild>("EXEC [uspOpenGISCondoChildren] @condoArn, @locations", values);
    console.log(values, children);

    // If no children found, return empty array
    if (!children || children.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(children);
  } catch (error) {
    console.error("Error fetching condo children:", error);

    // If stored procedure doesn't exist, return a helpful message
    if (error instanceof Error && error.message.includes("Could not find stored procedure")) {
      return NextResponse.json({ error: "Condo children stored procedure not available. Please contact your administrator." }, { status: 501 });
    }

    return NextResponse.json({ error: "Failed to fetch condo children" }, { status: 500 });
  }
}
