import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/public/mymaps/route";
import { MyMapsService, computeJsonHash } from "@/lib/myMaps";
import { isHostAllowed } from "@/lib/common";

// Mock dependencies
vi.mock("@/lib/myMaps", () => ({
  MyMapsService: {
    insertMyMaps: vi.fn(),
    findByHash: vi.fn(),
  },
  computeJsonHash: vi.fn(() => "mock-hash-value"),
}));

vi.mock("@/lib/common", () => ({
  isHostAllowed: vi.fn(),
}));

describe("POST /api/mymaps", () => {
  const mockInsertMyMaps = vi.mocked(MyMapsService.insertMyMaps);
  const mockFindByHash = vi.mocked(MyMapsService.findByHash);
  const mockIsHostAllowed = vi.mocked(isHostAllowed);
  const mockComputeJsonHash = vi.mocked(computeJsonHash);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHostAllowed.mockReturnValue(true);
    mockInsertMyMaps.mockResolvedValue("test-uuid-123");
    mockFindByHash.mockResolvedValue(undefined);
    mockComputeJsonHash.mockReturnValue("mock-hash-value");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (body: any, host: string = "localhost:3000"): NextRequest => {
    return {
      headers: new Map([["host", host]]),
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  describe("Host Authorization", () => {
    it("should allow requests from authorized hosts", async () => {
      mockIsHostAllowed.mockReturnValue(true);

      const mockBody = {
        items: [{ id: "1", label: "Test Item" }],
        drawType: "Point",
        drawColor: "#e809e5",
      };

      const request = createMockRequest(mockBody, "authorized-host.com");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: "test-uuid-123" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith("authorized-host.com");
      expect(mockInsertMyMaps).toHaveBeenCalledWith(mockBody);
    });

    it("should reject requests from unauthorized hosts", async () => {
      mockIsHostAllowed.mockReturnValue(false);

      const request = createMockRequest({}, "unauthorized-host.com");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Unauthorized Domain!" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith("unauthorized-host.com");
      expect(mockInsertMyMaps).not.toHaveBeenCalled();
    });

    it("should handle missing host header", async () => {
      const request = {
        headers: new Map(),
        json: vi.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      mockIsHostAllowed.mockReturnValue(false);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Unauthorized Domain!" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith(undefined);
    });

    it("should handle null host header", async () => {
      const request = {
        headers: new Map([["host", null]]),
        json: vi.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      mockIsHostAllowed.mockReturnValue(false);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Unauthorized Domain!" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Request Body Processing", () => {
    it("should successfully process valid MyMaps data", async () => {
      const mockBody = {
        items: [
          {
            id: "item-1",
            label: "Test Point",
            drawType: "Point",
            geometryType: "Point",
            visible: true,
            featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
          },
        ],
        drawType: "Point",
        drawColor: "#ff0000",
      };

      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: "test-uuid-123" });
      expect(mockInsertMyMaps).toHaveBeenCalledWith(mockBody);
    });

    it("should handle empty items array", async () => {
      const mockBody = {
        items: [],
        drawType: "Cancel",
        drawColor: "#e809e5",
      };

      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: "test-uuid-123" });
      expect(mockInsertMyMaps).toHaveBeenCalledWith(mockBody);
    });

    it("should handle complex MyMaps data with multiple items", async () => {
      const mockBody = {
        items: [
          {
            id: "item-1",
            label: "Point Feature",
            drawType: "Point",
            geometryType: "Point",
            visible: true,
            featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
          },
          {
            id: "item-2",
            label: "Line Feature",
            drawType: "LineString",
            geometryType: "LineString",
            visible: false,
            featureGeoJSON: '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]}}',
          },
        ],
        drawType: "Polygon",
        drawColor: "#00ff00",
      };

      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: "test-uuid-123" });
      expect(mockInsertMyMaps).toHaveBeenCalledWith(mockBody);
    });
  });

  describe("Error Handling", () => {
    it("should handle JSON parsing errors", async () => {
      const request = {
        headers: new Map([["host", "localhost:3000"]]),
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
      expect(mockInsertMyMaps).not.toHaveBeenCalled();
    });

    it("should handle database insertion errors", async () => {
      mockInsertMyMaps.mockRejectedValue(new Error("Database connection failed"));

      const mockBody = { items: [], drawType: "Point", drawColor: "#e809e5" };
      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
      expect(mockInsertMyMaps).toHaveBeenCalledWith(mockBody);
    });

    it("should handle unexpected errors", async () => {
      mockInsertMyMaps.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const mockBody = { items: [], drawType: "Point", drawColor: "#e809e5" };
      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("Response Format", () => {
    it("should return the inserted ID in the correct format", async () => {
      const expectedId = 456;
      mockInsertMyMaps.mockResolvedValue(expectedId);

      const mockBody = { items: [], drawType: "Point", drawColor: "#e809e5" };
      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: expectedId });
      expect(typeof data.id).toBe("number");
    });

    it("should handle string ID from database", async () => {
      // Some databases might return string IDs
      mockInsertMyMaps.mockResolvedValue("789" as any);

      const mockBody = { items: [], drawType: "Point", drawColor: "#e809e5" };
      const request = createMockRequest(mockBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: "789" });
    });

    it("should set correct content type header", async () => {
      const mockBody = { items: [], drawType: "Point", drawColor: "#e809e5" };
      const request = createMockRequest(mockBody);

      const response = await POST(request);

      expect(response.headers.get("content-type")).toBe("application/json");
    });
  });

  describe("Logging and Debugging", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log unauthorized domain attempts", async () => {
      mockIsHostAllowed.mockReturnValue(false);

      const request = createMockRequest({}, "evil-domain.com");

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith("Unauthorized Domain!", "evil-domain.com");
    });

    it("should log errors for debugging", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInsertMyMaps.mockRejectedValue(new Error("Test error"));

      const mockBody = { items: [], drawType: "Point", drawColor: "#e809e5" };
      const request = createMockRequest(mockBody);

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith("Error saving MyMaps:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
