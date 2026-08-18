import { prisma } from "@/lib/prisma";
import type { AccessDenied, MapItem, MapConfig, User, CallbackResult } from "@/types/mapSettings";
import { checkUserAccess, COUNTY_OF_SIMCOE_LOCATION } from "@/types/mapSettings";

/** Sentinel returned when a map exists but the user is not authorized to access it. */
const ACCESS_DENIED: AccessDenied = { accessDenied: true };

/**
 * Split a comma-separated allowed_roles string into a clean list of role/location
 * names, trimming whitespace and dropping empty entries (handles null, "", and
 * malformed values like "," consistently).
 */
function parseAllowedRoles(allowedRoles: string | null | undefined): string[] {
  if (!allowedRoles) return [];
  return allowedRoles
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
}

/**
 * True if the user has the County of Simcoe location (case-insensitive).
 */
function hasCountyLocationAccess(user: User): boolean {
  return (user.locations ?? []).some((location) => location.toLowerCase() === COUNTY_OF_SIMCOE_LOCATION.toLowerCase());
}

/**
 * Central authorization rule for a single map item/config.
 * - Non-secured items are always accessible.
 * - Secured items with explicit allowed_roles require a matching role or location.
 * - Secured items with no allowed_roles configured are restricted to County of
 *   Simcoe users only (rather than being open to anyone, which was the bug).
 */
function canAccessSecuredItem(user: User, isSecured: boolean, allowedRoles: string | null | undefined): boolean {
  if (!isSecured) return true;

  const roles = parseAllowedRoles(allowedRoles);
  if (roles.length > 0) {
    return checkUserAccess(user, roles, true);
  }

  return hasCountyLocationAccess(user);
}

/**
 * Whether the user has enough context (a role or a location) to warrant
 * considering secured content at all. Locations must count here too, so
 * location-only county users aren't silently excluded from secured maps.
 */
function needsSecuredContent(user: User): boolean {
  return (user.roles?.length ?? 0) > 0 || (user.locations?.length ?? 0) > 0;
}

