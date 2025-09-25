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

// Role checking utility function
export function checkUserAccess(user: User, allowedRoles: string[], anyRole: boolean = false): boolean {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  const userRoles = user.roles.map((role) => role.toLowerCase());
  const requiredRoles = allowedRoles.map((role) => role.toLowerCase());

  if (anyRole) {
    // User needs at least one of the allowed roles
    return requiredRoles.some((role) => userRoles.includes(role));
  } else {
    // User needs all of the allowed roles
    return requiredRoles.every((role) => userRoles.includes(role));
  }
}
