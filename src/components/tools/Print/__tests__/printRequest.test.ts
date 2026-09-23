import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureImageLayer } from "../printRequest";
import type { ImageLayer } from "ol/layer";
import type ImageSource from "ol/source/Image";
import type Map from "ol/Map";

const FRESH_TOKEN = "FRESH_MOCK_TOKEN_12345";
const STALE_TOKEN = "STALE_MOCK_TOKEN_67890";

// Mock the ArcGIS token store so configureImageLayer always gets a fresh token.
vi.mock("@/stores/arcgisTokenStore", () => ({
  useArcGISTokenStore: {
    getState: () => ({
      getValidToken: vi.fn().mockResolvedValue(FRESH_TOKEN),
    }),
  },
}));

vi.mock("@/utils/mapHelpers", () => ({
  getMapScale: () => 144448,
}));

vi.mock("@/utils/openlayers/LayerHelpers", () => ({
  LayerHelpers: {
    getLayerSourceType: vi.fn().mockReturnValue("ImageArcGISRest"),
  },
}));

vi.mock("@/utils/openlayers/FeatureHelpers", () => ({
  FeatureHelpers: {
    setFeatures: vi.fn(),
  },
}));

function createMockMap(overrides: Partial<Map> = {}): Map {
  return {
    getSize: vi.fn().mockReturnValue([800, 600]),
    getView: vi.fn().mockReturnValue({
      getProjection: vi.fn().mockReturnValue({ getCode: () => "EPSG:3857" }),
      getCenter: vi.fn().mockReturnValue([-8876989.7391, 5479960.34325]),
      calculateExtent: vi.fn().mockReturnValue([-8898927.177233333, 5455729.793116666, -8855052.300966667, 5504190.893383333]),
    }),
    ...overrides,
  } as unknown as Map;
}

function createMockImageLayer(props: {
  name?: string;
  secured?: boolean;
  rendered?: boolean;
  params?: Record<string, string>;
}): ImageLayer<ImageSource> {
  const { name = "Secure_PIN_Labels_Cache", secured = true, rendered = true, params = { LAYERS: "SHOW:0", TOKEN: STALE_TOKEN } } = props;

  const source = {
    getUrl: vi.fn().mockReturnValue("https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/Secure_PIN_Labels_Cache/MapServer"),
    getParams: vi.fn().mockReturnValue(params),
    image_: rendered
      ? {
          src_: `https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/Secure_PIN_Labels_Cache/MapServer/export?F=image&FORMAT=PNG32&TRANSPARENT=true&LAYERS=SHOW%3A0&TOKEN=${STALE_TOKEN}&SIZE=800%2C600&BBOX=-8898927.177233333%2C5455729.793116666%2C-8855052.300966667%2C5504190.893383333&BBOXSR=3857&IMAGESR=3857&DPI=96`,
        }
      : undefined,
  };

  const properties = { print: true, display: true, secured, isArcGIS: true, name, printIndex: 1 };
  const layer = {
    get: vi.fn((key: string) => properties[key as keyof typeof properties]),
    getProperties: vi.fn().mockReturnValue(properties),
    getSource: vi.fn().mockReturnValue(source),
    getOpacity: vi.fn().mockReturnValue(1),
    getZIndex: vi.fn().mockReturnValue(10),
    getVisible: vi.fn().mockReturnValue(true),
    setProperties: vi.fn((newProps: Record<string, unknown>) => Object.assign(properties, newProps)),
  } as unknown as ImageLayer<ImageSource>;

  return layer;
}

function createMockAttributes() {
  return {
    title: "Test Map",
    description: "Terms",
    map: {
      projection: "EPSG:3857",
      longitudeFirst: true,
      rotation: 0,
      dpi: 120,
      scale: 144448,
      center: [-8876989.7391, 5479960.34325],
    },
    scalebar: { geodetic: 144448 },
    scale: "1 : 144,448",
  };
}

describe("configureImageLayer ArcGIS token handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects the fresh ArcGIS token into a rendered secured image layer URL", async () => {
    const map = createMockMap();
    const layer = createMockImageLayer({ rendered: true });

    const result = await configureImageLayer(layer, createMockAttributes(), map);

    const url = String(result.baseURL);
    expect(url).toContain(`TOKEN=${FRESH_TOKEN}`);
    expect(url).not.toContain(STALE_TOKEN);
  });

  it("injects the fresh ArcGIS token when the layer has not rendered yet", async () => {
    const map = createMockMap();
    const layer = createMockImageLayer({ rendered: false });

    const result = await configureImageLayer(layer, createMockAttributes(), map);

    const url = String(result.baseURL);
    expect(url).toContain(`TOKEN=${FRESH_TOKEN}`);
    expect(url).not.toContain(STALE_TOKEN);
  });

  it("does not add a token for non-secured layers", async () => {
    const map = createMockMap();
    const layer = createMockImageLayer({ secured: false, rendered: true, params: { LAYERS: "SHOW:0" } });

    const result = await configureImageLayer(layer, createMockAttributes(), map);

    const url = String(result.baseURL);
    expect(url).not.toContain("TOKEN=");
  });

  it("preserves non-token source params such as LAYERS", async () => {
    const map = createMockMap();
    const layer = createMockImageLayer({ rendered: true, params: { LAYERS: "SHOW:0", TOKEN: STALE_TOKEN } });

    const result = await configureImageLayer(layer, createMockAttributes(), map);

    const url = String(result.baseURL);
    expect(url).toContain("LAYERS=SHOW%3A0");
    expect(url).toContain("F=image");
    expect(url).toContain("FORMAT=PNG32");
    expect(url).toContain("BBOXSR=3857");
    expect(url).toContain("IMAGESR=3857");
  });
});
