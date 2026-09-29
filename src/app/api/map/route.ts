// Auth-aware map endpoint
import { getDefaultMap, extractUserFromRequest } from "@/lib/mapUtils";

/**
 * GET /api/map
 * Get Default Map - auth-aware behavior
 * - If authenticated: returns default map if user has access based on roles
 * - If not authenticated: returns default map only if it's not secured
 */
export async function GET() {
  try {
    // Extract user from request (may be null for anonymous users)
    const user = await extractUserFromRequest();

    console.log("Auth-aware getDefaultMap request for user:", user?.id || "anonymous");

    // Use auth-aware utility function
    return await getDefaultMap(user);
  } catch (error) {
    console.error("Error in auth-aware getDefaultMap endpoint:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
