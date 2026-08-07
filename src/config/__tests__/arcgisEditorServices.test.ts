import { describe, it, expect, vi, afterEach } from "vitest";
import { isAllowedService, getEditorServices } from "../arcgisEditorServices";
import { ArcGisEditOperation } from "@/lib/arcgis/types";

describe("arcgisEditorServices", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const appTrackUrl = "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/Secure_Planning_AppTrack_Editing/FeatureServer/0";

  it("allows AppTrack addFeatures for planning role", () => {
    const result = isAllowedService(appTrackUrl, "addFeatures", ["planning"]);
    expect(result.allowed).toBe(true);
  });

  it("denies access when user has no roles", () => {
    const result = isAllowedService(appTrackUrl, "addFeatures", []);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("no roles");
  });

  it("denies access when service is not approved", () => {
    const result = isAllowedService("https://evil.com/FeatureServer/0", "addFeatures", ["planning"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not in the approved");
  });

  it("denies access when operation is not allowed", () => {
    const result = isAllowedService(appTrackUrl, "deleteFeatures" as ArcGisEditOperation, ["viewer"]);
    expect(result.allowed).toBe(false);
  });

  it("supports role substring matching", () => {
    const result = isAllowedService(appTrackUrl, "addFeatures", ["County_Planning"]);
    expect(result.allowed).toBe(true);
  });

  it("loads override services from environment variable", () => {
    const override = JSON.stringify([
      { name: "Custom", baseUrl: "https://custom.example.com/FeatureServer/0", operations: ["addFeatures"], roles: ["editor"] },
    ]);
    vi.stubEnv("ARCGIS_EDITOR_ALLOWED_URLS", override);

    const services = getEditorServices();
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe("Custom");

    const result = isAllowedService("https://custom.example.com/FeatureServer/0", "addFeatures", ["editor"]);
    expect(result.allowed).toBe(true);
  });
});