export const mapSettings = {
  /**
   * Get all maps that the user has access to based on roles and permissions
   */
  getAllMaps: async function (user: User, callback: (result: CallbackResult<MapItem[]>) => void): Promise<void> {
    try {
      console.log("Executing getAllMaps query using stored procedure");

      // Determine if user needs secured maps based on roles or locations
      const isAuthenticated = needsSecuredContent(user);

      // The stored procedure filters by is_secured flag exactly, so
      // usp_get_all_maps(false) returns only public maps and
      // usp_get_all_maps(true) returns only secured maps.
      // Always fetch public maps; also fetch secured maps if authenticated.
      const publicMaps = await prisma.$queryRaw<
        {
          map_name: string;
          description: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          is_default: boolean;
        }[]
      >`SELECT * FROM public.usp_get_all_maps(${false}::boolean)`;

      let securedMaps: typeof publicMaps = [];
      if (isAuthenticated) {
        securedMaps = await prisma.$queryRaw<typeof publicMaps>`SELECT * FROM public.usp_get_all_maps(${true}::boolean)`;
      }

      const maps = [...publicMaps, ...securedMaps];
      console.log("getAllMaps query result:", maps.length, "maps (public:", publicMaps.length, "secured:", securedMaps.length, ")");

      // If no maps found, return empty array
      if (maps.length === 0) {
        console.log("No maps found");
        return callback([]);
      }

      const allowedMaps: MapItem[] = [];
      let processedCount = 0;
      const totalMaps = maps.length;

      maps.forEach((item) => {
        try {
          const mapItem: MapItem = {
            map_name: item.map_name,
            description: item.description || "",
            allowed_roles: item.allowed_roles || "",
            is_secured: item.is_secured,
            is_default: item.is_default,
          };

          if (canAccessSecuredItem(user, mapItem.is_secured, mapItem.allowed_roles)) {
            allowedMaps.push(mapItem);
          }

          processedCount++;
          if (processedCount === totalMaps) {
            callback(allowedMaps);
          }
        } catch (itemProcessError) {
          console.error("Error processing map item:", itemProcessError, item);
          processedCount++;
          if (processedCount === totalMaps) {
            callback(allowedMaps);
          }
        }
      });
    } catch (error) {
      console.error("Error in getAllMaps function:", error);
      callback({ error: "Internal server error while retrieving maps" });
    }
  },

  /**
   * Get a specific map configuration by map name.
   * Returns undefined when the map does not exist, and the ACCESS_DENIED
   * sentinel when it exists but the user is not authorized to view it.
   */
  getMap: async function (mapName: string, user: User): Promise<MapConfig | AccessDenied | undefined> {
    try {
      console.log("Get Map Settings using stored procedure for map:", mapName);

      // Always fetch the row regardless of its is_secured flag (secured=true makes
      // the SP's `is_secured = secured OR secured = true` clause match any row).
      // This is required so a secured map the user can't access returns the row
      // (→ ACCESS_DENIED) instead of zero rows (→ indistinguishable from "not found").
      // Access is still enforced below by canAccessSecuredItem, so nothing leaks.
      const mapResults = await prisma.$queryRaw<
        {
          json: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          published: boolean;
        }[]
      >`SELECT * FROM public.usp_get_map_settings(${mapName}::varchar, NULL::varchar, ${true}::boolean)`;

      if (!mapResults || mapResults.length === 0) {
        return undefined;
      }

      const map = mapResults[0];
      const mapResult: MapConfig = {
        json: map.json || "",
        is_secured: map.is_secured,
        allowed_roles: map.allowed_roles || "",
        published: map.published,
      };

      return canAccessSecuredItem(user, mapResult.is_secured, mapResult.allowed_roles) ? mapResult : ACCESS_DENIED;
    } catch (error) {
      console.error("Error in getMap function:", error);
      throw new Error("Internal server error while retrieving map");
    }
  },

  /**
   * Get a specific version of a map configuration.
   * Calls back with undefined when not found, ACCESS_DENIED when unauthorized.
   */
  getMapVersion: async function (mapName: string, version: string, user: User, callback: (result: CallbackResult<MapConfig>) => void): Promise<void> {
    try {
      console.log("Get Map Version Settings using stored procedure for map:", mapName, "version:", version);

      // Fetch regardless of is_secured (see getMap) so access-denied is distinguishable
      // from not-found; access is enforced by canAccessSecuredItem below.
      const mapResults = await prisma.$queryRaw<
        {
          json: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          published: boolean;
        }[]
      >`SELECT * FROM public.usp_get_map_settings(${mapName}::varchar, ${version}::varchar, ${true}::boolean)`;

      if (!mapResults || mapResults.length === 0) {
        return callback(undefined);
      }

      const map = mapResults[0];
      const mapResult: MapConfig = {
        json: map.json || "",
        is_secured: map.is_secured,
        allowed_roles: map.allowed_roles || "",
        published: map.published,
      };

      callback(canAccessSecuredItem(user, mapResult.is_secured, mapResult.allowed_roles) ? mapResult : ACCESS_DENIED);
    } catch (error) {
      console.error("Error in getMapVersion function:", error);
      callback({ error: "Internal server error while retrieving map version" });
    }
  },

  /**
   * Get the default map configuration.
   * Calls back with undefined when not found, ACCESS_DENIED when unauthorized.
   */
  getDefaultMap: async function (user: User, callback: (result: CallbackResult<MapConfig>) => void): Promise<void> {
    try {
      console.log("Get Default Map Settings using stored procedure");

      // Fetch regardless of is_secured (see getMap) so access-denied is distinguishable
      // from not-found; access is enforced by canAccessSecuredItem below.
      const mapResults = await prisma.$queryRaw<
        {
          json: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          published: boolean;
        }[]
      >`SELECT * FROM public.usp_get_map_settings(NULL::varchar, NULL::varchar, ${true}::boolean)`;

      if (!mapResults || mapResults.length === 0) {
        return callback(undefined);
      }

      const map = mapResults[0];
      const mapResult: MapConfig = {
        json: map.json || "",
        is_secured: map.is_secured,
        allowed_roles: map.allowed_roles || "",
        published: map.published,
      };

      callback(canAccessSecuredItem(user, mapResult.is_secured, mapResult.allowed_roles) ? mapResult : ACCESS_DENIED);
    } catch (error) {
      console.error("Error in getDefaultMap function:", error);
      callback({ error: "Internal server error while retrieving default map" });
    }
  },
};

export default mapSettings;
