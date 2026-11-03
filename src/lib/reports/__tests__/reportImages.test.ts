import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/database/connections", () => ({
  pgWeblive: { selectFirstWithValues: vi.fn() },
  sqlWeblive: { selectFirstWithValues: vi.fn() },
}));
vi.mock("@/lib/reports/imageGenerator", () => ({
  getLayerObject: vi.fn(),
  getMapImage: vi.fn(),
  getOrthoBasemap: vi.fn(() => ({ name: "ortho" })),
  STREETS_BASEMAP: { name: "streets" },
}));

import { pgWeblive } from "@/lib/database/connections";
import { getLayerObject, getMapImage } from "@/lib/reports/imageGenerator";
import { getLandValuesReportImageUrl, getMlsImageUrl, getPlanningReportImageUrl, parseDimension, wktToBbox } from "@/lib/reports/reportImages";

const mockSelect = vi.mocked(pgWeblive.selectFirstWithValues);
const mockLayer = vi.mocked(getLayerObject);
const mockMapImage = vi.mocked(getMapImage);

const row = {
  parcels: JSON.stringify({ type: "Polygon", coordinates: [], crs: {} }),
  buffer: JSON.stringify({ type: "Polygon", coordinates: [] }),
  bounding_geom: JSON.stringify({
    type: "Polygon",
    coordinates: [
      [
        [10, 20],
        [10, 40],
        [30, 40],
        [30, 20],
        [10, 20],
      ],
    ],
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLayer.mockResolvedValue({ type: "image" });
  mockMapImage.mockResolvedValue("https://print/download");
});

describe("wktToBbox", () => {
  it("returns min/max extent for a SQL Server polygon", () => {
    expect(wktToBbox("POLYGON ((1 2, 5 2, 5 9, 1 9, 1 2))")).toBe("1,2,5,9");
  });

  it("returns min/max extent for a PostGIS polygon", () => {
    expect(wktToBbox("POLYGON((-8.5 2.25,5 2.25,5 9,-8.5 9,-8.5 2.25))")).toBe("-8.5,2.25,5,9");
  });

  it("returns null when there are no coordinates", () => {
    expect(wktToBbox("")).toBeNull();
  });
});

describe("parseDimension", () => {
  it("uses the fallback when missing", () => expect(parseDimension(null, 300)).toBe(300));
  it("parses valid values", () => expect(parseDimension("500", 300)).toBe(500));
  it("rejects non-numeric, zero and oversized values", () => {
    expect(parseDimension("abc", 300)).toBeNull();
    expect(parseDimension("0", 300)).toBeNull();
    expect(parseDimension("99999", 300)).toBeNull();
  });
});

describe("getPlanningReportImageUrl", () => {
  const options = { fieldValue: "123", reportType: "WETLAND", bufDistance: 0, width: 300, height: 300, token: "a b" };

  it("returns null when no parcel is found", async () => {
    mockSelect.mockResolvedValue(null);
    expect(await getPlanningReportImageUrl(options)).toBeNull();
    expect(mockMapImage).not.toHaveBeenCalled();
  });

  it("pads the print bbox by 500 and leaves the layer bbox unpadded", async () => {
    mockSelect.mockResolvedValue(row);
    await getPlanningReportImageUrl(options);

    expect(mockLayer.mock.calls[0][0].bbox).toEqual([10, 20, 30, 40]);
    expect(mockLayer.mock.calls[0][0].service).toBe("SimcoeCounty/Planning_Report_Inforce");
    expect(mockLayer.mock.calls[0][0].token).toBe("a%20b");
    expect(mockMapImage.mock.calls[0][0].bbox).toEqual([-490, -480, 530, 540]);
  });

  it("adds the buffer layer only when a buffer distance is given", async () => {
    mockSelect.mockResolvedValue(row);
    await getPlanningReportImageUrl(options);
    expect(mockMapImage.mock.calls[0][1]).toHaveLength(2);

    await getPlanningReportImageUrl({ ...options, bufDistance: 100 });
    expect(mockMapImage.mock.calls[1][1]).toHaveLength(3);
  });

  it("uses the main service for MAIN report type", async () => {
    mockSelect.mockResolvedValue(row);
    await getPlanningReportImageUrl({ ...options, reportType: "main" });
    expect(mockLayer.mock.calls[0][0].service).toBe("SimcoeCounty/Planning_Report_Main");
    expect(mockLayer.mock.calls[0][0].reportType).toBe("Assessment Parcel spView");
  });
});

describe("getLandValuesReportImageUrl", () => {
  it("queries the PIN table and escapes quotes in layerDefs", async () => {
    mockSelect.mockResolvedValue(row);
    await getLandValuesReportImageUrl({ fieldValue: "1'2", reportType: "PIN", width: 10, height: 10, token: "" });

    expect(mockSelect.mock.calls[0][0]).toContain("sde.TERANET_DOPF");
    expect(mockLayer.mock.calls[0][0].layerDefs).toBe("%7B0:%22PIN%3D'1''2'%22%7D");
    expect(mockLayer.mock.calls[0][0].layers).toEqual([0, 2, 3]);
  });

  it("queries the ARN table for MAIN", async () => {
    mockSelect.mockResolvedValue(row);
    await getLandValuesReportImageUrl({ fieldValue: "123", reportType: "MAIN", width: 10, height: 10, token: "" });

    expect(mockSelect.mock.calls[0][0]).toContain("sde.TERANET_DAPF");
    expect(mockLayer.mock.calls[0][0].layers).toEqual([0, 1]);
  });
});

describe("getMlsImageUrl", () => {
  it("builds the overview URL without a database call", async () => {
    const url = await getMlsImageUrl("X1", true, 100, 80);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(url).toContain("ParcelImageOverview_Report_MLS");
    expect(url).toContain("size=100,80");
  });

  it("returns null when the MLS has no geometry", async () => {
    mockSelect.mockResolvedValue(null);
    expect(await getMlsImageUrl("X1", false, 100, 80)).toBeNull();
  });

  it("uses the envelope of the point geometry", async () => {
    mockSelect.mockResolvedValue({ wkt: "POLYGON((1 2,5 2,5 9,1 9,1 2))" });
    const url = await getMlsImageUrl("X1", false, 100, 80);
    expect(url).toContain("bbox=1,2,5,9");
    expect(url).toContain("MLSNO+%3D+%27X1%27");
  });
});
