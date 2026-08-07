import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getEditorToken, getEditorTokenConfig } from "../editorToken";

describe("editorToken", () => {
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

  describe("getEditorTokenConfig", () => {
    it("returns config from environment variables", () => {
      const config = getEditorTokenConfig();
      expect(config).toEqual({
        tokenUrl: "https://gisportal.simcoe.ca/arcgis/sharing/rest/generateToken",
        username: "test-editor",
        password: "test-password",
        client: "referer",
        referer: "https://test.example.com",
        expiration: 10,
      });
    });

    it("throws when credentials are missing", () => {
      vi.stubEnv("ARCGIS_EDITOR_USERNAME", "");
      vi.stubEnv("ARCGIS_EDITOR_PASSWORD", "");
      expect(() => getEditorTokenConfig()).toThrow("ArcGIS editor credentials are not configured");
    });
  });

  describe("getEditorToken", () => {
    it("returns token and expires from ArcGIS response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "abc-123", expires: 1_000_000 }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getEditorToken();

      expect(result).toEqual({ token: "abc-123", expires: 1_000_000 });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://gisportal.simcoe.ca/arcgis/sharing/rest/generateToken",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("username=test-editor"),
        }),
      );
      const body = fetchMock.mock.calls[0][1].body as string;
      expect(body).toContain("password=test-password");
      expect(body).toContain("client=referer");
      expect(body).toContain("referer=https%3A%2F%2Ftest.example.com");
      expect(body).toContain("expiration=10");
    });

    it("throws when response is not ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      await expect(getEditorToken()).rejects.toThrow("ArcGIS token request failed: HTTP 500");
    });

    it("throws when ArcGIS returns an error object", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: { code: 400, message: "Invalid credentials" } }),
      }));
      await expect(getEditorToken()).rejects.toThrow("Invalid credentials");
    });

    it("throws when token is missing from response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
      await expect(getEditorToken()).rejects.toThrow("ArcGIS token request did not return a token");
    });
  });
});
