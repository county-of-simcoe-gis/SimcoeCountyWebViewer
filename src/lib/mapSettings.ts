import { prisma } from "@/lib/prisma";
import type { MapItem, MapConfig, User, CallbackResult } from "@/types/mapSettings";
import { checkUserAccess } from "@/types/mapSettings";

export const mapSettings = {
  /**
   * Get all maps that the user has access to based on roles and permissions
   */
  getAllMaps: async function (user: User, callback: (result: CallbackResult<MapItem[]>) => void): Promise<void> {
    try {
      console.log("Executing getAllMaps query using stored procedure");

      // Determine if user needs secured maps based on roles
      const isAuthenticated = user.roles && user.roles.length > 0;

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

          if (mapItem.is_secured && mapItem.allowed_roles) {
            // Check user access using session roles
            const hasAccess = checkUserAccess(user, mapItem.allowed_roles.split(","), false);
            if (hasAccess) {
              allowedMaps.push(mapItem);
            }
          } else {
            // Non-secured maps or maps without roles are allowed
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
   * Get a specific map configuration by map name
   */
  getMap: async function (mapName: string, user: User): Promise<MapConfig | undefined> {
    try {
      console.log("Get Map Settings using stored procedure for map:", mapName);

      // Determine if user needs secured maps based on roles
      const isSecured = user.roles && user.roles.length > 0;

      // Call stored procedure to get map settings
      console.log("Calling stored procedure to get map settings for map:", mapName, isSecured);
      const mapResults = await prisma.$queryRaw<
        {
          json: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          published: boolean;
        }[]
      >`SELECT * FROM public.usp_get_map_settings(${mapName}::varchar, NULL::varchar, ${isSecured}::boolean)`;

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

      if (mapResult.is_secured && mapResult.allowed_roles) {
        // Check user access using session roles
        const hasAccess = checkUserAccess(user, mapResult.allowed_roles.split(","), false);
        if (hasAccess) {
          return mapResult;
        } else {
          return undefined;
        }
      } else {
        return mapResult;
      }
    } catch (error) {
      console.error("Error in getMap function:", error);
      throw new Error("Internal server error while retrieving map");
    }
  },

  /**
   * Get a specific version of a map configuration
   */
  getMapVersion: async function (mapName: string, version: string, user: User, callback: (result: CallbackResult<MapConfig>) => void): Promise<void> {
    try {
      console.log("Get Map Version Settings using stored procedure for map:", mapName, "version:", version);

      // Determine if user needs secured maps based on roles
      const isSecured = user.roles && user.roles.length > 0;

      // Call stored procedure to get map settings with specific version
      const mapResults = await prisma.$queryRaw<
        {
          json: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          published: boolean;
        }[]
      >`SELECT * FROM public.usp_get_map_settings(${mapName}::varchar, ${version}::varchar, ${isSecured}::boolean)`;

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

      if (mapResult.is_secured && mapResult.allowed_roles) {
        // Check user access using session roles
        const hasAccess = checkUserAccess(user, mapResult.allowed_roles.split(","), false);
        if (hasAccess) {
          callback(mapResult);
        } else {
          callback(undefined);
        }
      } else {
        callback(mapResult);
      }
    } catch (error) {
      console.error("Error in getMapVersion function:", error);
      callback({ error: "Internal server error while retrieving map version" });
    }
  },

  /**
   * Get the default map configuration
   */
  getDefaultMap: async function (user: User, callback: (result: CallbackResult<MapConfig>) => void): Promise<void> {
    try {
      console.log("Get Default Map Settings using stored procedure");

      // Determine if user needs secured maps based on roles
      const isSecured = user.roles && user.roles.length > 0;

      // Call stored procedure to get default map (null map_name means get default)
      const mapResults = await prisma.$queryRaw<
        {
          json: string | null;
          allowed_roles: string | null;
          is_secured: boolean;
          published: boolean;
        }[]
      >`SELECT * FROM public.usp_get_map_settings(NULL::varchar, NULL::varchar, ${isSecured}::boolean)`;

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

      if (mapResult.allowed_roles) {
        // Check user access using session roles (any role allowed for default map)
        const hasAccess = checkUserAccess(user, mapResult.allowed_roles.split(","), true);
        if (hasAccess) {
          callback(mapResult);
        } else {
          callback(undefined);
        }
      } else {
        callback(mapResult);
      }
    } catch (error) {
      console.error("Error in getDefaultMap function:", error);
      callback({ error: "Internal server error while retrieving default map" });
    }
  },
};

export default mapSettings;
