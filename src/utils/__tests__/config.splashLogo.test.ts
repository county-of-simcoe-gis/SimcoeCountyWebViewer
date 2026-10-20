import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLocalConfig = vi.hoisted(() => ({
  useMapConfigApi: false,
  mapId: "",
  headerLogoImageName: "header.png",
  splashLogoImageName: "",
  toc: {
    tocType: "LIST",
    geoserverLayerGroupsUrl: "",
    geoserverLayerGroupsUrlType: "",
    esriServiceUrl: "",
    keywords: {},
    sources: [],
    default_group: "",
    helpLink: "",
    layerInfoURL: "",
  },
  sidebarToolComponents: [],
  sidebarThemeComponents: [],
}));

vi.mock("@/config.json", () => ({ default: mockLocalConfig }));

import { loadConfig } from "@/utils/config";

describe("loadConfig splash logo fallback", () => {
  beforeEach(() => {
    mockLocalConfig.splashLogoImageName = "";
  });

  it("falls back to headerLogoImageName when no splash logo is set", async () => {
    const config = await loadConfig();
    expect(config.splashLogoImageName).toBe("header.png");
    expect(config.headerLogoImageName).toBe("header.png");
  });

  it("keeps its own splashLogoImageName when one is set", async () => {
    mockLocalConfig.splashLogoImageName = "splash.png";
    const config = await loadConfig();
    expect(config.splashLogoImageName).toBe("splash.png");
    expect(config.headerLogoImageName).toBe("header.png");
  });
});
