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

// The "County of Simcoe" location grants access to all location-gated maps.
const COUNTY_LOCATION = "county of simcoe";

// Role and location checking utility function.
// Combines user roles and locations into a single list so that access
// requirements can be satisfied by either a role OR a location.
// Users with the "COUNTY OF SIMCOE" location bypass all location checks.
export function checkUserAccess(user: User, allowedRoles: string[], anyRole: boolean = false): boolean {
  const userRoles = (user.roles ?? []).map((r) => r.toLowerCase());
  const userLocations = (user.locations ?? []).map((l) => l.toLowerCase());

  // County of Simcoe users can see maps for every location
  const isCountyUser = userLocations.includes(COUNTY_LOCATION);

  const combinedAccess = [...userRoles, ...userLocations];

  if (combinedAccess.length === 0) {
    return false;
  }

  const requiredRoles = allowedRoles.map((role) => role.toLowerCase());

  if (isCountyUser) {
    // County users satisfy any location-based requirement.
    // Still require role-based entries to be matched normally.
    // If at least one required entry is a role the user has, or any entry is
    // a location (which county users always satisfy), grant access.
    return requiredRoles.some((role) => combinedAccess.includes(role) || !userRoles.includes(role));
  }

  if (anyRole) {
    // User needs at least one of the allowed roles/locations
    return requiredRoles.some((role) => combinedAccess.includes(role));
  } else {
    // User needs all of the allowed roles/locations
    return requiredRoles.every((role) => combinedAccess.includes(role));
  }
}
