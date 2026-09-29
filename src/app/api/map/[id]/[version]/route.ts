import { NextRequest } from "next/server";
import { getMapVersion, extractUserFromRequest } from "@/lib/mapUtils";

/**
 * GET /api/map/[id]/[version]
 * Get Specific Map Version - auth-aware behavior
 * - If authenticated: returns map version if user has access based on roles
 * - If not authenticated: returns map version only if it's not secured
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; version: string }> }) {
  try {
    // Extract user from request (may be null for anonymous users)
    const user = await extractUserFromRequest();

    const { id, version } = await params;
    console.log("Auth-aware getMapVersion request for ID:", id, "version:", version, "user:", user?.id || "anonymous");

    // Use auth-aware utility function
    return await getMapVersion(id, version, user);
  } catch (error) {
    console.error("Error in auth-aware getMapVersion endpoint:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
