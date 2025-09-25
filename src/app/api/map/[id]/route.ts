import { NextRequest } from "next/server";
import { extractUserFromRequest } from "@/lib/mapUtils";
import { mapSettings } from "@/lib/mapSettings";

/**
 * GET /api/map/[id]
 * Get Specific Map - auth-aware behavior
 * - If authenticated: returns map if user has access based on roles
 * - If not authenticated: returns map only if it's not secured
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract user from request (may be null for anonymous users)
    const user = await extractUserFromRequest();

    const { id } = await params;
    console.log("Auth-aware getMap request for ID:", id, "user:", user?.id || "anonymous");

    const requestUser = user || { id: "anonymous", roles: [], locations: [] };
    const isAuthenticated = !!user;

    console.log(`getMap request for ID: ${id} from ${isAuthenticated ? "authenticated" : "anonymous"} user:`, requestUser.id);

    // Call mapSettings.getMap
    const mapResult = await mapSettings.getMap(id, requestUser);

    if (!mapResult) {
      return Response.json({ error: "Map not found" }, { status: 404 });
    }

    // For anonymous users, check if the map is secured
    if (!isAuthenticated && mapResult.is_secured) {
      return Response.json({ error: "Map requires authentication" }, { status: 401 });
    }

    return Response.json(mapResult, { status: 200 });
  } catch (error) {
    console.error("Error in getMap endpoint:", error);

    if (error instanceof Error && error.message === "Internal server error while retrieving map") {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
