// Map Settings TypeScript interfaces
export interface MapItem {
  map_name: string;
  description: string;
  allowed_roles: string;
  is_secured: boolean;
  is_default: boolean;
}

export interface MapConfig {
  json: string;
  is_secured: boolean;
  allowed_roles: string;
  published?: boolean;
}

export interface User {
  id?: string;
  name?: string;
  email?: string;
  roles: string[];
  locations: string[];
}

export interface DatabaseError {
  error: string;
}

export type MapResult = MapConfig | undefined;
export type AllMapsResult = MapItem[] | DatabaseError;
export type CallbackResult<T> = T | DatabaseError | undefined;

// API Response types
export interface ApiSuccessResponse<T> {
  data: T;
  status: "success";
}

export interface ApiErrorResponse {
  error: string;
  status: "error";
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
// Canonical location name for internal County of Simcoe staff. Used as the
// fallback authorization requirement for secured items that don't specify
// any allowed_roles (see canAccessSecuredItem in src/lib/mapSettings.ts).
export const COUNTY_OF_SIMCOE_LOCATION = "COUNTY OF SIMCOE";

// Role and location checking utility function.
// Combines user roles and locations into a single list so that access
// requirements can be satisfied by either a role OR a location.
export function checkUserAccess(user: User, allowedRoles: string[], anyRole: boolean = false): boolean {
  const userRoles = (user.roles ?? []).map((r) => r.toLowerCase());
  const userLocations = (user.locations ?? []).map((l) => l.toLowerCase());

  const combinedAccess = [...userRoles, ...userLocations];

  if (combinedAccess.length === 0) {
    return false;
  }

  const requiredRoles = allowedRoles.map((role) => role.toLowerCase());

  if (anyRole) {
    // User needs at least one of the allowed roles/locations
    return requiredRoles.some((role) => combinedAccess.includes(role));
  } else {
    // User needs all of the allowed roles/locations
    return requiredRoles.every((role) => combinedAccess.includes(role));
  }
}
