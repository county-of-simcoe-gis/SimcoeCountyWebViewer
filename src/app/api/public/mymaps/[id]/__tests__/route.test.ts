import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/public/mymaps/[id]/route";
import { MyMapsService } from "@/lib/myMaps";
import { isHostAllowed } from "@/lib/common";
import type { MyMapsRecord } from "@/lib/myMaps";

// Mock dependencies
vi.mock("@/lib/myMaps", () => ({
  MyMapsService: {
    getMyMaps: vi.fn(),
    updateLastImported: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/common", () => ({
  isHostAllowed: vi.fn(),
}));

describe("GET /api/mymaps/[id]", () => {
  const mockGetMyMaps = vi.mocked(MyMapsService.getMyMaps);
  const mockUpdateLastImported = vi.mocked(MyMapsService.updateLastImported);
  const mockIsHostAllowed = vi.mocked(isHostAllowed);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHostAllowed.mockReturnValue(true);
    mockUpdateLastImported.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (host: string = "localhost:3000"): NextRequest => {
    return {
      headers: new Map([["host", host]]),
    } as unknown as NextRequest;
  };

  const createMockContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  const mockMyMapsRecord: MyMapsRecord = {
    id: 123,
    json: JSON.stringify({
      items: [
        {
          id: "item-1",
          label: "Test Feature",
          drawType: "Point",
          geometryType: "Point",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        },
      ],
      drawType: "Point",
      drawColor: "#e809e5",
    }),
    date_created: "2024-01-01T00:00:00Z",
  };

  describe("Host Authorization", () => {
    it("should allow requests from authorized hosts", async () => {
      mockIsHostAllowed.mockReturnValue(true);
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest("authorized-host.com");
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockMyMapsRecord);
      expect(mockIsHostAllowed).toHaveBeenCalledWith("authorized-host.com");
      expect(mockGetMyMaps).toHaveBeenCalledWith("123");
    });

    it("should reject requests from unauthorized hosts", async () => {
      mockIsHostAllowed.mockReturnValue(false);

      const request = createMockRequest("unauthorized-host.com");
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Unauthorized Domain!" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith("unauthorized-host.com");
      expect(mockGetMyMaps).not.toHaveBeenCalled();
    });

    it("should handle missing host header", async () => {
      const request = {
        headers: new Map(),
      } as unknown as NextRequest;

      mockIsHostAllowed.mockReturnValue(false);
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Unauthorized Domain!" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith(undefined);
    });

    it("should handle null host header", async () => {
      const request = {
        headers: new Map([["host", null]]),
      } as unknown as NextRequest;

      mockIsHostAllowed.mockReturnValue(false);
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Unauthorized Domain!" });
      expect(mockIsHostAllowed).toHaveBeenCalledWith(undefined);
    });
  });

  describe("ID Parameter Handling", () => {
    it("should extract ID from route parameters", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("456");

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(mockGetMyMaps).toHaveBeenCalledWith("456");
    });

    it("should handle numeric string IDs", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("789");

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(mockGetMyMaps).toHaveBeenCalledWith("789");
    });

    it("should handle alphanumeric IDs", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("abc123def");

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(mockGetMyMaps).toHaveBeenCalledWith("abc123def");
    });

    it("should handle UUID-style IDs", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("550e8400-e29b-41d4-a716-446655440000");

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(mockGetMyMaps).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("Successful Data Retrieval", () => {
    it("should return complete MyMaps record for existing ID", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockMyMapsRecord);
      expect(data.id).toBe(123);
      expect(data.json).toBe(mockMyMapsRecord.json);
      expect(data.date_created).toBe("2024-01-01T00:00:00Z");
    });

    it("should return record with empty items array", async () => {
      const emptyRecord: MyMapsRecord = {
        id: 456,
        json: JSON.stringify({
          items: [],
          drawType: "Cancel",
          drawColor: "#e809e5",
        }),
        date_created: "2024-01-02T00:00:00Z",
      };

      mockGetMyMaps.mockResolvedValue(emptyRecord);

      const request = createMockRequest();
      const context = createMockContext("456");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(emptyRecord);

      // Verify the JSON content
      const parsedJson = JSON.parse(data.json);
      expect(parsedJson.items).toEqual([]);
    });

    it("should return record with complex MyMaps data", async () => {
      const complexRecord: MyMapsRecord = {
        id: 789,
        json: JSON.stringify({
          items: [
            {
              id: "item-1",
              label: "Point Feature",
              drawType: "Point",
              geometryType: "Point",
              visible: true,
              labelVisible: true,
              featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
              style: { fill: { color: "#ff0000" } },
            },
            {
              id: "item-2",
              label: "Line Feature",
              drawType: "LineString",
              geometryType: "LineString",
              visible: false,
              labelVisible: false,
              featureGeoJSON: '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]}}',
              style: { stroke: { color: "#00ff00", width: 2 } },
            },
          ],
          drawType: "Polygon",
          drawColor: "#0000ff",
        }),
        date_created: "2024-01-03T10:30:00Z",
      };

      mockGetMyMaps.mockResolvedValue(complexRecord);

      const request = createMockRequest();
      const context = createMockContext("789");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(complexRecord);

      // Verify complex JSON structure
      const parsedJson = JSON.parse(data.json);
      expect(parsedJson.items).toHaveLength(2);
      expect(parsedJson.items[0].drawType).toBe("Point");
      expect(parsedJson.items[1].drawType).toBe("LineString");
      expect(parsedJson.drawColor).toBe("#0000ff");
    });
  });

  describe("Not Found Handling", () => {
    it("should return 404 when record is not found", async () => {
      mockGetMyMaps.mockResolvedValue(undefined);

      const request = createMockRequest();
      const context = createMockContext("999");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "ID Not Found" });
      expect(mockGetMyMaps).toHaveBeenCalledWith("999");
    });

    it("should return 404 when record is null", async () => {
      mockGetMyMaps.mockResolvedValue(null as any);

      const request = createMockRequest();
      const context = createMockContext("888");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "ID Not Found" });
    });

    it("should return 404 for non-existent alphanumeric ID", async () => {
      mockGetMyMaps.mockResolvedValue(undefined);

      const request = createMockRequest();
      const context = createMockContext("nonexistent123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "ID Not Found" });
      expect(mockGetMyMaps).toHaveBeenCalledWith("nonexistent123");
    });
  });

  describe("Error Handling", () => {
    it("should handle database query errors", async () => {
      mockGetMyMaps.mockRejectedValue(new Error("Database connection failed"));

      const request = createMockRequest();
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
      expect(mockGetMyMaps).toHaveBeenCalledWith("123");
    });

    it("should handle unexpected errors", async () => {
      mockGetMyMaps.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const request = createMockRequest();
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });

    it("should handle context parameter parsing errors", async () => {
      const faultyContext = {
        params: Promise.reject(new Error("Parameter parsing failed")),
      };

      const request = createMockRequest();

      const response = await GET(request, faultyContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("Response Format", () => {
    it("should set correct content type header", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("123");

      const response = await GET(request, context);

      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("should preserve JSON string format in response", async () => {
      const record: MyMapsRecord = {
        id: 123,
        json: '{"test":"value","number":42,"boolean":true}',
        date_created: "2024-01-01T00:00:00Z",
      };

      mockGetMyMaps.mockResolvedValue(record);

      const request = createMockRequest();
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(typeof data.json).toBe("string");
      expect(data.json).toBe('{"test":"value","number":42,"boolean":true}');

      // Verify it's valid JSON
      const parsed = JSON.parse(data.json);
      expect(parsed.test).toBe("value");
      expect(parsed.number).toBe(42);
      expect(parsed.boolean).toBe(true);
    });

    it("should handle various data types in database response", async () => {
      const record: MyMapsRecord = {
        id: 123,
        json: JSON.stringify({
          string: "text",
          number: 42,
          boolean: true,
          array: [1, 2, 3],
          object: { nested: "value" },
          null: null,
        }),
        date_created: "2024-01-01T00:00:00Z",
      };

      mockGetMyMaps.mockResolvedValue(record);

      const request = createMockRequest();
      const context = createMockContext("123");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(record);

      const parsedJson = JSON.parse(data.json);
      expect(parsedJson.string).toBe("text");
      expect(parsedJson.number).toBe(42);
      expect(parsedJson.boolean).toBe(true);
      expect(parsedJson.array).toEqual([1, 2, 3]);
      expect(parsedJson.object).toEqual({ nested: "value" });
      expect(parsedJson.null).toBeNull();
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

      const request = createMockRequest("evil-domain.com");
      const context = createMockContext("123");

      await GET(request, context);

      expect(consoleSpy).toHaveBeenCalledWith("Unauthorized Domain!", "evil-domain.com");
    });

    it("should log errors for debugging", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetMyMaps.mockRejectedValue(new Error("Test error"));

      const request = createMockRequest();
      const context = createMockContext("123");

      await GET(request, context);

      expect(consoleSpy).toHaveBeenCalledWith("Error retrieving MyMaps:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string ID parameter", async () => {
      mockGetMyMaps.mockResolvedValue(undefined);

      const request = createMockRequest();
      const context = createMockContext("");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "ID Not Found" });
      expect(mockGetMyMaps).toHaveBeenCalledWith("");
    });

    it("should handle whitespace-only ID parameter", async () => {
      mockGetMyMaps.mockResolvedValue(undefined);

      const request = createMockRequest();
      const context = createMockContext("   ");

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "ID Not Found" });
      expect(mockGetMyMaps).toHaveBeenCalledWith("   ");
    });

    it("should handle special characters in ID parameter", async () => {
      mockGetMyMaps.mockResolvedValue(mockMyMapsRecord);

      const request = createMockRequest();
      const context = createMockContext("id-with-special_chars.123");

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(mockGetMyMaps).toHaveBeenCalledWith("id-with-special_chars.123");
    });
  });
});
