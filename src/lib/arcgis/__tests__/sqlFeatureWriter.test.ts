import { describe, it, expect, vi, beforeEach } from "vitest";
import { sqlAddFeatures, sqlDeleteFeatures, sqlUpdateFeatures, mapServiceUrlToTable } from "../sqlFeatureWriter";

const mockExecuteWithRecordsets = vi.fn();

vi.mock("@/lib/database/connections", () => ({
  sqlGeoEdit: {
    executeWithRecordsets: (...args: unknown[]) => mockExecuteWithRecordsets(...args),
  },
}));

describe("sqlFeatureWriter", () => {
  beforeEach(() => {
    mockExecuteWithRecordsets.mockReset();
  });

  describe("mapServiceUrlToTable", () => {
    it("maps the three Road Closures FeatureServer URLs to SDE tables", () => {
      expect(mapServiceUrlToTable("https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/5")).toBe("SC_ROADCLOSURES_BLOCKS");
      expect(mapServiceUrlToTable("https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/6")).toBe("SC_ROADCLOSURES_CLOSURES");
      expect(mapServiceUrlToTable("https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/7")).toBe("SC_ROADCLOSURES_DETOURS");
    });

    it("treats trailing slashes as equivalent", () => {
      expect(mapServiceUrlToTable("https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/5/")).toBe("SC_ROADCLOSURES_BLOCKS");
    });

    it("throws for unmapped URLs", () => {
      expect(() => mapServiceUrlToTable("https://maps2.simcoe.ca/arcgis/rest/services/Other/Service/FeatureServer/0")).toThrow("not mapped");
    });
  });

  describe("sqlAddFeatures", () => {
    it("returns an ArcGIS-style addResults array for each feature", async () => {
      mockExecuteWithRecordsets.mockResolvedValue([[{ Succeeded: true, ObjectId: 101, GlobalId: "{guid-1}", RowsAffected: 1 }]]);

      const result = await sqlAddFeatures(
        "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/5",
        [{ geometry: { wkt: "POINT(1 2)", srid: 3857 }, attributes: { street: "Main St" } }],
      );

      expect(result.addResults).toHaveLength(1);
      expect(result.addResults?.[0]).toEqual({ success: true, objectId: 101, globalId: "{guid-1}" });
      expect(mockExecuteWithRecordsets).toHaveBeenCalledTimes(1);

      const [, values] = mockExecuteWithRecordsets.mock.calls[0];
      const jsonParam = values.find((v: { name: string }) => v.name === "json");
      const payload = JSON.parse(jsonParam.value as string);
      expect(payload.action).toBe("add");
      expect(payload.target).toBe("SC_ROADCLOSURES_BLOCKS");
      expect(payload.geometry).toEqual({ wkt: "POINT(1 2)", srid: 3857 });
      expect(payload.attributes).toEqual({ street: "Main St" });
      expect(payload.objectId).toBeUndefined();
    });

    it("returns a failed result for a single feature without failing the whole batch", async () => {
      mockExecuteWithRecordsets.mockRejectedValue(new Error("SQL error"));

      const result = await sqlAddFeatures(
        "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/5",
        [{ geometry: { wkt: "POINT(1 2)", srid: 3857 }, attributes: { street: "Main St" } }],
      );

      expect(result.addResults?.[0]).toMatchObject({ success: false, error: { message: "SQL error" } });
    });
  });

  describe("sqlUpdateFeatures", () => {
    it("returns an ArcGIS-style updateResults array with the OBJECTID", async () => {
      mockExecuteWithRecordsets.mockResolvedValue([[{ Succeeded: true, ObjectId: 202, RowsAffected: 1 }]]);

      const result = await sqlUpdateFeatures(
        "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/6",
        [{ geometry: { wkt: "POINT(3 4)", srid: 3857 }, attributes: { OBJECTID: 202, street: "High St" } }],
      );

      expect(result.updateResults?.[0]).toEqual({ success: true, objectId: 202 });

      const [, values] = mockExecuteWithRecordsets.mock.calls[0];
      const jsonParam = values.find((v: { name: string }) => v.name === "json");
      const payload = JSON.parse(jsonParam.value as string);
      expect(payload.action).toBe("update");
      expect(payload.target).toBe("SC_ROADCLOSURES_CLOSURES");
      expect(payload.objectId).toBe(202);
    });
  });

  describe("sqlDeleteFeatures", () => {
    it("returns an ArcGIS-style deleteResults array for each OBJECTID", async () => {
      mockExecuteWithRecordsets.mockResolvedValue([[{ Succeeded: true, ObjectId: 303, RowsAffected: 1 }]]);

      const result = await sqlDeleteFeatures(
        "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/7",
        [303, 304],
      );

      expect(result.deleteResults).toHaveLength(2);
      expect(result.deleteResults?.[0]).toEqual({ success: true, objectId: 303 });
      expect(result.deleteResults?.[1]).toEqual({ success: true, objectId: 303 });

      const [, values] = mockExecuteWithRecordsets.mock.calls[0];
      const jsonParam = values.find((v: { name: string }) => v.name === "json");
      const payload = JSON.parse(jsonParam.value as string);
      expect(payload.action).toBe("delete");
      expect(payload.target).toBe("SC_ROADCLOSURES_DETOURS");
      expect(payload.objectId).toBe(303);
      expect(payload.geometry).toBeUndefined();
      expect(payload.attributes).toBeUndefined();
    });

    it("handles a comma-separated string of objectIds", async () => {
      mockExecuteWithRecordsets.mockResolvedValue([[{ Succeeded: true, ObjectId: 404, RowsAffected: 1 }]]);

      const result = await sqlDeleteFeatures(
        "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer/5",
        "404,405",
      );

      expect(result.deleteResults).toHaveLength(2);
    });
  });
});
