import { describe, it, expect } from "vitest";
import { LayerHelpers } from "@/utils/openlayers/LayerHelpers";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";

function createWMSSource(timeValue?: string) {
  let source: { getParams: () => Record<string, unknown> } | undefined;
  LayerHelpers.getLayer(
    {
      sourceType: OL_DATA_TYPES.ImageWMS,
      url: "https://example.com/geoserver/wms",
      layerName: "simcoe:roads",
      name: "simcoe:roads",
      timeValue,
    },
    (layer) => {
      source = (layer as unknown as { getSource: () => { getParams: () => Record<string, unknown> } }).getSource();
    },
  );
  return source;
}

describe("LayerHelpers.getLayer WMS TIME", () => {
  it("sets the TIME param on the ImageWMS source when a time value is provided", () => {
    const source = createWMSSource("2026-10-14T09:00:00.000Z");
    expect(source?.getParams().TIME).toBe("2026-10-14T09:00:00.000Z");
  });

  it("omits the TIME param when no time value is provided", () => {
    const source = createWMSSource();
    expect(source?.getParams()).not.toHaveProperty("TIME");
  });
});
