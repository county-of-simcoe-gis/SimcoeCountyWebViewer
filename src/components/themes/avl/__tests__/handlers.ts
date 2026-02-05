/**
 * MSW handlers for AVL API endpoints.
 *
 * These handlers intercept HTTP requests to both internal AVL API routes
 * and external GeoTab API, returning mock data for testing without network access.
 *
 * Usage in tests:
 * ```typescript
 * import { server } from '@/test/testServer';
 * import { avlHandlers, geoTabHandlers } from './handlers';
 *
 * beforeAll(() => {
 *   server.use(...avlHandlers, ...geoTabHandlers);
 * });
 * ```
 */

import { http, HttpResponse } from "msw";
import {
  mockVehicles,
  mockHistoryVehicles,
  mockTrips,
  mockGeoTabCredentials,
  mockGeoTabDevices,
  generateMockVehicles,
  generateMockHistory,
} from "./mockData";

// ==================== Internal AVL API Handlers ====================

/**
 * Handlers for /api/secure/avl/* endpoints (NextJS API routes)
 */
export const avlHandlers = [
  // GET /api/secure/avl/AllVehicles - Get all vehicles from lookup
  http.get("**/api/secure/avl/AllVehicles", () => {
    return HttpResponse.json(
      mockVehicles.map((v) => ({
        vehicle_id: v.vehicle_id,
        vehicle_description: v.vehicle_description,
        vehicle_type: v.vehicle_type,
        grouping: v.grouping,
        subgrouping: v.subgrouping,
        device_id: v.device_id,
      }))
    );
  }),

  // GET /api/secure/avl/CurrentLocations/:group/:sort/:order - Get live locations
  http.get("**/api/secure/avl/CurrentLocations/:group/:sort/:order", ({ params }) => {
    const { group } = params;
    const filteredVehicles = mockVehicles.filter(
      (v) => v.grouping === group || group === "all"
    );
    return HttpResponse.json(
      filteredVehicles.map((v) => ({
        vehicle_name: v.vehicle_name,
        vehicle_description: v.vehicle_description,
        grouping: v.grouping,
        subgrouping: v.subgrouping,
        latitude: v.latitude,
        longitude: v.longitude,
        velocity: v.velocity,
        direction: v.direction,
        date: v.date,
        dateFriendly: v.dateFriendly,
      }))
    );
  }),

  // GET /api/secure/avl/CurrentLocationsSpreader/:group/:sort/:order - Get spreader locations
  http.get("**/api/secure/avl/CurrentLocationsSpreader/:group/:sort/:order", ({ params }) => {
    const { group } = params;
    const filteredVehicles = mockVehicles.filter(
      (v) => (v.grouping === group || group === "all") && v.hasGeoTabSpreaderData
    );
    return HttpResponse.json(
      filteredVehicles.map((v) => ({
        vehicle_name: v.vehicle_name,
        vehicle_description: v.vehicle_description,
        grouping: v.grouping,
        subgrouping: v.subgrouping,
        latitude: v.latitude,
        longitude: v.longitude,
        velocity: v.velocity,
        direction: v.direction,
        date: v.date,
        dateFriendly: v.dateFriendly,
        PlowDown: v.isPlowActive,
        DryOn: v.isSpreaderActive,
        WingDown: v.isWingActive,
        DryRateKilosPerLaneKilometer: v.SpreaderRate,
        TemperatureAir: v.AirTemperature,
        TemperatureSurface: v.SurfaceTemperature,
      }))
    );
  }),

  // GET /api/secure/avl/History/:group/:vehicleId/:startDate/:endDate - Get vehicle history
  http.get(
    "**/api/secure/avl/History/:group/:vehicleId/:startDate/:endDate",
    ({ params }) => {
      const { vehicleId } = params;
      const history = generateMockHistory(vehicleId as string, 20);
      return HttpResponse.json(history);
    }
  ),

  // GET /api/secure/avl/HistorySpreader/:group/:vehicleId/:startDate/:endDate - Get spreader history
  http.get(
    "**/api/secure/avl/HistorySpreader/:group/:vehicleId/:startDate/:endDate",
    ({ params }) => {
      const { vehicleId } = params;
      return HttpResponse.json(
        mockHistoryVehicles.filter((v) => v.vehicle_name === vehicleId)
      );
    }
  ),

  // GET /api/secure/avl/getGeoTabSessionId/:apiKey - Get GeoTab credentials
  http.get("**/api/secure/avl/getGeoTabSessionId/:apiKey", () => {
    return HttpResponse.json(mockGeoTabCredentials);
  }),

  // GET /api/secure/avl/HistorySpreaderGeoTabRunList/:group/:vehicleId/:startDate/:endDate - Get trips
  http.get(
    "**/api/secure/avl/HistorySpreaderGeoTabRunList/:group/:vehicleId/:startDate/:endDate",
    () => {
      return HttpResponse.json(mockTrips);
    }
  ),
];

// ==================== GeoTab API Handlers ====================

/**
 * Handlers for external GeoTab API (https://my.geotab.com/apiv1)
 *
 * GeoTab uses POST requests with method names in the body.
 * The handler inspects the request body to determine the appropriate response.
 */
