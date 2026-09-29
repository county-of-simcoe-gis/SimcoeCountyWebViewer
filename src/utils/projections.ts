/**
 * Central projection registry.
 * ----------------------------------------------------------------------------
 * Registers all custom EPSG projections used by the application with proj4 and
 * OpenLayers. Import this module once at app startup (e.g. in the root layout)
 * and defensively in any library that may run before startup or in isolation
 * (tests, workers, etc.).
 *
 * The registration is idempotent: calling it multiple times will not overwrite
 * existing definitions, so it is safe to import from many places.
 */

import proj4 from "proj4";
import { register } from "ol/proj/proj4";

interface ProjectionDefinition {
  code: string;
  name: string;
  proj4: string;
  extent?: [number, number, number, number];
}

/**
 * Projections used across the application.
 *
 * Definitions are sourced from epsg.io / spatialreference.org and tuned to
 * match the Canadian municipal datasets the application displays.
 */
export const PROJECTIONS: ProjectionDefinition[] = [
  {
    code: "EPSG:26917",
    name: "UTM Zone 17N (NAD83)",
    proj4: "+proj=utm +zone=17 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415],
  },
  {
    code: "EPSG:26717",
    name: "UTM Zone 17N (NAD27)",
    proj4: "+proj=utm +zone=17 +ellps=clrk66 +datum=NAD27 +units=m +no_defs",
    extent: [169252.3099, 885447.906, 830747.6901, 9217404.5493],
  },
  {
    code: "EPSG:3978",
    name: "NAD83 / Canada Atlas Lambert",
    proj4: "+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  },
  {
    code: "EPSG:3979",
    name: "NAD83(CSRS) / Canada Atlas Lambert",
    proj4: "+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  },
  {
    code: "EPSG:32190",
    name: "MTM Zone 9 (NAD83)",
    proj4: "+proj=tmerc +lat_0=0 +lon_0=-79.5 +k=0.9999 +x_0=304800 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  },
];

let registered = false;

/**
 * Register all application projections with proj4 and OpenLayers.
 *
 * This function is idempotent: subsequent calls are no-ops. It is safe (and
 * recommended) to call from any module that may need a non-standard EPSG
 * projection.
 */
export function registerProjections(): void {
  if (registered) return;

  const defs = proj4.defs as unknown as Record<string, unknown>;
  for (const def of PROJECTIONS) {
    // Only define each projection once. Existing entries are left untouched
    // so user- or test-supplied definitions are not accidentally overwritten.
    if (defs[def.code] === undefined) {
      proj4.defs(def.code, def.proj4);
    }
  }

  register(proj4);
  registered = true;
}

// Backwards-compatible side-effect import: importing the module already
// registers the projections. Explicit `registerProjections()` calls are
// preferred in library code because they make the dependency visible and
// guarantee ordering in test environments.
registerProjections();
