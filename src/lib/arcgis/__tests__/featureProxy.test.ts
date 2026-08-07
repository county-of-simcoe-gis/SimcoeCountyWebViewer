import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { proxyAddFeatures, proxyUpdateFeatures, proxyDeleteFeatures, FeatureProxyError } from "../featureProxy";

describe("featureProxy", () => {
  beforeEach(() => {
    vi.stubEnv("ARCGIS_TOKEN_URL", "https://gisportal.simcoe.ca/arcgis/sharing/rest/generateToken");
    vi.stubEnv("ARCGIS_EDITOR_USERNAME", "test-editor");
    vi.stubEnv("ARCGIS_EDITOR_PASSWORD", "test-password");
    vi.stubEnv("ARCGIS_EDITOR_CLIENT", "referer");
    vi.stubEnv("ARCGIS_EDITOR_REFERER", "https://test.example.com");
    vi.stubEnv("ARCGIS_EDITOR_EXPIRATION", "10");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const baseUrl = "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/Secure_Planning_AppTrack_Editing/FeatureServer/0";

  function mockTokenFetch(token = "editor-token") {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token }),
    }));
  }

  function lastCallUrl(): string {
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    return calls[calls.length - 1][0] as string;
  }

  function lastCallBody(): string {
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    return calls[calls.length - 1][1].body as string;
  }

  describe("proxyAddFeatures", () => {
    it("posts features to addFeatures with editor token", async () => {
      mockTokenFetch();
      const features = [{ attributes: { NAME: "Test" }, geometry: { x: 1, y: 2 } }];

      await proxyAddFeatures(baseUrl, features);

      expect(lastCallUrl()).toBe(`${baseUrl}/addFeatures?f=json&token=editor-token`);
      expect(lastCallBody()).toContain("features=" + encodeURIComponent(JSON.stringify(features)));
    });

    it("throws FeatureProxyError for empty features", async () => {
      mockTokenFetch();
      await expect(proxyAddFeatures(baseUrl, [])).rejects.toBeInstanceOf(FeatureProxyError);
    });
  });

  describe("proxyUpdateFeatures", () => {
    it("posts features with OBJECTID to updateFeatures", async () => {
      mockTokenFetch();
      const features = [{ attributes: { OBJECTID: 123, NAME: "Updated" } }];

      await proxyUpdateFeatures(baseUrl, features);

      expect(lastCallUrl()).toBe(`${baseUrl}/updateFeatures?f=json&token=editor-token`);
    });

    it("throws FeatureProxyError when OBJECTID is missing", async () => {
      mockTokenFetch();
      await expect(proxyUpdateFeatures(baseUrl, [{ attributes: { NAME: "Updated" } }])).rejects.toBeInstanceOf(FeatureProxyError);
    });
  });

  describe("proxyDeleteFeatures", () => {
    it("posts array of objectIds", async () => {
      mockTokenFetch();

      await proxyDeleteFeatures(baseUrl, [1, 2, 3]);

      expect(lastCallUrl()).toBe(`${baseUrl}/deleteFeatures?f=json&token=editor-token`);
      expect(lastCallBody()).toContain("objectIds=1%2C2%2C3");
    });

    it("posts string objectIds", async () => {
      mockTokenFetch();

      await proxyDeleteFeatures(baseUrl, "1,2,3");

      expect(lastCallBody()).toContain("objectIds=1%2C2%2C3");
    });

    it("throws FeatureProxyError for invalid objectIds", async () => {
      mockTokenFetch();
      await expect(proxyDeleteFeatures(baseUrl, ["1"] as unknown as number[])).rejects.toBeInstanceOf(FeatureProxyError);
    });
  });
});