export const geoTabHandlers = [
  http.post("https://my.geotab.com/apiv1", async ({ request }) => {
    const body = (await request.json()) as {
      method: string;
      params: {
        typeName?: string;
        calls?: Array<{
          method: string;
          params: {
            typeName?: string;
            search?: Record<string, unknown>;
          };
        }>;
        search?: {
          deviceSearch?: { id?: string };
          fromDate?: string;
          toDate?: string;
        };
      };
    };

    // Handle different GeoTab API methods
    switch (body.method) {
      case "Get": {
        return handleGeoTabGet(body.params);
      }
      case "ExecuteMultiCall": {
        return handleGeoTabMultiCall(body.params);
      }
      case "Authenticate": {
        return HttpResponse.json({
          result: {
            credentials: mockGeoTabCredentials,
          },
        });
      }
      default: {
        return HttpResponse.json({ result: null });
      }
    }
  }),
];

/**
 * Handle GeoTab Get method
 */
function handleGeoTabGet(params: { typeName?: string; search?: Record<string, unknown> }) {
  const { typeName } = params;

  switch (typeName) {
    case "Device": {
      return HttpResponse.json({
        result: mockGeoTabDevices.map((d) => ({
          id: d.id,
          name: d.name,
          serialNumber: d.serialNumber,
          deviceType: d.deviceType,
        })),
      });
    }
    case "DeviceStatusInfo": {
      return HttpResponse.json({
        result: mockGeoTabDevices.map((d) => ({
          latitude: 44.3894 + Math.random() * 0.1,
          longitude: -79.6903 + Math.random() * 0.1,
          speed: Math.floor(Math.random() * 80),
          bearing: Math.floor(Math.random() * 360),
          dateTime: new Date().toISOString(),
          device: { id: d.id },
        })),
      });
    }
    case "LogRecord": {
      // Return GPS history records
      return HttpResponse.json({
        result: Array.from({ length: 50 }, (_, i) => ({
          latitude: 44.3894 + i * 0.001,
          longitude: -79.6903 + i * 0.001,
          speed: 45 + (i % 20),
          dateTime: new Date(Date.now() - i * 300000).toISOString(),
          device: { id: mockGeoTabDevices[0].id },
        })),
      });
    }
    default: {
      return HttpResponse.json({ result: [] });
    }
  }
}

/**
 * Handle GeoTab ExecuteMultiCall method
 */
function handleGeoTabMultiCall(params: {
  calls?: Array<{
    method: string;
    params: {
      typeName?: string;
      search?: Record<string, unknown>;
    };
  }>;
}) {
  const { calls } = params;

  if (!calls || calls.length === 0) {
    return HttpResponse.json({ result: [] });
  }

  // Return array of results, one per call
  const results = calls.map((call) => {
    const { typeName } = call.params;

    switch (typeName) {
      case "ExceptionEvent": {
        // Return exception events (plow/spreader active)
        return [
          {
            deviceId: mockGeoTabDevices[0].id,
            activeFrom: new Date(Date.now() - 3600000).toISOString(),
            activeTo: new Date().toISOString(),
            rule: { id: "RuleMaterialManagementPlowActiveId" },
          },
        ];
      }
      case "StatusData": {
        // Return diagnostic values (spreader rate, temps, etc.)
        return [
          {
            deviceId: mockGeoTabDevices[0].id,
            dateTime: new Date().toISOString(),
            data: 150, // Spreader rate
          },
        ];
      }
      case "LogRecord": {
        // Return GPS records for history
        return Array.from({ length: 10 }, (_, i) => ({
          latitude: 44.3894 + i * 0.001,
          longitude: -79.6903 + i * 0.001,
          speed: 45 + (i % 20),
          dateTime: new Date(Date.now() - i * 300000).toISOString(),
        }));
      }
      default: {
        return [];
      }
    }
  });

  return HttpResponse.json({ result: results });
}

// ==================== Error Response Handlers ====================

/**
 * Handlers that simulate error responses for testing error scenarios.
 * Use with server.use() to override default handlers in specific tests.
 */
export const avlErrorHandlers = {
  /** Simulate 401 Unauthorized */
  unauthorized: http.get("**/api/secure/avl/*", () => {
    return HttpResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }),

  /** Simulate 403 Forbidden */
  forbidden: http.get("**/api/secure/avl/*", () => {
    return HttpResponse.json(
      { error: "Forbidden", message: "Access denied" },
      { status: 403 }
    );
  }),

  /** Simulate 500 Server Error */
  serverError: http.get("**/api/secure/avl/*", () => {
    return HttpResponse.json(
      { error: "Internal Server Error", message: "Something went wrong" },
      { status: 500 }
    );
  }),

  /** Simulate network error */
  networkError: http.get("**/api/secure/avl/*", () => {
    return HttpResponse.error();
  }),

  /** Simulate empty results */
  emptyResults: http.get("**/api/secure/avl/CurrentLocations/:group/:sort/:order", () => {
    return HttpResponse.json([]);
  }),
};

export const geoTabErrorHandlers = {
  /** Simulate GeoTab authentication failure */
  authFailed: http.post("https://my.geotab.com/apiv1", () => {
    return HttpResponse.json({
      error: {
        name: "InvalidUserException",
        message: "Invalid credentials",
      },
    });
  }),

  /** Simulate GeoTab rate limiting */
  rateLimited: http.post("https://my.geotab.com/apiv1", () => {
    return HttpResponse.json(
      { error: { name: "OverLimitException", message: "Rate limit exceeded" } },
      { status: 429 }
    );
  }),

  /** Simulate GeoTab server error */
  serverError: http.post("https://my.geotab.com/apiv1", () => {
    return HttpResponse.json(
      { error: { name: "ServerException", message: "Server error" } },
      { status: 500 }
    );
  }),
};

// ==================== Combined Handlers ====================

/**
 * All AVL-related handlers combined for convenience
 */
export const allAvlHandlers = [...avlHandlers, ...geoTabHandlers];
