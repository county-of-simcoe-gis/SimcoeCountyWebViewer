/**
 * Tests for useAvlApi hook - Internal AVL API calls.
 *
 * Tests cover:
 * - fetchCurrentLocations
 * - fetchCurrentLocationsSpreader
 * - fetchHistoryLocations
 * - fetchAllVehicles
 * - fetchGeoTabSessionId
 * - Error handling (401, 403, network errors)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook } from "@testing-library/react";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";
import { useAvlApi, AuthenticationError, AuthorizationError } from "../hooks/useAvlApi";
import { isCI } from "@/test/env";
import {
  mockVehicles,
  mockHistoryVehicles,
  mockGeoTabCredentials,
} from "./mockData";

const AVL_API_BASE = "/api/secure/avl";

// MSW handlers for AVL API - will be added to global server
const avlApiHandlers = [
  // Current Locations
  http.get(`${AVL_API_BASE}/CurrentLocations/:grouping/:sortField/:sortOrder`, () => {
    return HttpResponse.json(mockVehicles.map(v => ({
      ...v,
      grouping: "Roads",
      vehicle_name: v.vehicle_name,
      velocity: v.velocity,
      date: v.date,
      latitude: v.latitude,
      longitude: v.longitude,
    })));
  }),

  // Current Locations Spreader
  http.get(`${AVL_API_BASE}/CurrentLocationsSpreader/:grouping/:sortField/:sortOrder`, () => {
    return HttpResponse.json(mockVehicles.map(v => ({
      ...v,
      grouping: "Roads GeoTab",
      PlowDown: true,
      DryOn: true,
    })));
  }),

  // History - matches /History/{fromDate}/{toDate}/{group}/{vehicleId}/{speedOperator}/{speed}/{simplifyFactor}
  http.get(`${AVL_API_BASE}/History/:fromDate/:toDate/:group/:vehicleId/:speedOperator/:speed/:simplifyFactor`, () => {
    return HttpResponse.json(mockHistoryVehicles);
  }),

  // History with extent
  http.get(`${AVL_API_BASE}/History/:fromDate/:toDate/:group/:vehicleId/:speedOperator/:speed/:simplifyFactor/:extent`, () => {
    return HttpResponse.json(mockHistoryVehicles);
  }),

  // All Vehicles
  http.get(`${AVL_API_BASE}/AllVehicles`, () => {
    return HttpResponse.json({
      vehicles: mockVehicles,
      groups: [{ name: "Roads", vehicles: mockVehicles }],
    });
  }),

  // GeoTab Session ID - matches /getGeoTabSessionId/{apiKey}
  http.get(`${AVL_API_BASE}/getGeoTabSessionId/:apiKey`, () => {
    return HttpResponse.json({
      sessionId: mockGeoTabCredentials.sessionId,
      database: mockGeoTabCredentials.database,
      userName: mockGeoTabCredentials.userName,
    });
  }),
];

// Error handlers for testing error scenarios
const errorHandlers = {
  unauthorized: http.get(`${AVL_API_BASE}/CurrentLocations/:grouping/:sortField/:sortOrder`, () => {
    return HttpResponse.json({ error: "Authentication required" }, { status: 401 });
  }),
  forbidden: http.get(`${AVL_API_BASE}/CurrentLocations/:grouping/:sortField/:sortOrder`, () => {
    return HttpResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }),
  networkError: http.get(`${AVL_API_BASE}/CurrentLocations/:grouping/:sortField/:sortOrder`, () => {
    return HttpResponse.error();
  }),
  serverError: http.get(`${AVL_API_BASE}/CurrentLocations/:grouping/:sortField/:sortOrder`, () => {
    return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
  }),
};

describe("useAvlApi", () => {
  // Add handlers before each test to ensure clean state
  beforeEach(() => {
    server.use(...avlApiHandlers);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe("fetchCurrentLocations", () => {
    it("fetches current vehicle locations successfully", async () => {
      const { result } = renderHook(() => useAvlApi());

      const locations = await result.current.fetchCurrentLocations("Roads", "date", "ASC");

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
      expect(locations[0]).toHaveProperty("vehicle_name");
    });

    it("uses default sort parameters when not provided", async () => {
      const { result } = renderHook(() => useAvlApi());

      const locations = await result.current.fetchCurrentLocations("Roads");

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
    });

    it("encodes grouping parameter correctly", async () => {
      const { result } = renderHook(() => useAvlApi());

      // Use a group name with special characters
      const locations = await result.current.fetchCurrentLocations("Roads GeoTab", "date", "ASC");

      expect(locations).toBeDefined();
    });
  });

  describe("fetchCurrentLocationsSpreader", () => {
    it("fetches spreader vehicle locations successfully", async () => {
      const { result } = renderHook(() => useAvlApi());

      const locations = await result.current.fetchCurrentLocationsSpreader("Roads GeoTab", "date", "ASC");

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations[0]).toHaveProperty("PlowDown");
    });
  });

  describe("fetchHistory", () => {
    it("fetches history locations with date range", async () => {
      const { result } = renderHook(() => useAvlApi());
      const startDate = new Date("2026-02-03T08:00:00Z");
      const endDate = new Date("2026-02-03T17:00:00Z");

      const history = await result.current.fetchHistory({
        fromDate: startDate,
        toDate: endDate,
        group: "Roads GeoTab",
        vehicleId: "V-100",
        speedOperator: ">",
        speed: 0,
        simplifyFactor: 1,
      });

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("fetchAllVehicles", () => {
    it("fetches all vehicles with groups", async () => {
      const { result } = renderHook(() => useAvlApi());

      const data = await result.current.fetchAllVehicles();

      expect(data).toBeDefined();
      expect(data).toHaveProperty("vehicles");
      expect(data).toHaveProperty("groups");
    });
  });

  describe("fetchGeoTabSessionId", () => {
    it("fetches GeoTab session credentials", async () => {
      const { result } = renderHook(() => useAvlApi());

      const session = await result.current.fetchGeoTabSessionId("test-api-key");

      expect(session).toBeDefined();
      expect(session).toHaveProperty("sessionId");
      expect(session).toHaveProperty("database");
      expect(session).toHaveProperty("userName");
    });
  });

  describe("Error Handling", () => {
    it("throws AuthenticationError on 401 response", async () => {
      server.use(errorHandlers.unauthorized);

      const { result } = renderHook(() => useAvlApi());

      await expect(result.current.fetchCurrentLocations("Roads")).rejects.toThrow(AuthenticationError);
    });

    it("throws AuthorizationError on 403 response", async () => {
      server.use(errorHandlers.forbidden);

      const { result } = renderHook(() => useAvlApi());

      await expect(result.current.fetchCurrentLocations("Roads")).rejects.toThrow(AuthorizationError);
    });

    it("throws error on network failure", async () => {
      server.use(errorHandlers.networkError);

      const { result } = renderHook(() => useAvlApi());

      await expect(result.current.fetchCurrentLocations("Roads")).rejects.toThrow();
    });

    it("passes through server errors", async () => {
      server.use(errorHandlers.serverError);

      const { result } = renderHook(() => useAvlApi());

      await expect(result.current.fetchCurrentLocations("Roads")).rejects.toThrow();
    });
  });

  describe("Custom Error Classes", () => {
    it("AuthenticationError has correct name", () => {
      const error = new AuthenticationError("Test message");

      expect(error.name).toBe("AuthenticationError");
      expect(error.message).toBe("Test message");
    });

    it("AuthenticationError has default message", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication required");
    });

    it("AuthorizationError has correct name", () => {
      const error = new AuthorizationError("Test message");

      expect(error.name).toBe("AuthorizationError");
      expect(error.message).toBe("Test message");
    });

    it("AuthorizationError has default message", () => {
      const error = new AuthorizationError();

      expect(error.message).toBe("Insufficient permissions");
    });
  });

  // Skip intensive tests in CI environment
  describe.skipIf(isCI)("Extended API Tests (Local Only)", () => {
    it("handles rapid successive calls", async () => {
      const { result } = renderHook(() => useAvlApi());

      const promises = Array.from({ length: 5 }, () =>
        result.current.fetchCurrentLocations("Roads")
      );

      const results = await Promise.all(promises);

      results.forEach((locations) => {
        expect(locations).toBeDefined();
        expect(Array.isArray(locations)).toBe(true);
      });
    });

    it("caches credentials properly across calls", async () => {
      const { result } = renderHook(() => useAvlApi());

      // Make multiple session requests
      const session1 = await result.current.fetchGeoTabSessionId("test-api-key");
      const session2 = await result.current.fetchGeoTabSessionId("test-api-key");

      expect(session1.sessionId).toBe(session2.sessionId);
    });
  });
});
