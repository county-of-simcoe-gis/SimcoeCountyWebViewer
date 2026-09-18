import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildESRILayer, loadLayerGroupsFromSources, type BuildESRILayerOptions } from "@/utils/tocHelpers";
import type { TOCLayer, TOCSource } from "@/stores/tocStore";
import * as authUtils from "@/utils/auth";
import * as arcgisAuth from "@/utils/arcgisAuth";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";

// Mock LayerHelpers so buildESRILayer can run without OpenLayers dependencies.
vi.mock("@/utils/openlayers/LayerHelpers", () => ({
  LayerHelpers: {
    getLayer: (_options: unknown, callback: (layer: unknown) => void) => {
      callback({
        setVisible: vi.fn(),
        setOpacity: vi.fn(),
        setProperties: vi.fn(),
        setZIndex: vi.fn(),
      });
    },
  },
}));

// Mock LayerManager so we don't need a real map.
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "managed-layer-id"),
  },
}));

function buildLayer(options: BuildESRILayerOptions): Promise<TOCLayer> {
  return new Promise((resolve) => {
    buildESRILayer(options, (layer) => resolve(layer));
  });
}

const baseGroup: BuildESRILayerOptions["group"] = {
  value: "arcgis-group",
  label: "ArcGIS Group",
  defaultGroup: false,
  url: "https://example.com/arcgis/rest/services/Test/MapServer",
  prefix: "",
  visibleLayers: [],
  wmsGroupUrl: "",
  customRestUrl: "",
  layers: [],
  secured: false,
};

const baseLayer: BuildESRILayerOptions["layer"] = {
  name: "Test Layer",
  url: "https://example.com/arcgis/rest/services/Test/MapServer/0",
  id: 0,
  options: {
    isGroupOn: "false",
    isLiveLayer: false,
    isVisible: false,
    isOpen: false,
    sar: false,
    description: "",
    refreshInterval: "",
    modalURL: "",
    categories: ["Uncategorized"],
    title: "Test Layer",
    opacity: 1,
    minScale: 0,
    maxScale: 0,
    canDownload: false,
    identifyName: "",
    displayName: "Test Layer",
    noAttributeTable: false,
    identifyTitleColumn: "",
    identifyIdColumn: "",
  },
  hasAttachments: false,
  visible: false,
  queryable: false,
  opaque: false,
  grouped: false,
};

describe("loadLayerGroupsFromSources secured source gating", () => {
  const arcgisSource: TOCSource = {
    layerUrl: "https://example.com/arcgis/rest/services/Secure/MapServer",
    secure: true,
    primary: false,
    urlType: "root",
    type: "arcgis",
  };
  const config = { toc: { keywords: {}, default_group: "" } };

  beforeEach(() => {
    useArcGISTokenStore.setState({ token: null, expiresAt: 0, renewalDate: 0, username: "", isAuthenticated: false, isLoading: false, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not skip a secured ArcGIS source when the ArcGIS token store has a valid token, even if the Azure AD token is unavailable", async () => {
    vi.spyOn(authUtils, "getAccessToken").mockResolvedValue(undefined);
    useArcGISTokenStore.setState({ token: "arcgis-token", renewalDate: Date.now() + 60 * 60 * 1000, isAuthenticated: true });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ layers: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadLayerGroupsFromSources([arcgisSource], config);

    expect(fetchMock).toHaveBeenCalled();
    expect(result.failedSources).not.toContain(arcgisSource.layerUrl);
  });

  it("skips a secured ArcGIS source when neither the Azure AD nor the ArcGIS token is available", async () => {
    vi.spyOn(authUtils, "getAccessToken").mockResolvedValue(undefined);
    vi.spyOn(arcgisAuth, "login").mockRejectedValue(new Error("not signed in"));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadLayerGroupsFromSources([arcgisSource], config);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.failedSources).toContain(arcgisSource.layerUrl);
  });
});

describe("buildESRILayer disclaimer", () => {
  it("returns undefined disclaimer when no disclaimer options are provided", async () => {
    const layer = await buildLayer({ group: baseGroup, layer: baseLayer, layerIndex: 0 });
    expect(layer.disclaimer).toBeUndefined();
  });

  it("returns a disclaimer object when disclaimerUrl is provided", async () => {
    const layerWithDisclaimer: BuildESRILayerOptions["layer"] = {
      ...baseLayer,
      options: {
        ...baseLayer.options,
        disclaimerUrl: "https://example.com/terms",
      },
    };

    const layer = await buildLayer({ group: baseGroup, layer: layerWithDisclaimer, layerIndex: 0 });
    expect(layer.disclaimer).toEqual({
      title: "",
      url: "https://example.com/terms",
      warning: "",
    });
  });

  it("returns a disclaimer object when disclaimerTitle is provided", async () => {
    const layerWithDisclaimer: BuildESRILayerOptions["layer"] = {
      ...baseLayer,
      options: {
        ...baseLayer.options,
        disclaimerTitle: "Important Terms",
      },
    };

    const layer = await buildLayer({ group: baseGroup, layer: layerWithDisclaimer, layerIndex: 0 });
    expect(layer.disclaimer).toEqual({
      title: "Important Terms",
      url: "",
      warning: "",
    });
  });

  it("returns a disclaimer object when disclaimerWarning is provided", async () => {
    const layerWithDisclaimer: BuildESRILayerOptions["layer"] = {
      ...baseLayer,
      options: {
        ...baseLayer.options,
        disclaimerWarning: "Use with caution.",
      },
    };

    const layer = await buildLayer({ group: baseGroup, layer: layerWithDisclaimer, layerIndex: 0 });
    expect(layer.disclaimer).toEqual({
      title: "",
      url: "",
      warning: "Use with caution.",
    });
  });
});
