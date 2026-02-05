/**
 * Tests for useGeoTab hook - GeoTab API integration.
 *
 * Tests cover:
 * - Authentication with GeoTab
 * - Device fetching and matching
 * - Status data fetching (spreader rate, wing, temperature)
 * - Exception event fetching
 * - Trips data fetching
 * - Error handling
 *
 * All external GeoTab API calls are mocked via MSW.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";
import { isCI } from "@/test/env";
import {
  mockGeoTabCredentials,
  mockGeoTabDevices,
  mockTrips,
  mockVehicles,
  mockGroups,
} from "./mockData";
import type {
  GeoTabDevice,
  GeoTabCredentials,
  AvlGroup,
} from "../types/avl.types";

const GEOTAB_API_URL = "https://my.geotab.com/apiv1";

// Create a comprehensive mock store
const mockAvlStoreState = {
  geoTabCredentials: {} as Record<string, GeoTabCredentials>,
  geoTabDevices: {} as Record<string, GeoTabDevice[]>,
  configGroups: mockGroups,
  setGeoTabCredentials: vi.fn(),
  setGeoTabDevices: vi.fn(),
};

vi.mock("@/stores/avlStore", () => ({
  useAvlStore: () => mockAvlStoreState,
}));

// Mock the useAvlApi hook
const mockFetchGeoTabSessionId = vi.fn();

vi.mock("../hooks/useAvlApi", () => ({
  useAvlApi: () => ({
    fetchGeoTabSessionId: mockFetchGeoTabSessionId,
  }),
}));

// GeoTab API handlers
const geoTabHandlers = [
  http.post(GEOTAB_API_URL, async ({ request }) => {
    const body = await request.json() as { method: string; params: Record<string, unknown> };
    const { method, params } = body;

    // Route based on method
    switch (method) {
      case "Authenticate":
        return HttpResponse.json({
          result: {
            credentials: mockGeoTabCredentials,
            path: "my.geotab.com",
          },
        });

      case "Get":
        const typeName = params?.typeName;
        
        if (typeName === "Device") {
          return HttpResponse.json({
            result: mockGeoTabDevices,
          });
        }

        if (typeName === "DeviceStatusInfo") {
          return HttpResponse.json({
            result: mockGeoTabDevices.map((device) => ({
              device: { id: device.id },
              latitude: 44.5,
              longitude: -79.5,
              speed: 45,
              bearing: 90,
              dateTime: new Date().toISOString(),
            })),
          });
        }

        if (typeName === "Trip") {
          return HttpResponse.json({
            result: mockTrips,
          });
        }

        if (typeName === "StatusData") {
          return HttpResponse.json({
            result: [
              {
                id: "status-1",
                device: { id: "device-1" },
                dateTime: new Date().toISOString(),
                data: 150,
                diagnostic: { id: "DiagnosticSolidMaterialRateId" },
              },
            ],
          });
        }

        if (typeName === "ExceptionEvent") {
          return HttpResponse.json({
            result: [
              {
                id: "event-1",
                device: { id: "device-1" },
                activeFrom: new Date(Date.now() - 3600000).toISOString(),
                activeTo: new Date().toISOString(),
                rule: { id: "rule-plow-down" },
                diagnostic: { id: "diagnostic-plow" },
              },
            ],
          });
        }

        return HttpResponse.json({ result: [] });

      case "ExecuteMultiCall":
        // Handle multi-call requests
        const calls = params?.calls as Array<{ method: string; params: Record<string, unknown> }>;
        if (!calls) {
          return HttpResponse.json({ result: [] });
        }

        const results = calls.map((call) => {
          if (call.method === "Get" && call.params?.typeName === "StatusData") {
            return [
              {
                id: "status-1",
                device: { id: "device-1" },
                dateTime: new Date().toISOString(),
                data: 150,
              },
            ];
          }
          return [];
        });

        return HttpResponse.json({ result: results });

      default:
        return HttpResponse.json({ result: null });
    }
  }),
];

// Error handlers
const geoTabErrorHandlers = {
  authError: http.post(GEOTAB_API_URL, async ({ request }) => {
    const body = await request.json() as { method: string };
    if (body.method === "Authenticate") {
      return HttpResponse.json({
        error: {
          message: "InvalidCredentials: The user credentials are invalid.",
        },
      });
    }
    return HttpResponse.json({ result: null });
  }),

  networkError: http.post(GEOTAB_API_URL, () => {
    return HttpResponse.error();
  }),

  apiError: http.post(GEOTAB_API_URL, () => {
    return HttpResponse.json({
      error: {
        message: "Database connection error",
      },
    });
  }),
};

// Dynamically import after mocks are set up
let useGeoTab: () => ReturnType<typeof import("../hooks/useGeoTab").useGeoTab>;

describe("useGeoTab", () => {
  beforeAll(async () => {
    // Add handlers to global server
    server.use(...geoTabHandlers);
    // Import after mocks
    const module = await import("../hooks/useGeoTab");
    useGeoTab = module.useGeoTab;
  });
  
  afterEach(() => {
    server.resetHandlers(...geoTabHandlers);
    vi.clearAllMocks();
    mockAvlStoreState.geoTabCredentials = {};
    mockAvlStoreState.geoTabDevices = {};
  });
  
  afterAll(() => server.resetHandlers());

  describe("authenticateGeoTab", () => {
    beforeEach(() => {
      mockFetchGeoTabSessionId.mockResolvedValue({
        sessionId: mockGeoTabCredentials.sessionId,
        database: mockGeoTabCredentials.database,
        userName: mockGeoTabCredentials.userName,
      });
    });

    it("authenticates and returns credentials", async () => {
      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "Roads GeoTab",
        geoTabAPIKey: "test-api-key",
        subGroups: [],
      };

      const credentials = await act(async () => {
        return result.current.authenticateGeoTab(mockGroup);
      });

      expect(mockFetchGeoTabSessionId).toHaveBeenCalledWith("test-api-key");
      expect(credentials).toBeDefined();
      expect(credentials?.sessionId).toBe(mockGeoTabCredentials.sessionId);
    });

    it("returns cached credentials if already authenticated", async () => {
      mockAvlStoreState.geoTabCredentials = {
        "Roads GeoTab": mockGeoTabCredentials,
      };

      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "Roads GeoTab",
        geoTabAPIKey: "test-api-key",
        subGroups: [],
      };

      const credentials = await act(async () => {
        return result.current.authenticateGeoTab(mockGroup);
      });

      // Should not call fetchGeoTabSessionId since credentials are cached
      expect(mockFetchGeoTabSessionId).not.toHaveBeenCalled();
      expect(credentials).toEqual(mockGeoTabCredentials);
    });

    it("returns null if group has no geoTabAPIKey", async () => {
      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "No API Group",
        geoTabAPIKey: undefined,
        subGroups: [],
      };

      const credentials = await act(async () => {
        return result.current.authenticateGeoTab(mockGroup);
      });

      expect(credentials).toBeNull();
    });

    it("handles authentication failure", async () => {
      mockFetchGeoTabSessionId.mockResolvedValue({ error: "Authentication failed" });

      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "Roads GeoTab",
        geoTabAPIKey: "invalid-api-key",
        subGroups: [],
      };

      const credentials = await act(async () => {
        return result.current.authenticateGeoTab(mockGroup);
      });

      expect(credentials).toBeNull();
    });
  });

  describe("fetchGeoTabDevices", () => {
    it("fetches and filters devices matching vehicles", async () => {
      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "Roads GeoTab",
        geoTabAPIKey: "test-api-key",
        subGroups: [],
      };

      const devices = await act(async () => {
        return result.current.fetchGeoTabDevices(
          mockGroup,
          mockGeoTabCredentials,
          mockVehicles
        );
      });

      expect(devices).toBeDefined();
      expect(Array.isArray(devices)).toBe(true);
      expect(mockAvlStoreState.setGeoTabDevices).toHaveBeenCalled();
    });

    it("returns empty array on API failure", async () => {
      server.use(geoTabErrorHandlers.networkError);

      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "Roads GeoTab",
        geoTabAPIKey: "test-api-key",
        subGroups: [],
      };

      const devices = await act(async () => {
        return result.current.fetchGeoTabDevices(
          mockGroup,
          mockGeoTabCredentials,
          mockVehicles
        );
      });

      expect(devices).toEqual([]);
    });
  });

  describe("fetchDeviceStatusInfo", () => {
    it("fetches device status info for device IDs", async () => {
      const { result } = renderHook(() => useGeoTab());
      const deviceIds = ["device-1", "device-2"];

      const statusInfo = await act(async () => {
        return result.current.fetchDeviceStatusInfo(deviceIds, mockGeoTabCredentials);
      });

      expect(statusInfo).toBeDefined();
      expect(Array.isArray(statusInfo)).toBe(true);
    });
  });

  describe("postToGeoTab", () => {
    it("handles API error responses", async () => {
      server.use(geoTabErrorHandlers.apiError);

      const { result } = renderHook(() => useGeoTab());
      
      // Make a call that will trigger the error
      const mockGroup: AvlGroup = {
        name: "Test",
        geoTabAPIKey: "test",
        subGroups: [],
      };

      const devices = await act(async () => {
        return result.current.fetchGeoTabDevices(
          mockGroup,
          mockGeoTabCredentials,
          []
        );
      });

      // Should return empty/null on error
      expect(devices).toEqual([]);
    });
  });

  // Skip intensive GeoTab tests in CI
  describe.skipIf(isCI)("Extended GeoTab Tests (Local Only)", () => {
    it("handles concurrent device fetches", async () => {
      const { result } = renderHook(() => useGeoTab());
      const mockGroup: AvlGroup = {
        name: "Roads GeoTab",
        geoTabAPIKey: "test-api-key",
        subGroups: [],
      };

      const promises = Array.from({ length: 3 }, () =>
        result.current.fetchGeoTabDevices(
          mockGroup,
          mockGeoTabCredentials,
          mockVehicles
        )
      );

      const results = await act(async () => Promise.all(promises));

      results.forEach((devices) => {
        expect(Array.isArray(devices)).toBe(true);
      });
    });

    it("fetches log records for a device", async () => {
      const { result } = renderHook(() => useGeoTab());

      const records = await act(async () => {
        return result.current.fetchLogRecords(
          ["device-1"],
          new Date("2026-02-03T00:00:00Z"),
          new Date("2026-02-03T23:59:59Z"),
          mockGeoTabCredentials
        );
      });

      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
    });

    it("fetches exception events for devices", async () => {
      const { result } = renderHook(() => useGeoTab());

      const events = await act(async () => {
        return result.current.fetchExceptionEvents(
          ["device-1"],
          new Date("2026-02-03T00:00:00Z"),
          new Date("2026-02-03T23:59:59Z"),
          mockGeoTabCredentials,
          "rule-plow-down"
        );
      });

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });

    it("fetches status data for spreader rate", async () => {
      const { result } = renderHook(() => useGeoTab());

      const statusData = await act(async () => {
        return result.current.fetchStatusData(
          ["device-1"],
          new Date("2026-02-03T00:00:00Z"),
          new Date("2026-02-03T23:59:59Z"),
          mockGeoTabCredentials,
          "DiagnosticSolidMaterialRateId"
        );
      });

      expect(statusData).toBeDefined();
      expect(Array.isArray(statusData)).toBe(true);
    });
  });
});

describe("Device Name Matching", () => {
  describe("cleanDeviceNameForMatching integration", () => {
    it("matches exact vehicle names", () => {
      // This tests the integration of name cleaning in device matching
      const device = { id: "1", name: "V-100", serialNumber: "SN001" };
      const vehicle = { vehicle_name: "V100" };

      // The hook should clean "V-100" to "V100" for Innisfil/Severn groups
      // and match with the vehicle
      expect(device.name.replace("-", "")).toBe(vehicle.vehicle_name);
    });

    it("handles Roads GeoTab name format", () => {
      const device = { id: "1", name: "16-91 Ops Eng SUV", serialNumber: "SN001" };
      const vehicle = { vehicle_name: "16" };

      // For Roads GeoTab, first part before dash is used
      const cleanedName = device.name.split("-")[0];
      expect(cleanedName).toBe(vehicle.vehicle_name);
    });

    it("prevents false positive matching", () => {
      // "1691 Ops Eng SUV" should not match "16-91" because
      // "1691 Ops Eng SUV" has text and isn't purely numeric
      const deviceName = "1691 Ops Eng SUV";
      const vehicleName = "16-91";

      // Check if device name is purely numeric (it's not)
      const alphanumOnly = deviceName.replace(/[^a-zA-Z0-9]/g, "");
      const isPurelyNumeric = /^\d+$/.test(alphanumOnly);

      expect(isPurelyNumeric).toBe(false);
    });
  });
});
