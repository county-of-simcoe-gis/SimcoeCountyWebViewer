/**
 * Approved ArcGIS feature editing services.
 *
 * Each entry maps a service URL prefix to the editing operations and roles
 * permitted to use it. This limits the security exposure of the server-side
 * editor credentials by ensuring only known services can be edited.
 */

import { ArcGisEditOperation } from "@/lib/arcgis/types";

export interface ArcGisEditorService {
  /** Human-readable name for logging. */
  name: string;
  /** URL prefix that the incoming `url` must start with. */
  baseUrl: string;
  /** Allowed operations for this service. */
  operations: ArcGisEditOperation[];
  /** Roles that may perform the allowed operations. */
  roles: string[];
}

const DEFAULT_EDITOR_ROLES = ["planning"];

const DEFAULT_SERVICES: ArcGisEditorService[] = [
  {
    name: "AppTrack Editing",
    baseUrl: "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/Secure_Planning_AppTrack_Editing/FeatureServer/0",
    operations: ["addFeatures", "updateFeatures", "deleteFeatures"],
    roles: DEFAULT_EDITOR_ROLES,
  },
  {
    name: "Road Closures - Blocks",
    baseUrl: "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/5",
    operations: ["addFeatures", "updateFeatures", "deleteFeatures"],
    roles: DEFAULT_EDITOR_ROLES,
  },
  {
    name: "Road Closures - Closures",
    baseUrl: "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/6",
    operations: ["addFeatures", "updateFeatures", "deleteFeatures"],
    roles: DEFAULT_EDITOR_ROLES,
  },
  {
    name: "Road Closures - Detours",
    baseUrl: "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/7",
    operations: ["addFeatures", "updateFeatures", "deleteFeatures"],
    roles: DEFAULT_EDITOR_ROLES,
  },
];

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, "");
}

function loadOverrideServices(): ArcGisEditorService[] {
  const override = process.env.ARCGIS_EDITOR_ALLOWED_URLS;
  if (!override) return [];

  try {
    const parsed = JSON.parse(override) as ArcGisEditorService[];
    if (!Array.isArray(parsed)) {
      console.warn("[ArcGIS Editor Services] ARCGIS_EDITOR_ALLOWED_URLS is not an array; ignoring override");
      return [];
    }
    return parsed.map((entry) => ({
      ...entry,
      roles: entry.roles?.length ? entry.roles : DEFAULT_EDITOR_ROLES,
    }));
  } catch (error) {
    console.warn("[ArcGIS Editor Services] Failed to parse ARCGIS_EDITOR_ALLOWED_URLS:", error);
    return [];
  }
}

export function getEditorServices(): ArcGisEditorService[] {
  const override = loadOverrideServices();
  return override.length ? override : DEFAULT_SERVICES;
}

export function isAllowedService(
  url: string,
  operation: ArcGisEditOperation,
  userRoles: string[] | undefined,
): { allowed: true; service: ArcGisEditorService } | { allowed: false; reason: string } {
  if (!userRoles?.length) {
    return { allowed: false, reason: "User has no roles assigned" };
  }

  const services = getEditorServices();
  const normalizedUrl = normalizeUrl(url);

  const service = services.find((s) => {
    const normalizedBase = normalizeUrl(s.baseUrl);
    return normalizedUrl === normalizedBase || normalizedUrl.startsWith(`${normalizedBase}/`);
  });

  if (!service) {
    return { allowed: false, reason: "Service URL is not in the approved editing services list" };
  }

  if (!service.operations.includes(operation)) {
    return { allowed: false, reason: `Operation ${operation} is not allowed on ${service.name}` };
  }

  const hasRole = userRoles.some((userRole) =>
    service.roles.some((serviceRole) => userRole.toLowerCase().includes(serviceRole.toLowerCase())),
  );

  if (!hasRole) {
    return { allowed: false, reason: "User does not have a role permitted to edit this service" };
  }

  return { allowed: true, service };
}
