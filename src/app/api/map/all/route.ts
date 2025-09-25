// Auth-aware map endpoint
import { getAllMaps, extractUserFromRequest } from "@/lib/mapUtils";

/**
 * GET /api/map/all
 * Get All Maps - auth-aware behavior
 * - If authenticated: returns all maps user has access to based on roles
 * - If not authenticated: returns only public/non-secured maps
 */
export async function GET() {
  try {
    // Extract user from request (may be null for anonymous users)
    const user = await extractUserFromRequest();

    console.log("Auth-aware getAllMaps request for user:", user?.id || "anonymous");

    // Use auth-aware utility function
    return await getAllMaps(user);
  } catch (error) {
    console.error("Error in auth-aware getAllMaps endpoint:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
