/**
 * Shared utilities for map API operations
 * This module contains reusable auth-aware functions for map endpoints
 */
import { NextResponse } from "next/server";
import { mapSettings } from "@/lib/mapSettings";
import type { User, MapConfig, MapItem, CallbackResult } from "@/types/mapSettings";

/**
 * Extract user information from the request using NextAuth session
 */
export async function extractUserFromRequest(): Promise<User | null> {
  try {
    // Import getServerSession inside the function to avoid build issues
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/app/auth/authOptions");

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return null;
    }

    // Extract user information from NextAuth session
    const user: User = {
      id: session.user.email || session.user.name || "unknown",
      name: session.user.name || undefined,
      email: session.user.email || undefined,
      roles: (session.user as { roles?: string[] }).roles || [],
      locations: (session.user as { locations?: string[] }).locations || [],
    };

    return user;
  } catch (error) {
    console.error("Error extracting user from session:", error);
    return null;
  }
}

/**
 * Get all maps - auth-aware behavior
 * Returns all accessible maps based on user authentication status
 */
export function getAllMaps(user: User | null): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    // Create appropriate request user based on authentication status
    const requestUser = user || { id: "anonymous", roles: [], locations: [] };
    const isAuthenticated = !!user;

    console.log(`getAllMaps request from ${isAuthenticated ? "authenticated" : "anonymous"} user:`, requestUser.id);

    mapSettings.getAllMaps(requestUser, (result: CallbackResult<MapItem[]>) => {
      try {
        console.log("getAllMaps callback result:", Array.isArray(result) ? `${result.length} maps` : result);

        // Check if result contains an error
        if (result && typeof result === "object" && "error" in result) {
          console.error("getAllMaps returned error:", result.error);
          resolve(NextResponse.json({ error: result.error }, { status: 500 }));
          return;
        }

        // Handle undefined or null result
        if (result === undefined || result === null) {
          console.error("getAllMaps returned undefined/null result");
          resolve(NextResponse.json({ error: "Failed to retrieve maps" }, { status: 500 }));
          return;
        }

        // Ensure result is an array
        if (!Array.isArray(result)) {
          console.error("getAllMaps returned non-array result:", typeof result);
          resolve(NextResponse.json({ error: "Invalid response format" }, { status: 500 }));
          return;
        }

        // For anonymous users, filter to only non-secured maps
        let filteredResult = result;
        if (!isAuthenticated) {
          filteredResult = result.filter((map) => !map.is_secured);
          console.log(`Filtered ${result.length} maps to ${filteredResult.length} public maps for anonymous user`);
        }

        // Success - return the maps
        resolve(NextResponse.json(filteredResult, { status: 200 }));
      } catch (callbackError) {
        console.error("Error processing getAllMaps callback:", callbackError);
        resolve(NextResponse.json({ error: "Internal server error processing maps data" }, { status: 500 }));
      }
    });
  });
}

/**
 * Get default map - auth-aware behavior
 */
export function getDefaultMap(user: User | null): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const requestUser = user || { id: "anonymous", roles: [], locations: [] };
    const isAuthenticated = !!user;

    console.log(`getDefaultMap request from ${isAuthenticated ? "authenticated" : "anonymous"} user:`, requestUser.id);

    mapSettings.getDefaultMap(requestUser, (result: CallbackResult<MapConfig>) => {
      try {
        if (result === undefined) {
          resolve(NextResponse.json({ error: "Default map not found" }, { status: 404 }));
          return;
        }

        // Check if result contains an error
        if (result && typeof result === "object" && "error" in result) {
          console.error("getDefaultMap returned error:", result.error);
          resolve(NextResponse.json({ error: result.error }, { status: 500 }));
          return;
        }

        // For anonymous users, check if the default map is secured
        if (!isAuthenticated && result && typeof result === "object" && "is_secured" in result && result.is_secured) {
          resolve(NextResponse.json({ error: "Default map requires authentication" }, { status: 401 }));
          return;
        }

        // Success - return the map config
        resolve(NextResponse.json(result, { status: 200 }));
      } catch (callbackError) {
        console.error("Error processing getDefaultMap callback:", callbackError);
        resolve(NextResponse.json({ error: "Internal server error processing default map" }, { status: 500 }));
      }
    });
  });
}

/**
 * Get specific map - auth-aware behavior
 */
export function getMap(id: string, user: User | null): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const requestUser = user || { id: "anonymous", roles: [], locations: [] };
    const isAuthenticated = !!user;

    console.log(`getMap request for ID: ${id} from ${isAuthenticated ? "authenticated" : "anonymous"} user:`, requestUser.id);

    mapSettings.getMap(id, requestUser, (result: CallbackResult<MapConfig>) => {
      try {
        if (result === undefined) {
          resolve(NextResponse.json({ error: "Map not found" }, { status: 404 }));
          return;
        }

        // Check if result contains an error
        if (result && typeof result === "object" && "error" in result) {
          console.error("getMap returned error:", result.error);
          resolve(NextResponse.json({ error: result.error }, { status: 500 }));
          return;
        }

        // For anonymous users, check if the map is secured
        if (!isAuthenticated && result && typeof result === "object" && "is_secured" in result && result.is_secured) {
          resolve(NextResponse.json({ error: "Map requires authentication" }, { status: 401 }));
          return;
        }

        // Success - return the map config
        resolve(NextResponse.json(result, { status: 200 }));
      } catch (callbackError) {
        console.error("Error processing getMap callback:", callbackError);
        resolve(NextResponse.json({ error: "Internal server error processing map" }, { status: 500 }));
      }
    });
  });
}

/**
 * Get map version - auth-aware behavior
 */
export function getMapVersion(id: string, version: string, user: User | null): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const requestUser = user || { id: "anonymous", roles: [], locations: [] };
    const isAuthenticated = !!user;

    console.log(`getMapVersion request for ID: ${id}, version: ${version} from ${isAuthenticated ? "authenticated" : "anonymous"} user:`, requestUser.id);

    mapSettings.getMapVersion(id, version, requestUser, (result: CallbackResult<MapConfig>) => {
      try {
        if (result === undefined) {
          resolve(NextResponse.json({ error: "Map version not found" }, { status: 404 }));
          return;
        }

        // Check if result contains an error
        if (result && typeof result === "object" && "error" in result) {
          console.error("getMapVersion returned error:", result.error);
          resolve(NextResponse.json({ error: result.error }, { status: 500 }));
          return;
        }

        // For anonymous users, check if the map version is secured
        if (!isAuthenticated && result && typeof result === "object" && "is_secured" in result && result.is_secured) {
          resolve(NextResponse.json({ error: "Map version requires authentication" }, { status: 401 }));
          return;
        }

        // Success - return the map config
        resolve(NextResponse.json(result, { status: 200 }));
      } catch (callbackError) {
        console.error("Error processing getMapVersion callback:", callbackError);
        resolve(NextResponse.json({ error: "Internal server error processing map version" }, { status: 500 }));
      }
    });
  });
}
