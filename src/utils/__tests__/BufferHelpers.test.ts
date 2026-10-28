import { describe, it, expect, vi, beforeEach } from "vitest";
import { Polygon } from "ol/geom";
import { bufferGeometry } from "@/utils/openlayers/BufferHelpers";
import axiosInstance from "@/lib/axiosInstance";

vi.mock("@/lib/axiosInstance", () => ({
  default: { post: vi.fn() },
}));

const post = vi.mocked(axiosInstance.post);

// Web Mercator square (~10 km) used as the input geometry
const inputPolygon = () =>
  new Polygon([
    [
      [-8850000, 5400000],
      [-8840000, 5400000],
      [-8840000, 5410000],
      [-8850000, 5410000],
      [-8850000, 5400000],
    ],
  ]);

// NAD83 UTM 17N polygon returned by the server
const bufferedUtmGeoJSON = JSON.stringify({
  type: "Polygon",
  coordinates: [
    [
      [600000, 4900000],
      [600100, 4900000],
      [600100, 4900100],
      [600000, 4900100],
      [600000, 4900000],
    ],
  ],
});

describe("bufferGeometry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("passes the buffered geometry to the callback for a valid result", async () => {
    post.mockResolvedValueOnce({ data: { geojson: bufferedUtmGeoJSON } });
    const callback = vi.fn();
    const onNoResult = vi.fn();

    await bufferGeometry(inputPolygon(), 10, callback, onNoResult);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Polygon);
    expect(onNoResult).not.toHaveBeenCalled();
  });

  it("sends a negative distance to the server unchanged", async () => {
    post.mockResolvedValueOnce({ data: { geojson: bufferedUtmGeoJSON } });

    await bufferGeometry(inputPolygon(), -25, vi.fn());

    expect(post).toHaveBeenCalledWith("/public/map/geometry/buffer", expect.objectContaining({ distance: -25 }));
  });

  it("reports no result when the server returns an empty geometry", async () => {
    post.mockResolvedValueOnce({ data: { geojson: JSON.stringify({ type: "Polygon", coordinates: [] }) } });
    const callback = vi.fn();
    const onNoResult = vi.fn();

    await bufferGeometry(inputPolygon(), -100000, callback, onNoResult);

    expect(callback).not.toHaveBeenCalled();
    expect(onNoResult).toHaveBeenCalledTimes(1);
  });

  it("reports no result for a negative distance when the server fails", async () => {
    post.mockRejectedValueOnce(new Error("network down"));
    const callback = vi.fn();
    const onNoResult = vi.fn();

    await bufferGeometry(inputPolygon(), -10, callback, onNoResult);

    expect(callback).not.toHaveBeenCalled();
    expect(onNoResult).toHaveBeenCalledTimes(1);
  });

  it("falls back to client-side buffering for a positive distance when the server fails", async () => {
    post.mockRejectedValueOnce(new Error("network down"));
    const callback = vi.fn();
    const onNoResult = vi.fn();

    await bufferGeometry(inputPolygon(), 10, callback, onNoResult);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Polygon);
    expect(onNoResult).not.toHaveBeenCalled();
  });
});
